# UNIO - Unified Health Ecosystem

## Overview

UNIO ("Performance OS") is a unified health and wellness platform that centralizes nutrition tracking, training management, biometrics monitoring, supplementation, and pantry/inventory logistics into a single ecosystem. The app targets Brazilian Portuguese-speaking users and follows a premium, organic design language with specific brand colors (greens, golds, creams).

The platform is built as a mobile-first web application (430px frame) with plans for future React Native migration. It includes five core modules:

1. **Nutrição (Nutrition)** — Meal logging, calorie tracking, barcode scanning, BLE kitchen scale integration
2. **Treino (Training)** — Workout prescription, execution timer, load progression tracking
3. **Biometria (Biometrics)** — Body composition via Xiaomi Mi Scale 2, weight trends, BMI
4. **Suplementação (Supplements)** — Supplement intake tracking with reminders
5. **Despensa (Pantry)** — Food/supplement inventory management with smart shopping lists

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter (lightweight React router)
- **State Management:** TanStack React Query for server state; Zustand for local sync engine state
- **Styling:** Tailwind CSS v4 with `@tailwindcss/vite` plugin, shadcn/ui component library (New York style)
- **Animations:** Framer Motion for page transitions and micro-interactions
- **Charts:** Recharts for data visualization (weight trends, nutrition charts)
- **Forms:** React Hook Form with Zod validation via `@hookform/resolvers`
- **Design System:** Custom design tokens defined in `client/src/index.css` using CSS custom properties. Two font families: Playfair Display (display/headings) and Inter (body text)
- **Mobile Primitives:** Custom `View`, `Text` components in `client/src/components/mobile-primitives.tsx` that simulate React Native primitives for future migration
- **Build Tool:** Vite with React plugin

### Backend Architecture
- **Runtime:** Node.js with Express 5
- **Language:** TypeScript, compiled with tsx for development and esbuild for production
- **API Pattern:** RESTful JSON API under `/api/*` prefix
- **Authentication:** Email/password auth with bcrypt + express-session + connect-pg-simple (PostgreSQL session store)
  - Auth endpoints: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me
  - All data routes protected with `requireAuth` middleware
  - User-scoped routes enforce `req.session.userId` ownership checks
  - AuthProvider context in `client/src/lib/auth.tsx` with route guards in App.tsx
- **Validation:** Zod schemas (generated from Drizzle schemas via `drizzle-zod`) for request validation
- **Error Handling:** Centralized Zod error formatter using `zod-validation-error`

### Data Storage
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM with `drizzle-orm/node-postgres` driver
- **Schema Location:** `shared/schema.ts` — shared between client and server
- **Migrations:** Drizzle Kit with `drizzle-kit push` for schema sync
- **Tables:**
  - `users` — User profiles (UUID primary keys, soft delete)
  - `body_records` — Weight/body composition measurements
  - `foods` — Nutritional database (per-serving macro data)
  - `food_stock` — Pantry inventory tracking
  - `sync_log` — Change tracking for offline sync
- **Seed Data:** `server/seed.ts` provides 15 common Brazilian foods and a default user

### Sync Engine (Offline-First, Real API)
- Client-side sync engine in `client/src/lib/sync-engine.ts` using Zustand
- **Real HTTP calls** to `POST /api/sync/push` and `GET /api/sync/pull`
- Cursor-based incremental sync using `last_pulled_at` timestamp
- Server classifies changes as created/updated/deleted based on `updated_at` vs cursor
- Push handler: supports create/update/delete with automatic date coercion and conflict resolution
- Sync log table tracks all mutations for audit trail
- Scale screen fully integrated: weight readings persist to `body_records` via sync push

### BLE Integration (Mock)
- `client/src/lib/ble-mock.ts` simulates Bluetooth Low Energy connection to Xiaomi Mi Scale 2
- Produces mock weight/impedance measurements
- Real BLE integration planned via external scanner posting to `POST /api/biometria/registrar/xiaomi`

### Key Conventions
- All database IDs use UUIDs (`gen_random_uuid()`)
- Soft deletes via `is_deleted` boolean column
- Timestamps with timezone (`created_at`, `updated_at`) on all tables
- All UX copy is in Brazilian Portuguese (PT-BR)
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- The app is constrained to 430px max-width to simulate a mobile device

### OpenAPI Contract
- Served at `GET /api/openapi.json` (OpenAPI 3.1.0)
- Documents all CRUD endpoints and sync protocol
- Can be used to generate TypeScript client types via `openapi-typescript`

### Build & Deploy
- Development: `npm run dev` starts Express server with Vite dev middleware (HMR)
- Production: `npm run build` runs Vite client build + esbuild server bundle → `dist/`
- Production start: `npm start` serves from `dist/index.cjs`
- Database schema push: `npm run db:push`

## External Dependencies

- **PostgreSQL** — Primary database, connected via `DATABASE_URL` environment variable
- **Google Fonts** — Playfair Display and Inter loaded via CDN in `index.html`
- **DiceBear Avatars** — Used for placeholder user/professional avatars (`api.dicebear.com`)
- **Unsplash** — Placeholder training program images
- **Xiaomi Mi Scale 2** — Target BLE hardware for biometrics (currently mocked)
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for development experience
- **shadcn/ui** — Full Radix UI primitive set installed (dialog, dropdown, tabs, toast, etc.)
- **connect-pg-simple** — PostgreSQL session store (available but not fully wired for auth yet)