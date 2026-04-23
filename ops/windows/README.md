# Khomp Stack Windows Packaging

Este diretório fecha o empacotamento Windows da suite local do `Khomp Stack`.
O fluxo está dividido em duas fases:

1. gerar os binários e payloads do produto;
2. montar um diretório de staging em `dist/windows/bundle` e compilar o instalador com Inno Setup.

O instalador copia esse staging para `C:\Program Files\Khomp Stack`, cria `C:\ProgramData\Khomp Stack`, executa `bootstrap-config.ps1`, registra os serviços WinSW e, opcionalmente, abre o `Khomp Stack Desktop`.

## Current Packaged Scope

Nesta rodada, o instalador Windows cobre automaticamente:

- `KhompStack-Backend`
- `KhompStack-Ingest`
- `KhompStack-MulticastAgent`

`Asterisk`, `MQTT` e `Postgres` continuam fazendo parte do alvo da suite local completa, mas ainda nao entram como servicos registrados por este fluxo versionado. Se eles forem incluidos no bundle, o instalador apenas copia os payloads para `{app}`.

## Expected Bundle Layout

O script `ops/windows/installer/khomp-stack.iss` assume um bundle pronto em `dist/windows/bundle` com esta estrutura:

```text
dist/windows/bundle/
  app/
    Khomp Stack Desktop.exe
    ...
  backend/
    server.exe
    ...
  ingest/
    ingest.exe
    ...
  multicast-agent/
    multicast-agent.exe
    ...
  ffmpeg/
    ffmpeg.exe
  vendor/
    winsw/
      WinSW-x64.exe
  ops/
    windows/
      scripts/
        bootstrap-config.ps1
        install-services.ps1
        uninstall-services.ps1
      winsw/
        backend.xml
        ingest.xml
        multicast-agent.xml
  asterisk/          (optional today)
  mqtt/              (optional today)
  postgres/          (optional today)
```

Os diretórios `asterisk`, `mqtt` e `postgres` podem ser incluídos no bundle desde já, mas nesta fase eles são apenas payload opcional transportado para a árvore instalada.

## Build Flow

### 1. Compile the Bun services

Os três serviços próprios precisam virar executáveis Windows antes do staging:

```powershell
bun run --cwd apps/server compile
bun run --cwd apps/ingest build
bun run --cwd apps/multicast-agent build
```

Importante: esses comandos precisam rodar em um host Windows ou em uma cadeia de build que realmente gere artefatos Windows. Executá-los diretamente em macOS/Linux gera binários da máquina de build, não `server.exe`, `ingest.exe` e `multicast-agent.exe` prontos para o bundle Windows.

Copie os artefatos gerados para:

- `dist/windows/bundle/backend/server.exe`
- `dist/windows/bundle/ingest/ingest.exe`
- `dist/windows/bundle/multicast-agent/multicast-agent.exe`

### 2. Prepare the desktop payload

Hoje o workspace `apps/native` gera o shell Electron e os assets do renderer, mas não gera sozinho um `.exe` Windows portátil. Então o staging do desktop precisa vir de um passo de empacotamento do Electron fora do `.iss`.

Fluxo mínimo:

```powershell
bun run --cwd apps/web build:desktop
bun run --cwd apps/native build
```

Depois, empacote esses arquivos com o runtime do Electron e coloque o resultado portátil em:

- `dist/windows/bundle/app/Khomp Stack Desktop.exe`
- `dist/windows/bundle/app/resources/...`

O instalador assume esse payload pronto. Ele não transforma `apps/native/dist` em `.exe`.
O preflight do `.iss` agora exige pelo menos `Khomp Stack Desktop.exe` e o diretório `app/resources/` para evitar um bundle que instala mas falha na primeira abertura.

Enquanto esse empacotamento final do Electron não estiver versionado no repo, o `.iss` vai falhar cedo se `Khomp Stack Desktop.exe` não estiver presente no bundle.

### 3. Copy the Windows ops payload

Copie estes arquivos do repositório para o bundle, preservando a estrutura:

- `ops/windows/scripts/bootstrap-config.ps1`
- `ops/windows/scripts/install-services.ps1`
- `ops/windows/scripts/uninstall-services.ps1`
- `ops/windows/winsw/backend.xml`
- `ops/windows/winsw/ingest.xml`
- `ops/windows/winsw/multicast-agent.xml`

Também é obrigatório incluir:

- `dist/windows/bundle/app/resources/...`
- `dist/windows/bundle/vendor/winsw/WinSW-x64.exe`
- `dist/windows/bundle/ffmpeg/ffmpeg.exe`
- `dist/windows/bundle/app/Khomp Stack Desktop.exe`
- `dist/windows/bundle/backend/server.exe`
- `dist/windows/bundle/ingest/ingest.exe`
- `dist/windows/bundle/multicast-agent/multicast-agent.exe`

O `install-services.ps1` procura exatamente esse layout em `{app}` depois da instalação.

### 4. Compile the installer

Com o bundle pronto, rode o Inno Setup Compiler:

```powershell
ISCC /DAppVersion=0.1.0 ops\windows\installer\khomp-stack.iss
```

Se o bundle estiver em outro lugar:

```powershell
ISCC /DAppVersion=0.1.0 /DBundleRoot=C:\path\to\bundle ops\windows\installer\khomp-stack.iss
```

O instalador resultante sai em:

```text
dist/windows/installer/
```

O `.iss` faz um preflight em compile/install time e falha cedo se qualquer um dos artefatos obrigatórios acima estiver ausente.

## Install-Time Behavior

Durante a instalação, o `.iss`:

1. copia os arquivos para `C:\Program Files\Khomp Stack`;
2. cria os diretórios base em `C:\ProgramData\Khomp Stack`;
3. executa `install-services.ps1`;
4. o script chama `bootstrap-config.ps1`, gera `config\service-runtime.env` e registra os serviços via WinSW;
5. opcionalmente abre o `Khomp Stack Desktop`.

Na desinstalação, o `.iss` chama `uninstall-services.ps1` antes de remover os arquivos.

## Validation Checklist

Depois de instalar em um host Windows limpo, valide:

- `Get-Service KhompStack-*` mostra `Backend`, `Ingest` e `MulticastAgent`
- `C:\ProgramData\Khomp Stack\config\service-runtime.env` foi criado
- `C:\ProgramData\Khomp Stack\logs\backend`, `ingest` e `multicast-agent` existem
- `Khomp Stack Desktop.exe` abre e consegue atingir o backend local
- o backend responde em `http://127.0.0.1:3000`
- o multicast-agent responde em `http://127.0.0.1:3010/health`

## Current Limitations

- Este repositório ainda não empacota automaticamente o runtime final do Electron; o payload do desktop precisa ser montado antes do `.iss`, e isso significa que o escopo atual ainda nao entrega sozinho o `Khomp Stack Desktop.exe` final.
- O instalador já copia `asterisk`, `mqtt` e `postgres` se eles estiverem no bundle, mas esta rodada ainda nao registra esses tres componentes como servicos Windows. O alvo da suite completa continua o mesmo, mas o artefato atual cobre apenas backend, ingest e multicast-agent.
- Regras de firewall ainda não são provisionadas automaticamente por esses scripts; essa parte continua pendente para a próxima rodada do instalador.
- O `ISCC` não está disponível neste ambiente macOS, então a validação aqui é estática: revisão do script, conferência de paths e consistência com os scripts PowerShell e o layout atual do repo.
