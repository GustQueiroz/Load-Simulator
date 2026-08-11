/**
 * The canonical message catalogue. `en.ts` is typed against this object, so a
 * key added here fails the build until it is translated there too.
 *
 * Placeholders use `{name}` and are filled by the `t()` returned from `useT`.
 */
export const ptBR = {
  'app.name': 'Load Simulator',

  // --- Toolbar -----------------------------------------------------------
  'toolbar.start': 'Iniciar',
  'toolbar.stop': 'Parar',
  'toolbar.startTitle': 'Iniciar simulação (Espaço)',
  'toolbar.stopTitle': 'Parar simulação (Espaço)',
  'toolbar.pause': 'Pausar',
  'toolbar.play': 'Iniciar',
  'toolbar.reset': 'Reiniciar',
  'toolbar.resetTitle': 'Reiniciar (R): zera métricas e filas, mantém a arquitetura',
  'toolbar.elapsed': 'Tempo de simulação',
  'toolbar.presets': 'Cenários…',
  'toolbar.presetsLabel': 'Cenário',
  'toolbar.scenario': 'Cenário…',
  'toolbar.scenarioLabel': 'Trocar cenário',
  'toolbar.diagramName': 'Nome do diagrama',
  'toolbar.unsaved': 'não exportado',
  'toolbar.fit': 'Enquadrar',
  'toolbar.fitTitle': 'Enquadrar (F)',
  'toolbar.new': 'Novo diagrama',
  'toolbar.newTitle': 'Começar um diagrama vazio',
  'toolbar.newConfirm': 'Descartar o diagrama atual sem exportar?',
  'toolbar.import': 'Importar .din',
  'toolbar.importTitle': 'Importar .din (Ctrl/Cmd + O)',
  'toolbar.export': 'Exportar .din',
  'toolbar.exportTitle': 'Exportar .din (Ctrl/Cmd + S)',
  'toolbar.present': 'Apresentar',
  'toolbar.presentTitle': 'Modo apresentação (P)',
  'toolbar.exit': 'Sair',
  'toolbar.language': 'Idioma',
  'toolbar.more': 'Mais',
  'toolbar.moreTitle': 'Arquivo, idioma e legenda',
  'toolbar.legend': 'Legenda de carga',

  // --- Status ------------------------------------------------------------
  'status.idle': 'Ocioso',
  'status.normal': 'Normal',
  'status.warning': 'Alerta',
  'status.critical': 'Crítico',
  'legend.normal': 'abaixo de 60% de utilização',
  'legend.warning': 'entre 60% e 80% de utilização',
  'legend.critical': 'acima de 80% de utilização',

  // --- Component kinds ---------------------------------------------------
  'kind.client': 'Cliente',
  'kind.loadBalancer': 'Balanceador',
  'kind.apiGateway': 'API Gateway',
  'kind.server': 'Servidor',
  'kind.cache': 'Cache',
  'kind.messageQueue': 'Fila',
  'kind.database': 'Banco de Dados',
  'kind.client.blurb': 'Gera tráfego. É a origem da carga.',
  'kind.loadBalancer.blurb': 'Distribui a carga entre destinos saudáveis.',
  'kind.apiGateway.blurb': 'Entrada única com rate limit e autenticação.',
  'kind.server.blurb': 'Aplicação síncrona com fila e timeout.',
  'kind.cache.blurb': 'Resolve os hits e só propaga os misses.',
  'kind.messageQueue.blurb': 'Desacopla produtor e consumidor com backlog.',
  'kind.database.blurb': 'Dependência stateful com pool de conexões.',

  // --- Palette -----------------------------------------------------------
  'palette.title': 'Componentes',
  'palette.hint': 'Clique para adicionar no centro ou arraste até o ponto exato.',

  // --- Node card ---------------------------------------------------------
  'node.rename': 'Duplo clique para renomear',
  'node.enable': 'Ativar componente',
  'node.disable': 'Desativar componente',
  'node.duplicate': 'Duplicar',
  'node.remove': 'Remover',
  'node.bottleneck': 'Gargalo provável',
  'node.load': 'Carga',
  'node.pressure': 'Pressão',
  'node.noTargets': 'Sem destinos conectados — 100% do tráfego será descartado.',
  'node.cacheNoTarget': 'Sem destino: os misses não têm para onde ir.',
  'node.draining': 'Drenando: ~{seconds} para esvaziar',

  // --- Metric labels -----------------------------------------------------
  'metric.requests': 'Requisições/s',
  'metric.incoming': 'Recebidas/s',
  'metric.processed': 'Processadas/s',
  'metric.sent': 'Enviadas/s',
  'metric.distributed': 'Distribuídas/s',
  'metric.accepted': 'Aceitas/s',
  'metric.delivered': 'Entregues/s',
  'metric.throttled': 'Throttled/s',
  'metric.failed': 'Falhas/s',
  'metric.dropped': 'Descartadas/s',
  'metric.hits': 'Hits/s',
  'metric.misses': 'Misses/s',
  'metric.latency': 'Latência',
  'metric.localLatency': 'Latência local',
  'metric.accumulated': 'Acumulada',
  'metric.response': 'Resposta',
  'metric.queue': 'Fila',
  'metric.backlog': 'Backlog',
  'metric.connections': 'Conexões',
  'metric.failureRate': 'Taxa efetiva',

  // --- System summary ----------------------------------------------------
  'system.title': 'Sistema',
  'system.input': 'Entrada',
  'system.success': 'Sucesso',
  'system.failures': 'Falhas',
  'system.rejected': '↳ rejeitadas na porta',
  'system.buffered': 'Acumulando em fila',
  'system.e2e': 'Latência E2E aprox.',
  'system.bottleneck': 'Gargalo provável',
  'system.idle': 'Inicie a simulação para ver throughput, falhas e o gargalo provável.',

  // --- Cost --------------------------------------------------------------
  'cost.title': 'Custo mensal estimado',
  'cost.cloud': 'Provedor de nuvem',
  'cost.total': 'Total',
  'cost.perMonth': '/mês',
  'cost.empty': 'Adicione componentes para ver a estimativa.',
  'cost.traffic': 'Tráfego',
  'cost.trafficDetail': '{gb} GB · {kb} KB por resposta',
  'cost.expand': 'Expandir custos',
  'cost.collapse': 'Recolher custos',
  'cost.disclaimer':
    'Estimativa didática. Não representa preço oficial nem garantia de billing.',

  // --- Details panel -----------------------------------------------------
  'details.title': 'Detalhes',
  'details.empty':
    'Selecione um componente para ajustar todas as propriedades e ver por que ele está nesse estado.',
  'details.why': 'Por que está assim',
  'details.active': 'Componente ativo',
  'details.activeHint':
    'Um componente desativado não processa nada e é excluído da distribuição do balanceador.',

  // --- Explanations ------------------------------------------------------
  'explain.disabled': 'Componente desativado: não processa nada e descarta o que chega até ele.',
  'explain.noTraffic': 'Nenhum tráfego chegando por enquanto.',
  'explain.load':
    'Recebendo {incoming} contra uma capacidade de {capacity} — utilização de {utilization}.',
  'explain.cache':
    '{hitRate} das requisições são resolvidas aqui; apenas {misses} seguem para o próximo componente.',
  'explain.throttling':
    'O rate limit está rejeitando {throttled} na borda, protegendo o que está atrás.',
  'explain.queueDraining': 'Backlog de {backlog} mensagens, drenando em ~{seconds}.',
  'explain.queueGrowing':
    'Backlog de {backlog} mensagens e crescendo: os consumidores não acompanham a produção.',
  'explain.pool':
    'O pool está em {percent} — as conexões podem virar o limite antes do throughput.',
  'explain.waiting':
    'Há {count} requisições esperando, somando {latency} de latência local.',
  'explain.failingMixed':
    'Falhando {total} — {soft} por erro/timeout e {rejected} rejeitadas na capacidade.',
  'explain.failingRejected':
    'Falhando {total}: a capacidade atual não comporta a demanda (rejeição na porta).',
  'explain.failingSoft': 'Falhando {total} — sobrecarga, timeout ou falha injetada.',
  'explain.dropping': 'Descartando {dropped} por não caber na capacidade atual.',
  'explain.healthy': 'Operando confortavelmente dentro da capacidade configurada.',

  // --- Configuration fields ----------------------------------------------
  'field.throughput': 'Throughput',
  'field.throughputMax': 'Throughput máximo',
  'field.throughputPerInstance': 'Throughput / inst.',
  'field.instances': 'Instâncias',
  'field.baseLatency': 'Latência base',
  'field.injectedFailure': 'Falhas injetadas',
  'field.algorithm': 'Algoritmo',
  'field.rateLimit': 'Rate limit',
  'field.auth': 'Autenticação',
  'field.authLatency': 'Latência de auth',
  'field.queueSize': 'Tamanho da fila',
  'field.timeout': 'Timeout',
  'field.hitRate': 'Hit rate',
  'field.hitLatency': 'Latência de hit',
  'field.missCost': 'Custo do miss',
  'field.delivery': 'Entrega',
  'field.ingress': 'Publicação',
  'field.maxBacklog': 'Backlog máximo',
  'field.publishLatency': 'Latência de publish',
  'field.queryTime': 'Tempo de query',
  'field.connections': 'Conexões',
  'field.editValue': 'Clique para digitar',
  'field.valueOf': '{label} (valor)',
  'field.valueClick': '{label}: {value}. Clique para digitar.',

  'hint.clientRps': 'Requisições por segundo que este cliente tenta gerar.',
  'hint.capacity':
    'Capacidade máxima aproximada deste componente antes de acumular fila ou descartar carga.',
  'hint.capacityPerInstance':
    'Capacidade máxima aproximada deste componente antes de acumular fila ou descartar carga. Este valor é por instância.',
  'hint.failure':
    'Erro artificial injetado (bug, indisponibilidade forçada). Em 0%, o sistema ainda falha sozinho quando a carga passa da capacidade — timeout, fila cheia, throttle.',
  'hint.latency': 'Tempo de serviço sem saturação. A latência real cresce conforme a carga sobe.',
  'hint.algorithm': 'Como a carga é dividida entre os destinos saudáveis.',
  'hint.rateLimit': 'Teto de admissão. O excedente é rejeitado na borda e não chega ao que está atrás.',
  'hint.auth': 'Adiciona o custo de validar cada requisição na entrada.',
  'hint.authLatency': 'Quanto a validação acrescenta em cada requisição aceita.',
  'hint.instances': 'Réplicas idênticas. A capacidade total é o throughput por instância × instâncias.',
  'hint.connections':
    'Pool de conexões. Pela lei de Little, conexões ÷ tempo de query também limita o throughput.',
  'hint.queueSize': 'Quantas requisições podem esperar antes do componente começar a descartar carga.',
  'hint.timeout': 'Requisições que esperariam mais que isso são abandonadas em vez de respondidas tarde.',
  'hint.hitRate':
    'Percentual das solicitações atendidas diretamente pelo cache, sem acessar o destino downstream.',
  'hint.hitLatency': 'Tempo para responder direto do cache.',
  'hint.missCost': 'Tempo perdido consultando o cache antes de ir ao destino.',
  'hint.delivery': 'Ritmo com que a fila entrega mensagens aos consumidores.',
  'hint.ingress': 'Ritmo máximo de publicação aceito pela fila.',
  'hint.backlog': 'Teto do backlog, em mensagens. Acima disso a fila passa a descartar.',
  'hint.publishLatency': 'O que o produtor espera para receber o ack.',

  // --- Presets -----------------------------------------------------------
  'preset.load-balancer-basics.name': 'Load Balancer Basics',
  'preset.load-balancer-basics.description':
    'Dois clientes, três servidores confortáveis e um banco pequeno: escalar o stateless não resolve o stateful.',
  'preset.single-server.name': 'Servidor único',
  'preset.single-server.description':
    'Um cliente acima da capacidade de um único servidor. O gargalo aparece na hora.',
  'preset.cache-relieves-database.name': 'Cache alivia o banco',
  'preset.cache-relieves-database.description':
    '90% de hit rate transforma 1.000 req/s em 100 req/s no banco.',
  'preset.queue-absorbs-burst.name': 'Fila absorve o burst',
  'preset.queue-absorbs-burst.description':
    'O produtor dispara 1.000 msg/s, o worker segue no seu ritmo e o backlog cresce.',
  'preset.api-rate-limiting.name': 'Rate limiting protege',
  'preset.api-rate-limiting.description': '5.000 req/s batem no gateway; só 1.000 chegam ao serviço.',
  'preset.term.producer': 'Produtor',
  'preset.term.worker': 'Worker',

  // --- Empty canvas ------------------------------------------------------
  'empty.title': 'Monte sua arquitetura',
  'empty.body':
    'Adicione um Cliente pela paleta, conecte os componentes e inicie a simulação para ver a carga se propagar.',
  'empty.cta': 'Começar com “{preset}”',

  // --- Shortcuts ---------------------------------------------------------
  'shortcuts.title': 'Atalhos',
  'shortcuts.startStop': 'iniciar / parar',
  'shortcuts.reset': 'reiniciar',
  'shortcuts.fit': 'enquadrar',
  'shortcuts.present': 'modo apresentação',
  'shortcuts.delete': 'remover seleção',
  'shortcuts.export': 'exportar .din',
  'shortcuts.key.space': 'Espaço',
  'shortcuts.key.delete': 'Del',
  'shortcuts.disclaimer':
    'Simulação didática. Métricas e custos são aproximações configuráveis e não representam garantia de performance ou billing real.',

  // --- Feedback ----------------------------------------------------------
  'toast.dismiss': 'Fechar aviso',
  'toast.exported': 'Diagrama exportado.',
  'toast.nothingToExport': 'Não há nada para exportar ainda.',
  'toast.imported': '“{name}” importado.',

  'error.connection.unknownEndpoint': 'Conexão inválida: componente inexistente.',
  'error.connection.selfLoop': 'Não é possível conectar um componente a ele mesmo.',
  'error.connection.duplicate': 'Esses componentes já estão conectados.',
  'error.connection.clientInbound':
    'Um Cliente é a origem do tráfego e não recebe conexões de entrada.',
  'error.connection.cycle':
    'Essa conexão criaria um ciclo. Ciclos síncronos não são suportados nesta versão.',

  'error.import.invalidJson': 'Arquivo .din inválido: não é um JSON válido.',
  'error.import.invalid': 'Arquivo .din inválido ou incompatível.',
  'error.import.newerVersion': 'O arquivo foi criado em uma versão mais nova do simulador.',
  'error.import.schema': 'Arquivo .din inválido em “{path}”: {detail}.',
  'error.import.schemaNoPath': 'Arquivo .din inválido: {detail}.',
  'error.import.unknownKind': 'Componente desconhecido: “{kind}”.',
  'error.import.noMigration': 'Não há migração da versão {from} para {to}.',

  'error.cycle': 'O diagrama contém um ciclo. Ciclos síncronos não são suportados nesta versão.',
} as const;

export type MessageKey = keyof typeof ptBR;
export type Messages = Record<MessageKey, string>;
