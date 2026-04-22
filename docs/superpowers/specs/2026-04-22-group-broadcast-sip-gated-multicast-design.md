# Group Broadcast SIP-Gated Multicast Design

## Context

Hoje o fluxo de multicast do grupo funciona de forma isolada:

- o backend envia por MQTT a configuracao de multicast para os devices do grupo;
- o backend sobe um processo `ffmpeg` que transmite RTP para o endereco multicast do grupo;
- nao existe chamada SIP aberta no Asterisk como parte desse fluxo.

Os testes no ambiente local confirmaram esse comportamento:

- o grupo `70000` possui rota SIP de grupo via `Page(...)`;
- o multicast atual envia apenas `rtp_1_address` e `rtp_1_enabled` por MQTT;
- durante a transmissao multicast nao ha canais SIP ativos no Asterisk.

Para o caso de uso da radio, os devices precisam primeiro entrar em uma chamada SIP de grupo. So depois dessa chamada estabelecida o audio deve ser entregue. A transmissao deve ser unidirecional: os devices apenas recebem o audio da radio e nao retornam voz para a sessao. Quando a transmissao terminar, a chamada SIP tambem deve ser encerrada automaticamente.

## Goal

Adicionar um fluxo de broadcast por grupo que:

1. origine uma chamada SIP de grupo;
2. mantenha essa chamada viva em um contexto dedicado do Asterisk;
3. habilite o multicast apenas depois da chamada estar pronta;
4. transmita a radio ou arquivo para o endereco multicast do grupo;
5. encerre multicast e chamada SIP como uma unica sessao.

## Recommended Approach

Implementar um fluxo hibrido em duas etapas:

1. chamada SIP do grupo via Asterisk AMI;
2. multicast atual como canal de audio, habilitado apenas apos a chamada SIP.

Essa abordagem reaproveita o investimento atual em `ffmpeg`, enderecos multicast por grupo e configuracao MQTT dos devices, mas adiciona o requisito operacional que os devices precisam para aceitar a reproducao.

## Architecture

### 1. Broadcast Session Manager

Criar um gerenciador de sessao de broadcast por grupo no backend, paralelo ao gerenciador de stream multicast atual. Esse gerenciador sera responsavel por:

- iniciar e parar a chamada SIP da sessao;
- coordenar a ordem das etapas da sessao;
- manter o estado em memoria por `groupId`;
- expor status de sessao para a UI e logs.

Cada sessao deve guardar pelo menos:

- `groupId`;
- `groupExtension`;
- `multicastAddress`;
- `callChannel` ou identificador equivalente do canal SIP originado;
- `startedAt`;
- `state` com etapas como `dialing`, `arming_multicast`, `streaming`, `stopping`.

### 2. Dialplan dedicado de broadcast

Adicionar um contexto dedicado no dialplan para broadcast do grupo. Em vez de reutilizar diretamente a extensao normal do grupo, o backend vai originar uma chamada para um contexto de broadcast que:

- chama os devices do grupo usando a mesma base de destinos SIP;
- atende a sessao de origem;
- mantem a chamada viva enquanto o broadcast estiver ativo;
- evita depender de interacao manual do operador.

O contexto pode continuar usando `Page(...)` para tocar os devices, desde que a origem da chamada fique ancorada em um ponto controlado pelo backend. A prioridade e obter um canal SIP estavel antes de habilitar o multicast.

### 3. Originate via AMI

Reaproveitar a infraestrutura AMI existente no modulo de provisionamento para adicionar uma capacidade de `Originate`. O backend deve:

- abrir conexao AMI com as credenciais ja usadas no projeto;
- disparar `Originate` para o contexto de broadcast do grupo;
- capturar sucesso ou falha do originate;
- registrar qual canal foi criado para permitir encerramento posterior.

Se o originate falhar, a sessao deve abortar sem enviar MQTT e sem iniciar `ffmpeg`.

### 4. Gate de estabilizacao SIP

Depois do originate bem-sucedido, o backend deve aguardar uma curta janela de estabilizacao antes de armar o multicast. Essa janela existe para dar tempo de os devices entrarem no estado em que aceitam o audio da radio.

