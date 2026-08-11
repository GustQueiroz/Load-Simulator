# Contributing

Thanks for wanting to help. This project has an unusual goal, and it shapes
almost every decision: **it must make a System Design trade-off obvious within
seconds, live, in front of an audience.** Realism is welcome only when it
serves that goal.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3008
npm run verify   # typecheck + lint + architecture + tests + build
npm run perf     # tick/commit budgets + bundle weight + browser FPS (needs build)
```

No backend, no database, no accounts. Everything runs in the browser.

## The three rules that hold the codebase together

1. **The engine is pure TypeScript.** No React, no DOM, no timers, no store
   inside `src/domain` or `src/application`. That is why the whole test suite
   runs headless in under a second — keep it that way.
2. **There is exactly one scheduler.** One `setInterval`, one tick, one frame,
   one commit to the store. A component must never create a timer.
3. **Metrics do not live on nodes.** React Flow holds `{ kind, config }`; the
   numbers live in `frame.nodeMetrics` and each card subscribes to its own. A
   tick must not re-render the sliders.

If a change requires breaking one of these, open an issue first — it probably
has a design answer that does not.

These rules are **mechanized**, not honor-system only:

- ESLint `no-restricted-imports` fences each layer (`npm run lint`)
- `dependency-cruiser` validates the same graph (`npm run architecture`)
- CI fails if either screams

## Where things go

| Layer | Path | May depend on |
| --- | --- | --- |
| Domain | `src/domain` | nothing |
| Application | `src/application` | domain |
| Infrastructure | `src/infrastructure` | domain, application |
| Presentation | `src/features`, `src/components` | everything |

React Flow is only allowed in `src/features`. User-facing copy is only allowed
in `src/i18n` — the lower layers return **codes**, not sentences.

## Performance budgets

Pedagogy dies if the canvas stutters in front of a class. Budgets live in
`tests/perf/budgets.ts` and are checked in CI:

| Check | Command | What it guards |
| --- | --- | --- |
| Tick / commit latency | `npm test` (`tests/perf`) | engine + store stay ≪ 100ms tick |
| Static JS weight | `npm run perf:weight` (after build) | shipped JS stays under 8 MiB |
| UI FPS / lag / heap | `npm run perf:ui` (after build) | running sim stays ≥ 45 FPS |

## Adding a component type

Start at `NodeKind` in `src/domain/simulation/node-kind.ts` and let the
compiler walk you through the rest. Full walkthrough:
[`docs/adding-a-component.md`](docs/adding-a-component.md).

## Changing the simulation model

The rules live in `src/application/simulation/models/` (latency, failure, work
queue). Two things are required for a model change:

- **a test**, in `tests/simulation/` — scenario tests are more valuable than
  unit tests here, because they encode the lesson, not the arithmetic;
- **an update to [`docs/simulation-model.md`](docs/simulation-model.md)**,
  which documents what is an exact product rule and what is a pedagogical
  approximation.

Deliberate simplifications carry a comment explaining why. Please do not
"fix" them silently — the lack of upstream backpressure, the rejection of
synchronous cycles and the fluid (non-per-request) model are all choices.

## Strings

Every user-facing string lives in `src/i18n/messages/pt-BR.ts` and
`src/i18n/messages/en.ts`. TypeScript fails the build if a key is missing from
either file, so add both.

## Pull requests

Run `npm run verify` before pushing. CI also runs architecture fences and,
after the build, bundle-weight + browser FPS budgets (`npm run perf`).
Small and focused beats large and complete — a PR that adds one component
with its test and its docs entry is easier to merge than one that adds five.
