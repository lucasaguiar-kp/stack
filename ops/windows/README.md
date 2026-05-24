# Khomp Stack Windows Packaging

Este diretorio fecha o empacotamento Windows da suite local do Khomp Stack.
O objetivo do instalador e entregar um unico `.exe` que instala e sobe tudo que
o cliente final precisa, sem Docker, WSL ou instaladores manuais separados.

## Full Bundle Scope

O instalador Windows deve conter e registrar automaticamente:

- `KhompStack-Mqtt`, broker MQTT local. O bundle atual usa Mosquitto.
- `KhompStack-FreeSWITCH`, PBX local para SIP UDP, SIP over WebSocket e RTP.
- `KhompStack-Backend`, API principal.
- `KhompStack-Ingest`, monitoramento do broker MQTT e presenca dos devices.
- `KhompStack-MulticastAgent`, servico local de multicast/RTP.
- PostgreSQL local, inicializado pelo script `init-postgres.ps1`.
- Khomp Stack Desktop, frontend Electron.
- FFmpeg, usado pelo backend para conversao de audio.

Importante: o `.iss` falha durante a compilacao se algum payload obrigatorio,
como `app/Khomp Stack Desktop.exe` ou `freeswitch/FreeSwitchConsole.exe`, nao
existir no bundle. Isso evita gerar um instalador que parece completo, mas
quebra no cliente final.

## Expected Bundle Layout

O script `ops/windows/installer/khomp-stack.iss` assume um bundle pronto em
`dist/windows/bundle` com esta estrutura minima:

```text
dist/windows/bundle/
  app/
    Khomp Stack Desktop.exe
    resources/
      ...
  backend/
    server.exe
  ingest/
    ingest.exe
  multicast-agent/
    multicast-agent.exe
  ffmpeg/
    ffmpeg.exe
  freeswitch/
    FreeSwitchConsole.exe
    fs_cli.exe
    mod/
      ...
    conf/
      ...
  mqtt/
    mosquitto/
      mosquitto.exe
      mosquitto_passwd.exe
      ...
  vendor/
    postgresql/
      postgresql-16.13-3-windows-x64.exe
    winsw/
      WinSW-x64.exe
  ops/
    windows/
      db/
        schema.sql
      scripts/
        bootstrap-config.ps1
        init-postgres.ps1
        install-services.ps1
        uninstall-services.ps1
      winsw/
        freeswitch.xml
        backend.xml
        ingest.xml
        mqtt.xml
        multicast-agent.xml
```

## Install-Time Behavior

Durante a instalacao, o `.iss`:

1. copia os arquivos para `C:\Program Files\Khomp Stack`;
2. cria `C:\ProgramData\Khomp Stack`;
3. executa `install-services.ps1`;
4. o script gera `config\service-runtime.env`;
5. configura MQTT, FreeSWITCH e PostgreSQL;
6. registra os servicos via WinSW;
7. opcionalmente abre o `Khomp Stack Desktop`.

O bootstrap detecta o IPv4 LAN preferencial da maquina e usa esse IP para
`PBX_HOST`, `FREESWITCH_DOMAIN`, `MQTT_BROKER_HOST` e as URLs publicas que os
devices precisam receber.

## Validation Checklist

Depois de instalar em um host Windows limpo, valide:

```powershell
Get-Service KhompStack-*
Test-NetConnection 127.0.0.1 -Port 3000
Test-NetConnection 127.0.0.1 -Port 3010
Test-NetConnection 127.0.0.1 -Port 1883
Test-NetConnection 127.0.0.1 -Port 5432
Test-NetConnection 127.0.0.1 -Port 8021
Test-NetConnection 127.0.0.1 -Port 5060
Test-NetConnection 127.0.0.1 -Port 5066
```

Tambem valide:

- `C:\ProgramData\Khomp Stack\config\service-runtime.env` existe.
- `C:\ProgramData\Khomp Stack\config\freeswitch` existe.
- `C:\ProgramData\Khomp Stack\logs\freeswitch` existe.
- O app registra o SIP do usuario via WebSocket.
- O device registra no broker MQTT e no SIP.
- Uma chamada do navegador para o device chega ao FreeSWITCH.

## Current Blocker

O instalador esta preparado para FreeSWITCH, mas o staging ainda precisa receber
um runtime Windows real em `dist/windows/bundle/freeswitch`. Sem esse payload, a
compilacao do Inno falha de proposito.

Depois que o runtime estiver no bundle, ainda precisamos finalizar a camada
`pbx-provider` do backend para gerar directory/dialplan do FreeSWITCH no lugar
dos arquivos PJSIP/dialplan do Asterisk.
