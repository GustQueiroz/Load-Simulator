# The simulation model

This document is the contract between the simulator and your intuition. It
separates **exact product rules** (deterministic, arbitrary, ours to define)
from **pedagogical approximations** (a model of reality, deliberately simple).

If a number surprises you, the answer is probably here.

---

## 1. Everything is a rate, nothing is a request

The engine is a **discrete-time fluid model**. There is no object per request.
A flow is a triple:

```ts
{ rps, latencyMs, failureRate }
```

Simulating 100.000 req/s costs exactly as much as 10 req/s. The trade-off: the
simulator can never answer "what happened to *this* request" — only "what
happens to traffic like this".

Every tick (default 100 ms) the whole graph is evaluated **once**, in
topological order, producing one complete frame of metrics.

Two units, never mixed:

| Suffix | Meaning | Example |
| --- | --- | --- |
| `*Rps` | per second | `incomingRps`, `droppedRps` |
| `*Count`, `queueDepth` | absolute items sitting somewhere | a backlog of 2.400 messages |

Converting between them is always explicit: `arrivals = incomingRps × dt`.

## 2. Exact product rules

These are decisions, not physics. They never change silently.

| Rule | Value |
| --- | --- |
| **Status bands** | `< 60%` normal · `60–80%` warning · `≥ 80%` critical |
| **Utilization** | `incomingRps / capacityRps`, never clamped — 340% is a number you should see |
| **Synchronous cycles** | rejected; the graph must be a DAG |
| **Determinism** | no `Math.random` anywhere in the engine; randomised balancing uses a seeded PRNG |
| **Tick** | 100 ms, configurable |

Utilization above 100% is meaningful and displayed. The *bar* is clamped at
100%, the *number* is not.

## 3. Capacity, queueing and loss

A component with capacity handles `min(incoming, capacity)`. What happens to
the rest depends on the kind, but the vocabulary is shared:

- **`droppedRps`** — refused at the door, never processed (shed load, rate
  limiting, a full queue, a balancer with no healthy target).
- **`failedRps`** — everything the caller experiences as an error. This
  **includes** `droppedRps`: from the client's point of view a 503 and a
  timeout are both failures. Soft failures (overload errors, injected failure
  rate) are added on top.

So `failedRps ≥ droppedRps`, and the two overlap by design. System totals
account for it:

```
completedRps = generatedRps − failedRps − bufferedRps
```

`bufferedRps` is work that grew a backlog this tick — neither completed nor
failed *yet*.

### Bounded waiting lines

Servers and databases share one implementation (`models/work-queue.ts`). Two
ceilings apply to the backlog:

1. `maxQueueSize` — an explicit admission limit;
2. `capacity × timeout` — the deepest queue that can still be served inside the
   timeout. Anything past it would be answered too late anyway, so it expires.

The tighter ceiling wins, and the overflow is attributed accordingly:
`timedOutRps` or `droppedRps`. This is why a backlog stabilises instead of
growing forever: at 1.000 req/s into a 100 req/s server with a 2 s timeout, the
queue parks at exactly 200 items.

## 4. Pedagogical approximations

Everything below is a teaching model. It is continuous, predictable and
directionally right — it is not queueing theory.

### Latency under saturation

```
multiplier = 1 + 0.35 · u² / (1 − u)      (u clamped at 0.98)
serviceLatency = baseLatency × multiplier
```

Latency starts climbing well before 100% and explodes near saturation, the way
real systems behave. Queue wait is added on top:

```
queueWait = backlogCount / capacityRps × 1000 ms
localLatency = serviceLatency + queueWait
```

Displayed latency is capped at 120 s (`>120 s`).

### Failure under overload

```
u ≤ 0.80          → 0
0.80 < u ≤ 1.00   → (u − 0.8) × 0.25        (5% at exactly 100%)
u > 1.00          → min(0.99, 0.05 + (u − 1) × 0.45)
```

**`baseFailureRate = 0` does not mean "never fails".** That knob is *injected*
failure — a bug, a forced outage. Capacity-driven failure is derived and always
present once a component is pushed past 80%.

Rates combine by survival, never by addition:

```
combined = 1 − (1 − a)(1 − b)
```