Regras iniciais:

- usar atraso fixo curto como primeiro passo de implementacao;
- manter esse atraso centralizado em constante configuravel;
- se o projeto depois precisar de confirmacao real de canal atendido, a sessao deve permitir evolucao para esse modelo sem refatoracao estrutural.

### 5. Multicast atual como segunda etapa

Depois da estabilizacao SIP:

- enviar MQTT aos devices participantes com `rtp_1_address` e `rtp_1_enabled`;
- iniciar o `ffmpeg` para a fonte configurada;
- marcar a sessao como `streaming`.

O multicast continua sendo unidirecional. Nao ha captura de audio dos devices nem ponte reversa de voz.

### 6. Encerramento unificado

Ao parar a transmissao, ou em falha intermediaria:

1. desabilitar multicast nos devices;
2. parar o `ffmpeg`;
3. derrubar o canal SIP originado pelo broadcast;
4. limpar o estado da sessao.

Se uma etapa de parada falhar, o backend deve continuar tentando as demais e registrar o erro.

## Data Flow

### Start

1. Usuario solicita inicio do broadcast do grupo.
2. Backend valida grupo, config e participantes.
3. Backend origina chamada SIP de broadcast via AMI.
4. Backend aguarda a janela de estabilizacao.
5. Backend envia MQTT para habilitar multicast nos devices participantes.
6. Backend inicia `ffmpeg` com a fonte configurada.
7. Backend publica status de sessao ativa.

### Stop

1. Usuario solicita parada ou o stream termina.
2. Backend desabilita multicast nos devices.
3. Backend encerra o processo `ffmpeg`.
4. Backend encerra a chamada SIP via AMI.
5. Backend publica status de sessao encerrada.

## Error Handling

- Sem configuracao multicast: rejeitar inicio antes de qualquer tentativa de chamada SIP.
- Falha no originate SIP: nao iniciar multicast.
- Falha no MQTT apos chamada SIP aberta: encerrar a chamada SIP e marcar inicio como falho.
- Falha ao iniciar `ffmpeg`: desabilitar multicast, encerrar SIP e limpar sessao.
- Encerramento parcial: tentar todas as etapas de cleanup e registrar erros sem abandonar a limpeza.
- Nova tentativa com sessao ativa: impedir inicio duplicado por grupo.

## UI and Product Behavior

A UI atual de multicast do grupo pode continuar sendo o ponto de entrada, mas o texto e o estado devem refletir que agora a acao representa um broadcast SIP-gated, nao apenas um stream multicast.

A interface deve comunicar:

- que a chamada SIP do grupo esta sendo iniciada;
- quando o audio multicast foi efetivamente armado;
- quando a transmissao e a chamada foram encerradas.

## Testing Strategy

### Unit and integration coverage

- teste do gerenciador de sessao garantindo a ordem `originate -> wait -> mqtt -> stream`;
- teste de rollback quando `originate` falha;
- teste de rollback quando MQTT falha;
- teste de rollback quando `ffmpeg` falha;
- teste de parada garantindo a ordem `mqtt off -> stop stream -> hangup -> cleanup`;
- teste de protecao contra sessao duplicada por grupo.

### Manual validation

1. Confirmar que iniciar o broadcast cria canal SIP no Asterisk.
2. Confirmar que o multicast so e habilitado depois da criacao da chamada.
3. Confirmar que os devices recebem audio da radio sem retorno de voz.
4. Confirmar que parar o broadcast remove o canal SIP e desabilita o multicast.

## Scope Boundaries

Esta mudanca nao inclui:

- conferencia bidirecional entre devices;
- captura de audio dos devices para a sessao;
- substituicao completa do multicast por ponte de audio interna do Asterisk;
- deteccao avancada de answered-state alem da janela inicial de estabilizacao.

## Open Decisions Resolved In This Spec

- Broadcast da radio e unidirecional.
- O fim da transmissao encerra tambem a chamada SIP.
- O primeiro passo de implementacao sera hibrido: SIP para armar os devices, multicast para carregar o audio.
