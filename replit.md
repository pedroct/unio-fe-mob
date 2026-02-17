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
- **Authentication:** Production-grade JWT with access tokens (10min) + refresh tokens (14 days, HttpOnly cookie)
  - **server/auth.ts** — Token generation, verification, rotation, session management
  - Auth endpoints: POST /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/logout-all, /api/auth/refresh, GET /api/auth/me
  - Access token stored in-memory on frontend (never localStorage), refresh token in HttpOnly cookie scoped to /api/auth/refresh
  - Atomic refresh token rotation: old token revoked in DB transaction before new one created
  - `requireAuth` middleware validates JWT signature + expiry + tokenVersion (DB check) for instant revocation
  - Rate limiting: 5 attempts/min per IP+email for login, 10/min per IP for refresh
  - Audit fields: lastLoginAt, failedLoginAttempts, lastLoginIp, lastLoginUserAgent
  - `auth_sessions` table stores hashed refresh tokens with device info and expiry
  - **client/src/lib/api.ts** — `apiFetch()` auto-attaches Bearer token, handles 401 with single-queue refresh pattern
  - AuthProvider context in `client/src/lib/auth.tsx` boots via refresh cookie, stores access token in memory
  - **Profile endpoints**: GET/PATCH `/api/auth/profile` — uses userId from token only (no ID in path), symmetric contract (same fields returned on GET and PATCH response). Dedicated `updateProfileSchema` Zod validator with field-level errors `{errors: [{field, message}]}`. Server normalizes `scaleMac` to uppercase before validation.
- **Validation:** Zod schemas (generated from Drizzle schemas via `drizzle-zod`) for request validation
- **Error Handling:** Centralized Zod error formatter using `zod-validation-error`; profile routes use field-level error format `{errors: [{field, message}]}`

### Data Storage
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM with `drizzle-orm/node-postgres` driver
- **Schema Location:** `shared/schema.ts` — shared between client and server
- **Migrations:** Drizzle Kit with `drizzle-kit push` for schema sync
- **Tables:**
  - `users` — User profiles (UUID primary keys, soft delete, audit fields for auth, scaleMac for BLE scale, mlMetaDiaria/metaAtualizadaEm for hydration goal)
  - `auth_sessions` — JWT refresh token sessions (hashed tokens, device info, expiry)
  - `body_records` — Weight/body composition measurements
  - `foods` — Nutritional database (per-serving macro data, optional FK `alimento_tbca_id` to TBCA)
  - `grupos_alimentares` — TBCA food groups (A=Cereais, B=Verduras, C=Frutas, etc.)
  - `tipos_alimento` — TBCA food preparation types (CRU, COZIDO, GRELHADO, etc.)
  - `nutrientes` — Nutrient definitions (ENERGIA, PROTEINA, CARBOIDRATO, GORDURA_TOTAL, FIBRA, etc.)
  - `alimentos_tbca` — TBCA food items with codigo_tbca, grupo/tipo FKs, porcao_base_g
  - `alimento_nutrientes` — Nutritional composition per TBCA food (valor_por_100g per nutriente)
  - `lotes_importacao` — TBCA import batch tracking
  - `log_importacao_alimentos` — Per-food import audit log
  - `food_stock` — Pantry inventory tracking
  - `hydration_records` — Water/beverage intake tracking (soft delete via deletedAt, beverageType enum AGUA/SUCO/CAFE/CHA/LEITE/ISOTONICO/OUTRO)
  - `pesagens_pendentes` — BLE kitchen scale pending weighings (tri-state: PENDENTE/ASSOCIADA/DESCARTADA, dedup signature, FKs to users/foods/mealEntries)
  - `sync_log` — Change tracking for offline sync
- **Seed Data:** `server/seed.ts` provides 15 legacy foods, 20 TBCA foods (with full nutritional composition across 15 nutrients), 14 food groups, 8 food types, and a default user

### Sync Engine (Offline-First, Real API)
- Client-side sync engine in `client/src/lib/sync-engine.ts` using Zustand
- **Real HTTP calls** to `POST /api/sync/push` and `GET /api/sync/pull`
- Cursor-based incremental sync using `last_pulled_at` timestamp
- Server classifies changes as created/updated/deleted based on `updated_at` vs cursor
- Push handler: supports create/update/delete with automatic date coercion and conflict resolution
- Sync log table tracks all mutations for audit trail
- Scale screen fully integrated: weight readings persist to `body_records` via sync push

