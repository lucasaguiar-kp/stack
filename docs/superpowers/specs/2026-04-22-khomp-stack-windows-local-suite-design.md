# Khomp Stack Windows Local Suite Design

## Context

O comportamento validado durante os testes mostrou uma diferença importante entre ambientes:

- o envio multicast funciona quando o pipeline roda nativamente no host;
- o mesmo fluxo perde confiabilidade quando depende de containerizacao para atingir a rede fisica;
- o formato de envio que se mostrou compativel com os devices foi:
  - audio em `mulaw`;
  - `8000 Hz`;
  - `mono`;
  - pacotes RTP com `payload type 0`;
  - blocos de `160` bytes;
  - pacing de `20 ms`.

Com base nisso, a distribuicao alvo deixa de ser uma stack orientada a Docker e passa a ser uma instalacao local completa para Windows, empacotada como um unico `.exe`, com todos os componentes necessarios instalados e executados na mesma maquina.

## Goal

Entregar o `Khomp Stack` como um produto Windows instalado por um unico executavel, com:

- app desktop empacotado para operacao do usuario;
- `Backend`, `Ingest`, `Multicast Agent`, `Asterisk`, `MQTT` e `Postgres` rodando localmente;
- todos os componentes iniciando automaticamente e permanecendo em background;
- suporte tanto a transmissao por arquivo local quanto por radio/stream URL;
- envio multicast executado nativamente no host Windows, sem dependencia de Docker para a etapa RTP.

## Non-Goals

Este design nao cobre:

- distribuicao para Linux ou macOS;
- execucao parcial da stack em servidor remoto;
- dependencia de instalacao manual de `ffmpeg`, `Asterisk`, `MQTT` ou `Postgres` pelo cliente;
- substituicao do pipeline validado por uma implementacao custom de codec sem `ffmpeg`.

## Recommended Approach

### 1. Windows local suite

O `Khomp Stack` sera instalado como uma suite local completa em Windows. O instalador colocara todos os binarios, configuracoes iniciais e servicos do Windows, para que a maquina do cliente funcione como uma appliance de software.

### 2. Desktop app as the user surface

O usuario interage apenas com o `Khomp Stack Desktop`, um app nativo/empacotado. O app desktop nao envia multicast diretamente e nao contem logica operacional critica. Ele usa o `Khomp Stack Backend` como unica API local para operar a stack.

### 3. Native multicast agent

O `Khomp Stack Multicast Agent` roda como servico local nativo no Windows e e responsavel exclusivamente por:

- iniciar e parar streams multicast;
- usar `ffmpeg` embarcado para converter fontes em `mulaw 8000 mono`;
- enviar RTP multicast com o mesmo padrao validado em terminal;
- expor status local para o backend.

Esse isolamento e obrigatorio para evitar que a parte mais sensivel de rede fique acoplada ao backend ou dependa de virtualizacao de rede.

## Architecture

### Components

- `Khomp Stack Desktop`
  - interface do usuario;
  - exibe status da stack;
  - consome a API local do backend.
- `Khomp Stack Backend`
  - API local principal;
  - orquestra banco, MQTT, Asterisk, ingest e multicast;
  - centraliza regras de negocio.
- `Khomp Stack Ingest`
  - executa o fluxo atual de ingestao/processamento;
  - conversa com o backend local.
- `Khomp Stack Multicast Agent`
  - executa `ffmpeg -> stdout -> RTP sender`;
  - controla start/stop/status de transmissao.
- `Khomp Stack Asterisk`
  - PBX local.
- `Khomp Stack MQTT`
  - broker local.
- `Khomp Stack Postgres`
  - banco local.
- `ffmpeg`
  - binario embarcado, consumido apenas pelo `Multicast Agent`.

### Local communication

Toda a comunicacao interna ocorre por `localhost`.

Portas sugeridas:

- `Backend`: `127.0.0.1:3000`
- `Multicast Agent`: `127.0.0.1:3010`
- `MQTT`: `127.0.0.1:1883`
- `Postgres`: `127.0.0.1:5432`
- `Asterisk AMI`: `127.0.0.1:5038`
- `Asterisk SIP`: conforme necessidade da rede local

O app desktop fala apenas com o backend. O backend e o unico orquestrador da stack.

## Installation Layout

Arquivos executaveis:

