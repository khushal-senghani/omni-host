# Omni-Host

> Self-hosted central server for multiple independent applications — build your own personal app platform on a student budget.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000.svg)](https://fastify.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-embedded-003B57.svg)](https://sqlite.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8+-F69220.svg)](https://pnpm.io/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✨ Features

- **Plugin-based architecture** — each app is a self-contained Fastify plugin
- **Zero-cost infrastructure** — SQLite, Docker, Oracle Cloud Free Tier
- **Automatic app discovery** — drop an app into `apps/`, it just works
- **JWT authentication** + refresh tokens (single-owner model)
- **Type-safe everything** — TypeScript strict mode + Zod validation
- **OpenAPI / Swagger docs** — auto-generated from your route schemas
- **Modular monorepo** — pnpm workspaces with shared packages

---

## 🗂 Project Structure

```
omni-host/
├── apps/
│   ├── server/          ← central gateway (always present)
│   └── <your-apps>/     ← each app is a Fastify plugin
├── packages/
│   ├── core/            ← DB client, shared types, error helpers
│   ├── auth/            ← JWT utilities + Fastify auth plugin
│   └── config/          ← env validation (Zod)
└── scripts/             ← CLI to scaffold new apps
```

The server automatically registers every folder inside `apps/` (except `server/`) that exports an `AppPlugin` contract.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/omni-host.git
cd omni-host

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — generate strong JWT secrets with:
#   openssl rand -base64 48

# 4. Create the database and run migrations
mkdir -p data logs
pnpm db:generate
pnpm db:migrate

# 5. Create the admin user
pnpm setup-admin

# 6. Start the development server
pnpm dev
```

- Server: `http://localhost:3000`
- API Docs (Swagger): `http://localhost:3000/docs`

---

## 📦 Creating a New App

```bash
pnpm create-app my-first-app
```

This scaffolds `apps/my-first-app/` with a ready-to-run plugin:

```ts
// apps/my-first-app/src/index.ts
import fp from 'fastify-plugin';
import type { AppPlugin } from '@omni/core';

const plugin = fp(async (fastify) => {
  fastify.get('/hello', async () => ({ message: 'Hello from my-first-app!' }));
});

export default {
  name: 'my-first-app',
  prefix: '/my-first-app',
  plugin,
  meta: {
    displayName: 'My First App',
    description: 'An example app',
    version: '0.1.0',
  },
} satisfies AppPlugin;
```

Restart the server — your app is automatically mounted at `/my-first-app`.

---

## 🔐 Authentication

Omni-Host uses a single-owner model. Use the admin credentials created with `pnpm setup-admin`.

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}'

# Access a protected route
curl http://localhost:3000/my-first-app/protected \
  -H "Authorization: Bearer <access_token>"
```

Protect routes inside your app plugin with the `authenticate` preHandler:

```ts
fastify.get('/private', {
  preHandler: [fastify.authenticate],
}, async (request) => {
  const userId = request.user.id;
  // ...
});
```

---

## 🗄 Database

SQLite is used by default — embedded, zero-cost, zero-setup.

| Detail | Value |
|---|---|
| Database file | `./data/omni.db` |
| Schema location | `packages/core/src/db/schema.ts` |
| ORM | Drizzle ORM |

```bash
pnpm db:generate   # Generate migration files from schema changes
pnpm db:migrate    # Apply pending migrations
pnpm db:studio     # Open Drizzle Studio (visual editor)
```

> **Need to scale later?** Drizzle supports PostgreSQL too — switching to [Neon's free tier](https://neon.tech) requires minimal changes.

---

## 🐳 Production Deployment

### Option 1 — Docker Compose (recommended)

```bash
# Build and start in the background
docker-compose up -d

# Follow logs
docker-compose logs -f
```

### Option 2 — Oracle Cloud Free Tier (AMD VM)

```bash
git clone https://github.com/yourusername/omni-host.git
cd omni-host
pnpm install --prod
pnpm build
pnpm db:migrate
pnpm start
```

> Put Nginx in front with Let's Encrypt for free SSL.
> See the `deployment/` folder for example `systemd` unit and Nginx config files.

---

## 🧪 Testing

```bash
pnpm test                                    # Run all tests
pnpm test:ui                                 # Interactive UI mode
pnpm --filter @omni/my-first-app test        # Test a specific app
```

---

## 📁 Path Reference

| Path | Purpose |
|---|---|
| `apps/server/` | Central Fastify instance, plugin registry, auth middleware |
| `apps/*/` | Individual app plugins (created with `pnpm create-app`) |
| `packages/core/` | Database client, Drizzle schemas, shared TypeScript types |
| `packages/auth/` | JWT utilities, Fastify auth plugin |
| `packages/config/` | Zod environment validation |
| `scripts/` | `create-app.ts` scaffold, `setup-admin.ts` helper |

---

## 🤝 Contributing

This is a personal project, but issues and ideas are welcome.

1. Fork the repo
2. Create a branch: `git checkout -b feature/amazing-thing`
3. Commit your changes
4. Push and open a Pull Request

---

## 📄 License

[MIT](LICENSE) — use it for anything, no strings attached.

---

*Built with TypeScript, Fastify, SQLite, and pnpm. Perfect for a solo developer who wants their own private app hub.* 🚀
