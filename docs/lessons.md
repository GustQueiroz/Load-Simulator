# Authoring a lesson

The curriculum is data. A lesson is a diagram plus a machine-checkable
statement of what the learner has to make happen — no imperative code, no
component of its own.

Sixteen lessons live in `src/application/lessons/worlds/`, grouped in four
worlds. This is the guide to adding the seventeenth.

```
src/application/lessons/
├── types.ts          the shape of a lesson and the win-condition language
├── predicates.ts     evaluation, including the elapsed-time bookkeeping
├── catalog.ts        assembly, unlocking, grading
├── locks.ts          which fields a lesson freezes
├── build-helpers.ts  lessonNode / lessonEdge / row slots
└── worlds/           the content
```

## Anatomy

```ts
export const WORLD_1_LESSONS: LessonDefinition[] = [
  {
    id: '1.6',
    worldId: '1',
    order: 6,
    minutes: 5,
    mode: 'guided',              // 'guided' shows balloons; 'mission' shows a brief
    build: (v) => ({ … }),       // the starting diagram
    win: { … },                  // what must become true
    balloons: [ … ],             // guided steps, empty for missions
    locks: { … },                // fields the learner may not touch
    stars: { two: …, three: … }, // optional extra tiers
    focusNodeId: 'server-1',     // selected on open
    autoStart: false,
  },
];
```

Register the id in `LESSON_IDS` and in the world's `lessonIds`. Lessons unlock
strictly in `LESSON_IDS` order, so position decides the path.

## The diagram

```ts
build: (v) => ({
  nodes: [
    lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 400 }),
    lessonNode('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, { capacityRps: 200 }),
  ],
  edges: [lessonEdge('client-1', 'server-1')],
}),
```

`v` is the vocabulary: node labels are **data** — persisted in `.din` and
renameable — so the presentation layer hands them over already translated.

**Rows.** Author against the `ROWS` slots and ignore pixel heights.
`stackRows` compacts them centrally, giving each row the height its tallest
card needs *while the simulation is running* — a card grows about 40% when the
metric block appears, and a layout measured on the stopped card collides the
moment the learner presses play. A test asserts no shipped diagram overlaps;
if you add a metric row to a component, update `RUNNING_NODE_HEIGHT` in
`domain/diagram/layout.ts` and the test will tell you whether the rows still
fit.

**Node ids** follow `<prefix>-<n>` (`server-1`, `db-1`, `lb-1`, …). Conditions
reference them, and resolution is deliberately strict:

1. exact id match wins;
2. if the id is gone, the *only* node of that kind is used — which keeps a
   lesson working after the learner deletes and re-adds a component;
3. if several nodes share the kind, the condition is simply **unmet**. Guessing
   "the first server" out of three would congratulate the learner for the wrong
   reason.

A test checks that every id referenced by a lesson exists in the diagram that
lesson builds, so a typo fails the build instead of producing a goal that can
never be reached.

## Win conditions

A `WinCondition` is a tree. Leaves ask about the world; `and`, `or` and
`sustained` compose them.

| Condition | Asks |
| --- | --- |
| `always` | nothing — useful for a lesson that is pure exploration |
| `flag` | `started`, `paused`, `sawQueueDepth` |
| `run-status` | the simulation is running / paused / stopped |
| `elapsed`, `tick` | simulated time |
| `bottleneck`, `has-bottleneck` | which component the summary blames |
| `node-status` | a component's badge is normal / warning / critical |
| `node-utilization` | a component's load, `1` being 100% |
| `node-metric` | any field of `NodeMetrics` (`queueDepth`, `failedRps`, …) |
| `config-number` | any numeric field the learner can set |
| `system-metric` | any field of `SystemMetrics` |
| `failure-ratio`, `completion-ratio` | failures / successes over generated traffic |
| `monthly-cost` | the monthly **infrastructure** bill (see below) |
| `has-kind` | an enabled component of a kind exists |
| `no-status` | *no* component is in a given state |
| `sustained` | an inner condition held for N seconds |

