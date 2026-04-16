# stack-pbx

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Hono, ORPC, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database if you are running the apps outside Docker:

```bash
bun run db:push
```

## Local PBX Infrastructure

The repository now includes a local PBX stack in [docker-compose.yml](/Users/lucasaguiar/Downloads/stack-pbx/docker-compose.yml):

- PostgreSQL
- EMQX as the MQTT broker
- Asterisk with PJSIP and AMI enabled

Bring the base stack up with:

```bash
bun run infra:up
```

For container-based development with hot reload for the web, server, and ingest apps, use the override in [docker-compose.dev.yml](/Users/lucasaguiar/Downloads/stack-pbx/docker-compose.dev.yml):

```bash
bun run docker:dev:up
```

This mode mounts changes under `apps/web`, `apps/server`, `apps/ingest`, and `packages/*` into the containers and should reload automatically. Rebuild is only needed when you change dependencies, the `Dockerfile`, or other files baked into the image. The server container now waits for PostgreSQL and runs `db:push` automatically on startup, so the first `docker compose up` no longer needs a manual schema push.

For client delivery using published Docker images instead of local source builds, see [client-dist/deploy/client/README.md](/Users/lucasaguiar/Downloads/stack-pbx/client-dist/deploy/client/README.md).

Bring it down with:

```bash
bun run infra:down
```

Bring the dev override down with:

```bash
bun run docker:dev:down
```

Copy [/.env.example](/Users/lucasaguiar/Downloads/stack-pbx/.env.example) to `/.env`. This root file is now the single source of truth for local app runtime, Vite, and Docker compose.

The plain keys are used when you run the apps directly on your machine. The `DOCKER_*` keys in the same file are only used by the Docker stack to override container-network values like `postgres`, `emqx`, and `asterisk`.

Inside Docker, keep `DOCKER_ASTERISK_AMI_HOST=asterisk` so the backend talks to the Asterisk container over the compose network. Use `ASTERISK_DEVICE_HOST` for the LAN/public IP that physical SIP devices should register against.

For local execution outside Docker, prefer setting `PBX_HOST` once in `/.env`. The app now derives MQTT/Asterisk/WebSocket defaults from that host automatically, and you only need the explicit keys if you want to override a specific endpoint.

```bash
PBX_HOST=127.0.0.1
```

Make sure these values are present as well so the backend can auto-provision devices into Asterisk when a device is created:

```bash
MQTT_BROKER_PORT=1883
MQTT_BROKER_USERNAME=stack-pbx
MQTT_BROKER_PASSWORD=change-me-mqtt
ASTERISK_AUTO_PROVISION=true
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_PASSWORD=admin123
ASTERISK_DEVICE_SIP_PORT=5060
```

If `MQTT_BROKER_USERNAME` and `MQTT_BROKER_PASSWORD` are both set, the Dockerized EMQX broker now boots with built-in authentication enabled using those same credentials. For local smoke tests you can still leave them blank, but for any shared or production-like environment the recommended setup is to change both values in `/.env` before the first `docker compose up`.

When `ASTERISK_AUTO_PROVISION=true`, each device creation now:

- writes a dedicated PJSIP endpoint/auth/AOR file under `infra/asterisk/generated/pjsip/devices`
- ensures a group-specific dialplan context exists under `infra/asterisk/generated/extensions/groups`
- rewrites the generated include indexes consumed by Asterisk
- reloads Asterisk through AMI so the ramal and senha become active immediately

When a device is deleted, the backend also removes the generated PJSIP file and reloads Asterisk again.

The ingest service and web app also read from the same root `/.env`, so you no longer need separate per-app `.env` files just to configure the stack for a customer.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Use the Expo Go app to run the mobile application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
stack-pbx/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run docker:dev:up`: Start Docker in hot reload mode for web, server, and ingest
- `bun run docker:dev:down`: Stop the Docker hot reload stack
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate database client/types
- `bun run db:migrate`: Run database migrations
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Oxlint and Oxfmt
