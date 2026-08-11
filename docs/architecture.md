# Architecture

Four layers, dependencies always pointing inward. The value of this split is
concrete, not academic: the entire simulation runs — and is tested — without a
browser, a DOM or a React tree.

```
┌─────────────────────────────────────────────────────────────┐
│ features/  components/         React. Knows React Flow.     │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ infrastructure/     Zustand store · localStorage · file I/O  │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ application/    engine · simulators · cost · .din · presets  │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│ domain/     types · config · metrics · graph · rules         │
│             zero dependencies                                │
└─────────────────────────────────────────────────────────────┘
```

| Layer | May import | Must never contain |
| --- | --- | --- |
| `domain` | nothing | React, React Flow, DOM, user-facing copy |
| `application` | `domain` | React, DOM, timers, the store, user-facing copy |
| `infrastructure` | `domain`, `application` | React Flow |
| `i18n` | `domain`, `application` | simulation arithmetic |
| `features` | everything | simulation arithmetic |

Layer fences are enforced by ESLint (`no-restricted-imports`) and
`dependency-cruiser` (`npm run architecture`). Importing React into
`application/` fails CI — it is not a code-review courtesy.

User-facing sentences live only in `src/i18n`. Lower layers return **codes**
(`'cycle'`, `'newer-version'`) and structured data, never translated text —
which is also why `explainNode`, a copy generator, sits in `features` rather
than next to the engine that feeds it.

Node labels are the exception that proves the rule: they are *data*, typed by
the user and persisted in `.din`, so the presentation layer hands the domain an
already-translated prefix (`nextLabelFor(nodes, kind, prefix)`) instead of
letting it look one up.

## One tick, end to end

```
scheduler (single setInterval, owned by useSimulationEngine)
   │
   ├─ read nodes/edges from the store, project to SimulationNode/Edge
   │     (drops position, selection — the engine has no idea about layout)
   │
   ├─ engine.tick()
   │     ├─ resolve graph (topology cached, node objects rebound each tick)
   │     ├─ for each node in topological order:
   │     │     aggregate inbound flows → simulate → route outputs to edges
   │     ├─ second pass, backwards: response latency
   │     └─ system metrics + probable bottleneck
   │
   └─ commitFrame()  ← exactly one store write per tick
```

### Why the graph cache rebinds nodes

Topology is cached by a structural key (ids, kinds, edge endpoints). A slider
change does not alter that key — but it *does* replace the node object. The
cached graph therefore rebinds the current node array on every tick
(`rebindNodes`). Without it, the engine would keep simulating the configuration
that existed when the topology last changed, and dragging a slider mid-run
would do nothing.

### Why metrics live outside the nodes

React Flow re-renders a node whenever its `data` changes. If metrics lived in
`node.data`, every tick would rebuild every node object and re-render every
slider ten times a second.

Instead `node.data` holds `{ kind, config }` only, and the frame lands in a
separate map. Each card subscribes to its own slice:

```tsx
const metrics = useNodeMetrics(id);   // re-renders this readout only
```

The configuration controls above it keep their identity and never flicker
while being dragged.

### Why exactly one scheduler

`useSimulationEngine` is mounted once by the shell and owns the only
`setInterval`. Twenty nodes with twenty timers would produce twenty
inconsistent partial frames per second — the classic way this kind of app
becomes impossible to reason about.

## Extension points

Each of these is designed so that adding one thing touches one place:

| To add… | Do this |
| --- | --- |
| A component type | Start at `NodeKind`; the compiler lists the rest. See [adding-a-component.md](adding-a-component.md). |
| A configuration knob | One entry in `features/diagram/nodes/field-specs.ts`. Card and details panel both render from it; a test asserts the key exists on the config. |
| A connection rule | One function in `domain/simulation/connection-rules.ts`, one entry in the array. |
| A load-balancing algorithm | One entry in `STRATEGIES` in the load balancer simulator. |
| A cloud cost profile | One object in `application/cost/profiles.ts`. |
| A preset scenario | One entry in `application/presets/presets.ts`. |
| A model rule | `application/simulation/models/` — latency, failure, work queue. |

## Serialization

`.din` is versioned JSON, validated with Zod, and holds the **scenario** — not
the run. Metrics, backlogs and timers are never persisted, so importing always
starts from zero. Import is transactional: the current project is replaced only
after the whole document parses, migrates and validates. Migration
infrastructure is wired from version 1 so a file saved today keeps opening.

## Testing strategy

`tests/simulation/scenarios.test.ts` matters most. It encodes the *lessons*
("three servers behind a balancer do not melt", "a 90% cache turns 1.000 req/s
into 100"), so a refactor that quietly changes the story fails the build.
Component tests cover the arithmetic; serialization tests round-trip every
preset.