Two independent 50% sources leave 25% intact, not 0%.

### Connection pools (Little's law)

A database has a second, independent capacity ceiling:

```
connectionCapacity = maxConnections / queryTimeSeconds
effectiveCapacity  = min(throughputCapacity, connectionCapacity)
```

A small pool in front of slow queries becomes the bottleneck long before the
configured throughput does. Base (unsaturated) query time is used on purpose,
so the ceiling stays stable and explainable instead of chasing the saturation
curve.

### End-to-end latency

A second pass walks the graph backwards:

```
downstream(n) = Σ  (edgeRps / processedRps) × cost(target)
```

Weighting by `edgeRps / processedRps` means traffic resolved locally — a cache
hit — correctly contributes **zero** downstream time. A 90% hit rate makes the
database's latency count for only 10% of the path.

Asynchronous components short-circuit this: a queue reports an `ackLatencyMs`,
so the producer only ever waits for the publish acknowledgement. A growing
backlog is the consumer's problem, not the producer's.

## 5. Per-component behaviour

| Component | Model |
| --- | --- |
| **Client** | Source. Injects `rps`; its failure rate models requests that never left (DNS, connection refused). Utilization is always 0 — a source defines load, it does not carry it. |
| **Load balancer** | Accepts up to capacity, sheds the rest, distributes what survives across **enabled** targets. Round robin is "an equal share each" — no per-request alternation. Least-load reads the previous tick's utilization. With no healthy target, everything it accepted is lost. |
| **API gateway** | `accepted = min(incoming, rateLimit, capacity)`. Two utilizations: the badge shows **pressure** (`incoming / capacity`), while latency and overload errors derive from **accepted** traffic — shedding a request is far cheaper than serving it. That asymmetry is what makes rate limiting protective instead of contagious. |
| **Server** | Bounded waiting line in front of `capacity × instances`. Queues, times out or sheds. |
| **Cache** | `hits = incoming × hitRate` are resolved locally; **only misses continue downstream**. That single rule is the whole component. |
| **Message queue** | Backlog in messages. Accepts up to ingress capacity, delivers up to delivery capacity, reports a drain ETA only while it is actually draining. Pressure is `max(incoming/delivery, backlog/maxBacklog)`. |
| **Database** | Server behaviour plus the connection ceiling above. |

## 6. How traffic splits at a fork

An edge means **"calls"**. Therefore:

- **broadcast** — client, gateway, server, cache, database. Every connected
  dependency receives the whole flow. A server wired to both a cache *and* a
  database pays for both, because each request calls both.
- **split** — load balancer, message queue. The flow is shared between targets:
  balancing, and consumers competing for the same messages.

This is the most common source of "wait, why did my database get twice the
traffic?". If you meant "read through the cache", wire
`server → cache → database`, not `server → cache` plus `server → database`.

## 7. What is deliberately missing

Not bugs. Choices, each one keeping the model explainable:

- **No upstream backpressure.** An overloaded component queues, times out or
  sheds — it never asks the caller to slow down. This is what makes the "queue
  absorbs the burst" and future "retry storm" scenarios readable.
- **No synchronous cycles.** A DAG can be evaluated in one deterministic pass
  per tick. Feedback (retries, circuit breakers) will use previous-tick state
  instead.
- **No per-request distribution.** There is one average latency, so there is no
  honest p95. The UI says "approximate E2E latency" and never claims a
  percentile it cannot compute.
- **No real pricing.** Cost is an order-of-magnitude teaching model with
  illustrative numbers, presented as an estimate everywhere it appears.

## 8. Load profiles and the Button

Clients may generate a **constant** rate, a **ramp** (linear from
`rampStartRps` to `rps` over `rampDurationSeconds`, then hold), or a **spike**
(jump to `spikePeakRps` for `spikeWidthSeconds` starting at `spikeAtSeconds`).

The **Button** is still fluid: a click deposits `requestsPerClick` into a
pending count; each tick emits `min(pending, rateLimit·dt)` as
`emitted / dtSeconds`. On a 100 ms tick, one request looks like 10 req/s for
that frame — the integral over time is still one request. Cooldown rejects
extra clicks; the automator deposits continuously at `automatorRps`.
