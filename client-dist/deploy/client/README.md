# Entrega para cliente com imagens Docker

Este projeto pode ser entregue ao cliente sem expor o source principal dos apps.

## O que voce entrega

- [docker-compose.yml](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/docker-compose.yml)
- [.env.example](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/.env.example)
- pasta [infra/](/Users/lucasaguiar/Downloads/stack-pbx/infra)

O cliente faz:

1. entra em `deploy/client`
2. copia `.env.example` para `.env`
3. troca o IP `192.168.1.50` pelo IP da maquina onde o sistema vai rodar
4. troca `MQTT_BROKER_USERNAME` e `MQTT_BROKER_PASSWORD` por credenciais proprias
5. sobe com `docker compose up -d`

Ou, a partir da raiz do projeto:

```bash
docker compose --env-file deploy/client/.env -f deploy/client/docker-compose.yml up -d
```

## Estrutura sugerida para entrega

Voce pode entregar:

- a pasta [deploy/client/](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client)
- a pasta [infra/](/Users/lucasaguiar/Downloads/stack-pbx/infra)

Assim o material do cliente fica isolado do fluxo de desenvolvimento.

## Publicacao das imagens

Exemplo com GitHub Container Registry:

```bash
docker login ghcr.io
docker build -f deploy/client/Dockerfile.server -t ghcr.io/seu-usuario/khomp-pabx-server:1.0.0 .
docker build -f deploy/client/Dockerfile.ingest -t ghcr.io/seu-usuario/khomp-pabx-ingest:1.0.0 .
docker build -f deploy/client/Dockerfile.web -t ghcr.io/seu-usuario/khomp-pabx-web:1.0.0 .

docker push ghcr.io/seu-usuario/khomp-pabx-server:1.0.0
docker push ghcr.io/seu-usuario/khomp-pabx-ingest:1.0.0
docker push ghcr.io/seu-usuario/khomp-pabx-web:1.0.0
```

## O que fica dentro de `deploy/client`

- [Dockerfile.server](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/Dockerfile.server)
- [Dockerfile.ingest](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/Dockerfile.ingest)
- [Dockerfile.web](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/Dockerfile.web)
- [docker-compose.yml](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/docker-compose.yml)
- [.env.example](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/.env.example)

## Observacao importante sobre o frontend

O `web` usa variaveis `VITE_*`, entao o IP do cliente precisa entrar no build.

Para evitar rebuild manual fora do cliente, a imagem [Dockerfile.web](/Users/lucasaguiar/Downloads/stack-pbx/deploy/client/Dockerfile.web) faz:

1. `bun run build`
2. `bun run serve --host 0.0.0.0 --port 3001`

no startup do container.

Assim o cliente consegue mudar o `.env` local e subir o sistema com o IP correto sem recompilar a imagem na maquina dele.

## Credenciais do broker MQTT

O stack de entrega aceita `MQTT_BROKER_USERNAME` e `MQTT_BROKER_PASSWORD` diretamente no `.env`.

Quando os dois valores estao preenchidos, o container do EMQX sobe com autenticacao habilitada e importa esse usuario automaticamente. O sistema inteiro reutiliza essas mesmas credenciais para provisionar devices e conectar nos servicos internos.

Para ambiente real, o ideal e alterar os valores de exemplo antes do primeiro deploy e guardar essas credenciais fora de documentos compartilhados.

## URLs finais no cliente

- Web: `http://IP-DA-MAQUINA:3001`
- API: `http://IP-DA-MAQUINA:3000`
- Asterisk WS: `ws://IP-DA-MAQUINA:8088/ws`
- SIP UDP/TCP: `IP-DA-MAQUINA:5060`

## Sugestao pratica de versao

Use tags fechadas:

- `1.0.0`
- `1.0.1`
- `1.1.0`

Evite entregar `latest` para cliente.
