# System Design Load Simulator

**Desenhe uma arquitetura. Passe carga por ela. Veja o gargalo aparecer.**

[![CI](https://github.com/GustQueiroz/Load-Simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/GustQueiroz/Load-Simulator/actions/workflows/ci.yml)
[Demo ao vivo](https://loadsimulator.vercel.app/) · [English](README.md)

![Preview do System Design Load Simulator](public/preview.png)

Simulador de System Design em nível de componente, feito para ensinar e
apresentar. Você monta o diagrama, aperta play e cada componente reage em tempo
real — throughput, utilização, latência, filas, falhas e uma conta mensal
aproximada. Mexer num slider durante a simulação mostra a consequência na hora.

Ele existe para responder visualmente, em menos de vinte segundos:

- O que acontece se o tráfego triplicar?
- Por que um load balancer ajuda — e por que três servidores **não** resolvem um banco pequeno?
- Quanto um cache de 90% realmente tira do banco?
- O que uma fila faz durante um burst, e quanto tempo leva para drenar?
- Por que rate limiting protege o serviço em vez de só empurrar o problema?

> **Simulador didático, não um load tester.** Nenhum tráfego real é gerado
> contra nada. Métricas e custos são aproximações configuráveis — nunca
> garantia de performance nem estimativa de billing.

## Rodando

```bash
npm install
npm run dev      # http://localhost:3008
```

Sem backend, sem banco, sem login — é um site estático. O projeto fica salvo em
`localStorage` e pode ser exportado como arquivo `.din` (JSON versionado).

| Script | |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes do motor e da serialização (headless, ~1s) |
| `npm run verify` | typecheck + lint + architecture + testes + build |
| `npm run build` | export estático em `out/` |
| `npm run preview` | serve o build local |
| `npm run perf` | latência do tick, peso do JS e FPS no browser |

## Componentes

| | Modela |
| --- | --- |
| **Cliente** | Origem do tráfego. Taxa constante, rampa linear ou spike pontual. |
| **Botão** | Clique dispara N requisições; automator, rate limit e cooldown opcionais. |
| **Balanceador** | Capacidade e distribuição entre destinos saudáveis: round robin, ponderado, least-load, aleatório. |
| **API Gateway** | Rate limit, custo de autenticação, rejeição na borda. |
| **Servidor** | Capacidade por instância × instâncias, fila limitada, timeout. |
| **Cache** | Hit rate — só os misses seguem downstream. |
| **Fila** | Ritmos de publicação e entrega, backlog em mensagens, ETA de drenagem. |
| **Banco de Dados** | Throughput **e** o teto do pool de conexões (lei de Little). |

Vêm seis cenários prontos, incluindo o clássico
`2 clientes → balanceador → 3 servidores → 1 banco pequeno`, que deixa os
servidores confortáveis no verde enquanto o banco fica crítico, e o
`Botão → servidor → banco` para demos com clique.

## A trilha de exercícios

Além do modo livre existe um **curso guiado: 16 exercícios em quatro mundos**,
desbloqueados em ordem. Abra em **Trilha** na barra, ou vá direto para um com
`?lesson=1.3`.

| Mundo | | |
| --- | --- | --- |
| **0 — Controles** | 2 lições | Play, pause e um slider. O diagrama já vem montado. |
| **1 — Capacidade** | 5 lições | Servidor, balanceador, cache, gateway e fila, uma ideia por vez. |
| **2 — Incidentes** | 5 lições | Missões: um briefing, tráfego travado e uma arquitetura para consertar. |
| **3 — Trade-offs** | 4 lições | Custo, folga e latência puxando um contra o outro. |

Os mundos 0–1 são *guiados*: um balão aponta o controle certo e avança sozinho
quando você faz o que ele pediu. Os mundos 2–3 são *missões*: você recebe a
situação, o objetivo e as restrições — e os sliders de tráfego estão travados,
então o único caminho é mudar a arquitetura.

Cada exercício declara um objetivo verificável ("segure o banco fora do crítico
por 3 segundos") e dá até três estrelas pela qualidade da solução — geralmente
custo ou folga, nunca velocidade.

Escrever uma lição é dado, não código: [`docs/lessons.md`](docs/lessons.md).

## Como os números funcionam

Tudo é **taxa**. Não existe um objeto por requisição, então 100.000 req/s
custam o mesmo que 10 req/s. A cada tick (100 ms) o grafo inteiro é avaliado
uma vez, em ordem topológica, produzindo um frame completo.

Algumas regras são decisão exata do produto:

| | |
| --- | --- |
| Status | `< 60%` normal · `60–80%` alerta · `≥ 80%` crítico |
| Utilização | `entrada / capacidade`, sem clamp — 340% é um número que você precisa ver |
| Determinismo | nenhum `Math.random` no motor; o mesmo diagrama roda igual duas vezes |
| Ciclos | ciclos síncronos são rejeitados, então um frame é sempre um passo determinístico |

Outras são aproximações pedagógicas deliberadas: latência subindo conforme a
saturação, falhas aparecendo acima de 80% de utilização, pool de conexões como
segundo teto de capacidade. **[`docs/simulation-model.md`](docs/simulation-model.md)
documenta cada uma delas** — inclusive o que falta de propósito, e por quê.

Uma regra que vale saber de antemão: uma aresta significa *"chama"*. Um
servidor ligado ao cache **e** ao banco chama os dois. Se a intenção era "ler
através do cache", ligue `servidor → cache → banco`.

## Arquitetura

Quatro camadas, dependências apontando para dentro. `domain` e `application`
não têm React, DOM nem timers — é por isso que a suíte inteira roda headless em
cerca de um segundo.

```
domain/          tipos, config, métricas, grafo, regras — zero dependências
application/     motor, 7 simuladores, custo, .din, presets
infrastructure/  store Zustand, localStorage, I/O de arquivo
features/        React. Única camada que conhece o React Flow.
```

Três invariantes sustentam o resto: o motor é TypeScript puro, existe um único
scheduler, e métricas nunca moram nos nós. Detalhes em
[`docs/architecture.md`](docs/architecture.md).

## Estendendo

Adicionar um tipo de componente começa com uma entrada em `NodeKind` — daí
`npm run typecheck` imprime a lista do que falta, porque todo registro é
indexado por kind. O passo a passo completo (um CDN, do arquivo vazio ao build
verde) está em [`docs/adding-a-component.md`](docs/adding-a-component.md).

Adicionar um controle é uma linha só: o card e o painel de detalhes renderizam
da mesma declaração, e um teste falha se a chave não existir na configuração.

## Idioma

A interface está em **português e inglês**. Segue o navegador na primeira
visita, lembra a escolha depois, e pode ser fixada com `?lang=pt-BR` ou
`?lang=en` — útil ao compartilhar um link de demo com um público específico.

Os nomes que você dá aos componentes são dados, não interface: trocar de idioma
nunca renomeia os nós que você criou.

## Atalhos

`Espaço` iniciar/parar · `R` reiniciar · `F` enquadrar · `P` modo apresentação ·
`Del` remover seleção · `⌘/Ctrl+S` exportar `.din` · `⌘/Ctrl+O` importar ·
`Esc` sair do foco

O modo apresentação esconde tudo que é de edição — handles, paleta, ações do nó
— e deixa o diagrama, as métricas e uma barra de apresentador.

## Roadmap

Ainda não implementado, e organizado para caber sem reescrever o motor:
retry storm, autoscaling com delay e cooldown, circuit breaker, health checks,
read replicas, sharding, partições de stream, CDN, export PNG e snapshots A/B.

Recém-chegados: timeline de carga (rampa/spike), Botão clicável, event log e
URL compartilhável (`#d=…` / `?preset=`).

Contribuições são bem-vindas — comece por [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE).
