import type { Messages } from './pt-BR';

/** Typed against `pt-BR`, so a missing or misspelled key breaks the build. */
export const en: Messages = {
  'app.name': 'Load Simulator',

  // --- Toolbar -----------------------------------------------------------
  'toolbar.start': 'Start',
  'toolbar.stop': 'Stop',
  'toolbar.startTitle': 'Start simulation (Space)',
  'toolbar.stopTitle': 'Stop simulation (Space)',
  'toolbar.pause': 'Pause',
  'toolbar.play': 'Start',
  'toolbar.reset': 'Reset',
  'toolbar.resetTitle': 'Reset (R): clears metrics and queues, keeps the architecture',
  'toolbar.elapsed': 'Simulation time',
  'toolbar.presets': 'Scenarios…',
  'toolbar.presetsLabel': 'Scenario',
  'toolbar.scenario': 'Scenario…',
  'toolbar.scenarioLabel': 'Switch scenario',
  'toolbar.diagramName': 'Diagram name',
  'toolbar.unsaved': 'not exported',
  'toolbar.fit': 'Fit view',
  'toolbar.fitTitle': 'Fit view (F)',
  'toolbar.new': 'New diagram',
  'toolbar.newTitle': 'Start an empty diagram',
  'toolbar.newConfirm': 'Discard the current diagram without exporting?',
  'toolbar.import': 'Import .din',
  'toolbar.importTitle': 'Import .din (Ctrl/Cmd + O)',
  'toolbar.export': 'Export .din',
  'toolbar.exportTitle': 'Export .din (Ctrl/Cmd + S)',
  'toolbar.present': 'Present',
  'toolbar.presentTitle': 'Presentation mode (P)',
  'toolbar.exit': 'Exit',
  'toolbar.language': 'Language',
  'toolbar.more': 'More',
  'toolbar.moreTitle': 'File, language and legend',
  'toolbar.legend': 'Load legend',

  // --- Status ------------------------------------------------------------
  'status.idle': 'Idle',
  'status.normal': 'Normal',
  'status.warning': 'Warning',
  'status.critical': 'Critical',
  'legend.normal': 'below 60% utilization',
  'legend.warning': 'between 60% and 80% utilization',
  'legend.critical': 'above 80% utilization',

  // --- Component kinds ---------------------------------------------------
  'kind.client': 'Client',
  'kind.loadBalancer': 'Load Balancer',
  'kind.apiGateway': 'API Gateway',
  'kind.server': 'Server',
  'kind.cache': 'Cache',
  'kind.messageQueue': 'Queue',
  'kind.database': 'Database',
  'kind.client.blurb': 'Generates traffic. The origin of the load.',
  'kind.loadBalancer.blurb': 'Spreads load across healthy targets.',
  'kind.apiGateway.blurb': 'Single entry point with rate limiting and auth.',
  'kind.server.blurb': 'Synchronous application with a queue and a timeout.',
  'kind.cache.blurb': 'Answers hits locally, forwards only misses.',
  'kind.messageQueue.blurb': 'Decouples producer from consumer with a backlog.',
  'kind.database.blurb': 'Stateful dependency with a connection pool.',

  // --- Palette -----------------------------------------------------------
  'palette.title': 'Components',
  'palette.hint': 'Click to drop one in the centre, or drag it exactly where you want it.',

  // --- Node card ---------------------------------------------------------
  'node.rename': 'Double-click to rename',
  'node.enable': 'Enable component',
  'node.disable': 'Disable component',
  'node.duplicate': 'Duplicate',
  'node.remove': 'Remove',
  'node.bottleneck': 'Probable bottleneck',
  'node.load': 'Load',
  'node.pressure': 'Pressure',
  'node.noTargets': 'No targets connected — 100% of the traffic will be dropped.',
  'node.cacheNoTarget': 'No target: misses have nowhere to go.',
  'node.draining': 'Draining: ~{seconds} to empty',

  // --- Metric labels -----------------------------------------------------
  'metric.requests': 'Requests/s',
  'metric.incoming': 'Incoming/s',
  'metric.processed': 'Processed/s',
  'metric.sent': 'Sent/s',
  'metric.distributed': 'Distributed/s',
  'metric.accepted': 'Accepted/s',
  'metric.delivered': 'Delivered/s',
  'metric.throttled': 'Throttled/s',
  'metric.failed': 'Failures/s',
  'metric.dropped': 'Dropped/s',
  'metric.hits': 'Hits/s',
  'metric.misses': 'Misses/s',
  'metric.latency': 'Latency',
  'metric.localLatency': 'Local latency',
  'metric.accumulated': 'Accumulated',
  'metric.response': 'Response',
  'metric.queue': 'Queue',
  'metric.backlog': 'Backlog',
  'metric.connections': 'Connections',
  'metric.failureRate': 'Failure rate',

  // --- System summary ----------------------------------------------------
  'system.title': 'System',
  'system.input': 'Incoming',
  'system.success': 'Succeeded',
  'system.failures': 'Failures',
  'system.rejected': '↳ refused at the door',
  'system.buffered': 'Piling up in queues',
  'system.e2e': 'Approx. E2E latency',
  'system.bottleneck': 'Probable bottleneck',
  'system.idle': 'Start the simulation to see throughput, failures and the probable bottleneck.',

  // --- Cost --------------------------------------------------------------
  'cost.title': 'Estimated monthly cost',
  'cost.cloud': 'Cloud provider',
  'cost.total': 'Total',
  'cost.perMonth': '/month',
  'cost.empty': 'Add components to see the estimate.',
  'cost.traffic': 'Traffic',
  'cost.trafficDetail': '{gb} GB · {kb} KB per response',
  'cost.expand': 'Expand costs',
  'cost.collapse': 'Collapse costs',
  'cost.disclaimer':
    'Teaching estimate. Not an official price and not a billing guarantee.',

  // --- Details panel -----------------------------------------------------
  'details.title': 'Details',
  'details.empty':
    'Select a component to tune every property and see why it is in this state.',
  'details.why': 'Why it looks like this',
  'details.active': 'Component enabled',
  'details.activeHint':
    'A disabled component processes nothing and is excluded from load balancing.',

  // --- Explanations ------------------------------------------------------
  'explain.disabled': 'Component disabled: it processes nothing and drops whatever reaches it.',
  'explain.noTraffic': 'No traffic arriving right now.',
  'explain.load': 'Receiving {incoming} against a capacity of {capacity} — {utilization} utilization.',
  'explain.cache':
    '{hitRate} of the requests are answered here; only {misses} continue to the next component.',
  'explain.throttling':
    'The rate limit is refusing {throttled} at the edge, protecting everything behind it.',
  'explain.queueDraining': 'Backlog of {backlog} messages, draining in ~{seconds}.',
  'explain.queueGrowing':
    'Backlog of {backlog} messages and growing: consumers cannot keep up with the producer.',
  'explain.pool':
    'The pool is at {percent} — connections may become the limit before throughput does.',
  'explain.waiting': '{count} requests are waiting, adding up to {latency} of local latency.',
  'explain.failingMixed':
    'Failing {total} — {soft} from errors/timeouts and {rejected} refused at capacity.',
  'explain.failingRejected':
    'Failing {total}: current capacity cannot take the demand (refused at the door).',
  'explain.failingSoft': 'Failing {total} — overload, timeout or injected failure.',
  'explain.dropping': 'Dropping {dropped} that does not fit the current capacity.',
  'explain.healthy': 'Running comfortably within the configured capacity.',

  // --- Configuration fields ----------------------------------------------
  'field.throughput': 'Throughput',
  'field.throughputMax': 'Max throughput',
  'field.throughputPerInstance': 'Throughput / inst.',
  'field.instances': 'Instances',
  'field.baseLatency': 'Base latency',
  'field.injectedFailure': 'Injected failures',
  'field.algorithm': 'Algorithm',
  'field.rateLimit': 'Rate limit',
  'field.auth': 'Authentication',
  'field.authLatency': 'Auth latency',
  'field.queueSize': 'Queue size',
  'field.timeout': 'Timeout',
  'field.hitRate': 'Hit rate',
  'field.hitLatency': 'Hit latency',
  'field.missCost': 'Miss overhead',
  'field.delivery': 'Delivery',
  'field.ingress': 'Publishing',
  'field.maxBacklog': 'Max backlog',
  'field.publishLatency': 'Publish latency',
  'field.queryTime': 'Query time',
  'field.connections': 'Connections',
  'field.editValue': 'Click to type a value',
  'field.valueOf': '{label} (value)',
  'field.valueClick': '{label}: {value}. Click to type a value.',

  'hint.clientRps': 'Requests per second this client tries to generate.',
  'hint.capacity':
    'Approximate maximum this component handles before queueing or shedding load.',
  'hint.capacityPerInstance':
    'Approximate maximum this component handles before queueing or shedding load. This value is per instance.',
  'hint.failure':
    'Artificially injected errors (a bug, a forced outage). At 0% the system still fails on its own once load passes capacity — timeouts, full queues, throttling.',
  'hint.latency': 'Service time without saturation. Real latency climbs as load rises.',
  'hint.algorithm': 'How the load is split across healthy targets.',
  'hint.rateLimit': 'Admission ceiling. The excess is refused at the edge and never reaches what is behind it.',
  'hint.auth': 'Adds the cost of validating every request at the entrance.',
  'hint.authLatency': 'What validation adds to each accepted request.',
  'hint.instances': 'Identical replicas. Total capacity is throughput per instance × instances.',
  'hint.connections':
    'Connection pool. By Little’s law, connections ÷ query time is also a throughput ceiling.',
  'hint.queueSize': 'How many requests may wait before the component starts shedding load.',
  'hint.timeout': 'Requests that would wait longer than this are abandoned instead of answered late.',
  'hint.hitRate': 'Share of requests answered straight from the cache, without touching downstream.',
  'hint.hitLatency': 'Time to answer directly from the cache.',
  'hint.missCost': 'Time lost checking the cache before going to the origin.',
  'hint.delivery': 'Rate at which the queue hands messages to consumers.',
  'hint.ingress': 'Maximum publish rate the queue accepts.',
  'hint.backlog': 'Backlog ceiling, in messages. Past it, the queue starts dropping.',
  'hint.publishLatency': 'What the producer waits for to get its acknowledgement.',

  // --- Presets -----------------------------------------------------------
  'preset.load-balancer-basics.name': 'Load Balancer Basics',
  'preset.load-balancer-basics.description':
    'Two clients, three comfortable servers and one small database: scaling the stateless tier does not fix the stateful one.',
  'preset.single-server.name': 'Single server',
  'preset.single-server.description':
    'One client above the capacity of a single server. The bottleneck shows up immediately.',
  'preset.cache-relieves-database.name': 'Cache relieves the database',
  'preset.cache-relieves-database.description':
    'A 90% hit rate turns 1,000 req/s into 100 req/s at the database.',
  'preset.queue-absorbs-burst.name': 'Queue absorbs the burst',
  'preset.queue-absorbs-burst.description':
    'The producer fires 1,000 msg/s, the worker keeps its own pace and the backlog grows.',
  'preset.api-rate-limiting.name': 'Rate limiting protects',
  'preset.api-rate-limiting.description':
    '5,000 req/s hit the gateway; only 1,000 reach the service.',
  'preset.term.producer': 'Producer',
  'preset.term.worker': 'Worker',

  // --- Empty canvas ------------------------------------------------------
  'empty.title': 'Build your architecture',
  'empty.body':
    'Add a Client from the palette, connect the components and start the simulation to watch load propagate.',
  'empty.cta': 'Start with “{preset}”',

  // --- Shortcuts ---------------------------------------------------------
  'shortcuts.title': 'Shortcuts',
  'shortcuts.startStop': 'start / stop',
  'shortcuts.reset': 'reset',
  'shortcuts.fit': 'fit view',
  'shortcuts.present': 'presentation mode',
  'shortcuts.delete': 'remove selection',
  'shortcuts.export': 'export .din',
  'shortcuts.key.space': 'Space',
  'shortcuts.key.delete': 'Del',
  'shortcuts.disclaimer':
    'Teaching simulation. Metrics and costs are configurable approximations, not a performance or billing guarantee.',

  // --- Feedback ----------------------------------------------------------
  'toast.dismiss': 'Dismiss',
  'toast.exported': 'Diagram exported.',
  'toast.nothingToExport': 'Nothing to export yet.',
  'toast.imported': '“{name}” imported.',

  'error.connection.unknownEndpoint': 'Invalid connection: component does not exist.',
  'error.connection.selfLoop': 'A component cannot be connected to itself.',
  'error.connection.duplicate': 'These components are already connected.',
  'error.connection.clientInbound':
    'A Client is the origin of traffic and does not take inbound connections.',
  'error.connection.cycle':
    'That connection would create a cycle. Synchronous cycles are not supported in this version.',

  'error.import.invalidJson': 'Invalid .din file: not valid JSON.',
  'error.import.invalid': 'Invalid or incompatible .din file.',
  'error.import.newerVersion': 'This file was created by a newer version of the simulator.',
  'error.import.schema': 'Invalid .din file at “{path}”: {detail}.',
  'error.import.schemaNoPath': 'Invalid .din file: {detail}.',
  'error.import.unknownKind': 'Unknown component: “{kind}”.',
  'error.import.noMigration': 'No migration from version {from} to {to}.',

  'error.cycle': 'The diagram contains a cycle. Synchronous cycles are not supported in this version.',
};