### What `monthly-cost` measures

Components only — the egress line is excluded, so it is **not** the total shown
in the cost panel.

A mission locks its traffic sources: the learner cannot change how many requests
arrive, so the bill for serving them is a constant, not a lever. At 500 rps the
egress line alone is around \$1,100/month, which would swamp every budget and
make it unreachable no matter how well the architecture is sized. Budget against
what the learner can actually trade: the size and number of the components.

```ts
win: {
  type: 'and',
  conditions: [
    { type: 'has-kind', kind: 'cache' },
    { type: 'sustained', seconds: 3,
      condition: { type: 'node-status', nodeId: 'db-1', status: 'normal' } },
  ],
},
```

### Rules for `sustained`

Read these before writing one — they are the only non-obvious part of the
language.

- **Each `sustained` keeps its own timer**, keyed by the condition itself. Two
  (or ten) in the same tree hold independently.
- **The timer resets** the moment its inner condition stops being true.
- **`and` and `or` do not short-circuit.** They evaluate every child on every
  tick, precisely so a timer that is already running keeps running.
- **Star tiers accumulate too.** `win`, `stars.two` and `stars.three` are
  evaluated together against one tracker every tick, so `sustained` means the
  same thing in a star tier as it does in the win condition.
- Only the least advanced timer is surfaced in the balloon's progress bar,
  since that is what actually gates the win.

## Stars

```ts
stars: {
  three: { type: 'monthly-cost', op: 'lte', value: 150 },
  two: { type: 'monthly-cost', op: 'lte', value: 220 },
},
```

Graded at the moment of victory: three if the `three` tier holds, otherwise two
if `two` holds, otherwise one. Stars are for the *quality* of the solution —
cost, headroom, latency — not for finishing.

## Locks

```ts
locks: {
  trafficSources: true,               // freeze every client / button knob
  nodes: { 'db-1': ['capacityRps'] }, // freeze specific fields
  kinds: { server: '*' },             // freeze a whole kind
},
```

Locking the traffic sources is what turns an exercise into a real constraint:
the learner has to fix the architecture instead of turning the load down. Every
mission in worlds 2 and 3 does it.

## Balloons (guided mode)

```ts
balloons: [
  {
    id: 'press-start',
    titleKey: 'lesson.1.6.balloon.start.title',
    bodyKey: 'lesson.1.6.balloon.start.body',
    anchor: { type: 'toolbar', target: 'start' },
    advanceWhen: { type: 'flag', flag: 'started' },
  },
],
```

Anchors: `{ type: 'toolbar', target: 'start' }`, `{ type: 'panel', target:
'system' }`, `{ type: 'node', nodeId }`, `{ type: 'field', nodeId, field }`.
Without `advanceWhen` the learner advances manually.

Missions (worlds 2–3) carry no balloons; they open with a brief built from
`lesson.<id>.brief.situation`, `.objective` and `.constraints`.

## Strings

Every lesson needs, in **both** `src/i18n/messages/pt-BR.ts` and `en.ts`:

```
lesson.1.6.title
lesson.1.6.goal
lesson.1.6.balloon.<id>.title      (guided)
lesson.1.6.balloon.<id>.body       (guided)
lesson.1.6.brief.situation         (mission)
lesson.1.6.brief.objective         (mission)
lesson.1.6.brief.constraints       (mission)
```

`tests/ui/i18n.test.ts` fails if any of them is missing, empty, or has
placeholders that differ between the two languages.

## Before opening the PR

```bash
npm run verify
```

The suite already checks, for every lesson: that it builds a non-empty
diagram, that its cards do not overlap while running, that it references only
nodes it creates, that it unlocks in order, and that its strings exist in both
languages.

What the suite cannot check is whether the lesson is *winnable* and whether it
teaches the thing it claims. Play it end to end, and try to cheat: if the goal
can be reached by dragging the traffic slider down, lock the sources.