- `C:\Program Files\Khomp Stack\app\`
- `C:\Program Files\Khomp Stack\backend\`
- `C:\Program Files\Khomp Stack\ingest\`
- `C:\Program Files\Khomp Stack\multicast-agent\`
- `C:\Program Files\Khomp Stack\ffmpeg\`
- `C:\Program Files\Khomp Stack\asterisk\`
- `C:\Program Files\Khomp Stack\mqtt\`
- `C:\Program Files\Khomp Stack\postgres\`

Dados, configuracoes e logs:

- `C:\ProgramData\Khomp Stack\config\`
- `C:\ProgramData\Khomp Stack\data\`
- `C:\ProgramData\Khomp Stack\logs\`

Essa separacao permite atualizacao de binarios sem sobrescrever configuracoes e dados do cliente.

## Windows Services

Servicos registrados:

- `KhompStack-Postgres`
- `KhompStack-MQTT`
- `KhompStack-Asterisk`
- `KhompStack-Backend`
- `KhompStack-Ingest`
- `KhompStack-MulticastAgent`

O `Khomp Stack Desktop` nao precisa ser um servico. Ele e apenas a superficie interativa.

### Boot order

1. `Postgres`
2. `MQTT`
3. `Asterisk`
4. `Backend`
5. `Ingest`
6. `MulticastAgent`

O `Backend` deve entrar em estado pronto apenas quando as dependencias minimas estiverem acessiveis.

## Multicast Agent Design

### API

API local sugerida:

- `POST /multicast/start`
- `POST /multicast/stop`
- `GET /multicast/status`

Exemplo de `start`:

```json
{
  "groupId": "abc",
  "sourceType": "radio_url",
  "source": "https://example.com/stream",
  "multicastAddress": "224.0.0.1",
  "port": 16384
}
```

ou

```json
{
  "groupId": "abc",
  "sourceType": "audio_file",
  "source": "C:\\ProgramData\\Khomp Stack\\data\\audio\\sample.mp3",
  "multicastAddress": "224.0.0.1",
  "port": 16384
}
```

### Streaming pipeline

O pipeline do agent deve seguir o comportamento validado fora de container:

- arquivo:
  - `ffmpeg -i <arquivo> -ar 8000 -ac 1 -f mulaw -`
  - pipe para sender RTP
- radio:
  - `ffmpeg -re -i <url> -ar 8000 -ac 1 -f mulaw -`
  - pipe para sender RTP

O sender RTP deve:

- ler `stdin` ou arquivo;
- segmentar em blocos de `160` bytes;
- montar header RTP com `payload type 0`;
- usar `timestamp += 160`;
- enviar um pacote a cada `20 ms`.

### Status model

Estados do agent:

- `idle`
- `starting`
- `streaming`
- `stopping`
- `error`

Logs do agent devem ir para `ProgramData\Khomp Stack\logs`.

## Backend Responsibilities

O backend continua sendo o ponto central da regra de negocio. Antes de chamar o `Multicast Agent`, ele deve:

- validar grupo e devices envolvidos;
- obter endereco multicast e porta;
- decidir a fonte da transmissao;
- controlar habilitacao/configuracao MQTT dos devices;
- coordenar com `Asterisk` e `Ingest` quando necessario;
- persistir status operacional.

O `Multicast Agent` nao toma decisoes de negocio. Ele apenas executa o envio.

## Ingest Responsibilities

O `Khomp Stack Ingest` continua como componente oficial da suite local e roda em background. Ele nao envia multicast diretamente. O papel dele permanece focado em ingestao/processamento local e integracao com o backend.

Essa separacao evita duplicacao de responsabilidade entre `Ingest` e `Multicast Agent`.

## Error Handling

### Installation

- Falha ao instalar um servico: instalador interrompe e informa componente faltante.
- Falha ao iniciar dependencia critica: instalador registra erro e marca stack como incompleta.

### Runtime

- Falha no `ffmpeg`: `Multicast Agent` entra em `error` e publica detalhe no backend.
- Falha ao abrir arquivo local: erro retornado ao backend sem iniciar stream.
- Falha ao abrir radio URL: erro retornado ao backend sem iniciar stream.
- Falha de envio RTP: agent encerra stream e registra log detalhado.
- Dependencia local indisponivel: backend marca servico degradado e informa a UI.

## Testing Strategy

### Unit and integration

- validar montagem de argumentos de `ffmpeg`;
- validar contrato de `start/stop/status` do `Multicast Agent`;
- validar orquestracao do backend com `Ingest`, MQTT e Asterisk;
- validar instalacao/boot order em ambiente Windows limpo.

### End-to-end

- instalar a suite em uma maquina Windows limpa;
- confirmar que a stack sobe automaticamente apos reboot;
- iniciar transmissao por arquivo local e verificar reproducao em device;
- iniciar transmissao por radio URL e verificar reproducao em device;
- parar transmissao e confirmar limpeza de estado;
- validar logs e recuperacao apos falha.

## Packaging Recommendation

O produto deve ser distribuido por um unico instalador `.exe` para Windows. O instalador:

1. copia binarios;
2. cria estrutura em `Program Files` e `ProgramData`;
3. registra servicos;
4. gera configuracao inicial;
5. cria regras de firewall necessarias;
6. inicia a stack;
7. abre o app desktop.

Tecnologia do instalador recomendada: `Inno Setup` ou equivalente com bom suporte a servicos do Windows.

## Implementation Sequence

1. Extrair e estabilizar o `Khomp Stack Multicast Agent`.
2. Fazer o `Backend` delegar multicast para o agent local.
3. Integrar `ffmpeg` embarcado ao agent.
4. Empacotar `Ingest` como servico Windows.
5. Empacotar `Backend`, `Asterisk`, `MQTT` e `Postgres` como servicos locais.
6. Construir o instalador `.exe`.

## Open Decisions Resolved

Decisoes confirmadas neste design:

- nome do produto: `Khomp Stack`;
- plataforma inicial: Windows;
- distribuicao: um unico `.exe`;
- interface: app desktop nativo/empacotado;
- todos os componentes na mesma maquina;
- tudo sobe automaticamente em background;
- audio suportado: arquivo local e radio URL;
- `Ingest` permanece como parte obrigatoria da stack local.
