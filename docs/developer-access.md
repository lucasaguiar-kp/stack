# Acesso à Plataforma para Desenvolvedores

Este documento explica como um desenvolvedor pode preparar o ambiente e acessar a plataforma pela primeira vez.

## Pré-requisitos

O desenvolvedor precisa instalar:

- Docker
- Bun

## 1. Instalar o Docker

### Windows

Use a documentação oficial do Docker para Windows:

- [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/)

### Linux

Use a documentação oficial do Docker para Linux:

- [Docker Desktop para Linux](https://docs.docker.com/desktop/setup/install/linux/)

Observação:

- Em Linux, também é comum usar Docker Engine + Docker Compose Plugin em vez do Docker Desktop, dependendo da distribuição e da preferência do time.

## 2. Instalar o Bun

Use a documentação oficial do Bun:

- [Instalação do Bun](https://bun.sh/docs/installation)

## 3. Clonar o projeto

Depois de instalar Docker e Bun, clone o repositório e entre na pasta do projeto:

```bash
git clone <URL_DO_REPOSITORIO>
cd stack-pbx
```

## 4. Criar o arquivo `.env`

Copie o arquivo de exemplo para `.env`:

### Windows

No PowerShell:

```powershell
Copy-Item .env.example .env
```

### Linux

```bash
cp .env.example .env
```

## 5. Configurar o IP da máquina

Abra o arquivo `.env` e altere a variável `PBX_HOST` para o IP da máquina do usuário.

Exemplo:

```env
PBX_HOST=192.168.1.40
```

Esse IP será usado como base para a comunicação com os serviços locais da plataforma.

## 6. Subir a infraestrutura

Com o `.env` configurado, execute:

```bash
bun run infra:up
```

Esse comando sobe a infraestrutura necessária via Docker Compose.

## 7. Acessar a plataforma

Depois que os containers estiverem no ar, a plataforma poderá ser acessada pelos endereços configurados no projeto.

No ambiente padrão deste repositório:

- Web: `http://localhost:3001`
- API: `http://localhost:3000`

## Resumo rápido

```bash
# 1. Clonar o projeto
git clone <URL_DO_REPOSITORIO>
cd stack-pbx

# 2. Criar o .env
cp .env.example .env

# 3. Editar o PBX_HOST no .env

# 4. Subir a infraestrutura
bun run infra:up
```

## Observações

- Se o desenvolvedor estiver no Windows, o comando para copiar `.env.example` para `.env` pode ser feito no PowerShell com `Copy-Item`.
- Se o desenvolvedor estiver no Linux, use `cp .env.example .env`.
- Se o IP da máquina mudar, será necessário atualizar novamente o `PBX_HOST` no `.env`.