### BLE Kitchen Scale (ICOMON)
- **Parser:** `server/ble-parser.ts` — ICOMON packet parser supporting 14-byte and 20-byte hex formats
  - Control byte [0]: stability flag (0x20 bit) + unit code (0x0F mask)
  - Weight: bytes [11-12] for 14B, bytes [3-4] for 20B (big-endian uint16)
  - 7 unit conversions: g (1:1), ml (1:1), ml_milk (×1.03), oz (×28.35÷10), lb_oz (×28.35÷10), fl_oz (×29.5735÷10), fl_oz_milk (×30.42÷10)
  - Physical limits: 0 < weight ≤ 5000g
- **Pending Queue Pattern:** BLE readings create PENDENTE entries in `pesagens_pendentes` table; user later associates with food or discards
- **Deduplication:** 5-second window using signature (userId:roundedWeight:unit:MAC)
- **Endpoints:**
  - `POST /api/nutricao/diario/balanca-cozinha` — Ingestion (hex parse or manual weight, dedup, optional food association)
  - `GET /api/nutricao/diario/pesagens-pendentes` — List user's pending weighings
  - `POST /api/nutricao/diario/pesagens-pendentes/:id/associar` — Associate pending weighing with food
  - `DELETE /api/nutricao/diario/pesagens-pendentes/:id` — Discard pending weighing (soft delete via status change)
- **Security:** Auth required, user-scoped queries, rate limiting (30 req/min per user+MAC composite key), audit logging
- **Atomic Operations:** Association/discard use DB transactions with SELECT FOR UPDATE row-level locks
- **Rate Limiting:** Configurable window (default 60s/30 req), composite key `ble:{userId}:{mac}`, standardized 429 response `{erro, codigo: "BLE_RATE_LIMIT", detalhe}`
  - **Limitation:** Uses `express-rate-limit` MemoryStore (in-process). Counters are not shared across multiple server instances. For horizontal scaling, swap to a Redis-backed store (`rate-limit-redis`).
- **Metrics:** In-memory counters at `GET /api/ble/metrics` — ingestion success/error, dedup count, 429 blocks, association success/error with latency tracking
  - **Access policy:** Requires valid JWT (`requireAuth`). Any authenticated user can read metrics. Admin-only restriction can be added if needed.
- **Observability:** `server/ble-metrics.ts` — correlation IDs in structured JSON audit logs, sensitive data stripped (no JWT/passwords/raw payloads)
  - Correlation ID: Uses `X-Request-ID` header from client when present (max 128 chars); generates fallback `ble-XXXXXXXX` when absent
- **E2E Tests:** 24 tests in `tests/ble-kitchen-scale.test.ts` (Phase 1+2 incl. concurrency), 10 tests in `tests/ble-phase3-security.test.ts` (rate limit, metrics, audit, regression)

### BLE Smart Scale (Xiaomi Mi Scale 2 — Real Integration)
- External BLE scanner posts readings to backend (no Web Bluetooth in app)
- `devices` table has `em_espera_ate` nullable timestamp for 5-minute weighing window
- **Endpoints:**
  - `POST /api/biometria/dispositivos/:id/preparar-pesagem` — JWT required, opens 5-min window (`em_espera_ate = now+5min`)
  - `POST /api/biometria/registrar/xiaomi` — No JWT (scanner endpoint), validates active window by MAC, creates body_record
  - `GET /api/biometria/estado-atual` — JWT required, returns latest reading + peso atual + variações 7d/30d + meta
  - `GET /api/biometria/historico?dias=30&limite=0` — JWT required, historical weight/fat/bmi data points + statistics
- **Deduplication:** 60-second window, device+user+weight±0.05kg+impedance match
- **Impedance filtering:** Values 0 and 65534 converted to null (sensor noise)
- **BMI calculation:** Uses user's `heightCm` from profile (if available)
- **Window cleanup:** `em_espera_ate` cleared after successful ingestion, `lastSeenAt` updated
- **Frontend:** Real API integration with polling (2.5s interval), countdown timer, success/timeout/error states
- **E2E Tests:** 9 tests in `tests/biometria-xiaomi.test.ts` (preparar, registrar, dedup, impedância, estado, histórico)
- `client/src/lib/ble-mock.ts` still available for offline development

### Key Conventions
- All database IDs use UUIDs (`gen_random_uuid()`)
- Soft deletes via `is_deleted` boolean column (older tables) or `deleted_at` timestamp (newer tables like hydration_records)
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
- **jsonwebtoken** — JWT access/refresh token generation and verification