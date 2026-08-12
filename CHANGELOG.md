# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [0.1.0] — 2026-08-12

First public release.

### Added

**Simulation**

- Discrete-time fluid model at 10 ticks per second: the whole graph is evaluated
  once per tick in topological order and committed as a single frame.
- Eight components — client, button, load balancer, API gateway, server, cache,
  message queue, database — each with its own capacity, failure and latency
  behaviour.
- Status bands at 60% and 80% utilization, overload failure that grows with
  saturation, and queue backlog that drains at the consumer's pace.
- Tail latency: every flow carries a p95 alongside its mean, combined as a
  mixture percentile so a fast path never averages away a slow one.
- Explicit per-node fan-out — `broadcast` (every dependency is called) versus
  `split` (the load is divided) — instead of one hard-coded rule.
- Retry storms: clients retry failed requests using the previous tick's observed
  failure rate, so the feedback loop closes in time without a cycle in the graph.
- Cost estimation per cloud profile (generic, AWS, GCP, Azure), separating
  infrastructure from egress. During a mission the panel shows the
  infrastructure subtotal against the budget, since that is the figure graded.

**Learning**

- 16 lessons across four worlds, from a guided tour to timed on-call missions,
  with a declarative win-condition language and star tiers.
- Two hints per lesson, on request and one step at a time.
- The completion screen explains the star tiers by describing the conditions
  that were graded, so a two-star run shows exactly what the third wanted.
- Course progress can be exported to a file and merged back in on another
  machine, keeping the better result for each lesson.

**Editor**

- Canvas built on React Flow, with drag-and-drop from a component palette,
  connection rules that keep the graph acyclic, undo/redo and presentation mode.
- Full keyboard operation: Tab to focus, Enter to select, arrows to move, and
  `C` twice to connect a source to a target.
- `.din` project files (versioned, schema-validated, transactional import) and
  shareable URLs with a size guard.
- Bilingual interface, pt-BR and en, with every user-facing string in a typed
  catalog.

### Verification

- 322 unit tests, including a harness that plays every one of the 16 lessons to
  completion — a lesson whose objective cannot be reached fails the build.
- 18 end-to-end tests (Playwright) over the static export, covering the main
  flow, a full lesson, keyboard operation, the phone layout, and one regression
  test per defect fixed by hand.
- Typecheck, lint, dependency-cruiser layer fences, bundle weight and UI latency
  budgets, all enforced in CI.

[Unreleased]: https://github.com/GustQueiroz/Load-Simulator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/GustQueiroz/Load-Simulator/releases/tag/v0.1.0
