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

### Backend Architecture (Staging Proxy)
- **Runtime:** Node.js with Express 5 — serves as **reverse proxy only** (no local business logic)
- **Proxy:** `http-proxy-middleware` forwards all `/api/*` requests to `https://staging.unio.tec.br/api/*`
- **server/index.ts** — Express + Vite dev middleware (dev) or static file serving (prod) + API proxy
- **server/static.ts** — Production static file serving
- **server/vite.ts** — Vite dev server middleware
- **Legacy files:** `server/auth.ts`, `server/routes.ts`, `server/storage.ts`, `server/db.ts`, `server/seed.ts`, `server/ble-parser.ts`, `server/ble-metrics.ts` exist but are **not imported** — dead code from pre-migration era

### Authentication (Staging Contract)
- **Login:** POST `/api/auth/pair` with `{email, password}` → `{access, refresh, email}`
- **Refresh:** POST `/api/auth/refresh` with `{refresh}` in body → `{access}`
- **Logout:** POST `/api/auth/blacklist` with `{refresh}` in body
- **Register:** POST `/api/nucleo/registrar` with `{email, password, username}`
- **User data:** GET `/api/nucleo/eu` → UsuarioSchema `{id: int, email, username, first_name, last_name, is_active, criado_em}`
- **Profile:** GET/PATCH `/api/nucleo/perfil` → PerfilSchema `{id, usuario_id, tipo, altura_cm, peso_meta_kg, objetivo, data_nascimento, sexo, foto_url, mac_balanca, idade, criado_em}`
- **Frontend token storage:** Access token in-memory (never localStorage), refresh token in localStorage (MVP — production mobile should use Keychain)
- **client/src/lib/api.ts** — `apiFetch()` auto-attaches Bearer token, handles 401 with single-queue refresh pattern using body-based refresh
- **client/src/lib/auth.tsx** — AuthProvider boots via stored refresh token, `AuthUser` type matches staging UsuarioSchema

### Staging API Endpoints (proxied via Express)
All endpoints are served by `https://staging.unio.tec.br` and proxied through the local Express server.

#### Biometria (Xiaomi Mi Scale 2)
- `POST /api/biometria/registrar/xiaomi` — No JWT (scanner endpoint), validates active window by MAC
- `GET /api/biometria/estado-atual` — JWT required, latest reading + peso atual + variações 7d/30d
- `GET /api/biometria/historico?dias=30` — JWT required, historical weight/fat/bmi data points

#### Hidratação
- `GET /api/hidratacao/meta` — JWT required, daily goal `{ml_meta_diaria, atualizado_em}`
- `PATCH /api/hidratacao/meta` — Update daily goal `{ml_meta_diaria}` → returns updated meta
- `POST /api/hidratacao/registros` — Create intake `{quantidade_ml, tipo_bebida, registrado_em?}` → returns `{id, resumo_dia}` (id is integer)
- `GET /api/hidratacao/registros?inicio=&fim=` — List intake records (default: today)
- `DELETE /api/hidratacao/registros/{registro_id}` — Remove intake → returns `{resumo_dia}`
- `GET /api/hidratacao/resumo?data=YYYY-MM-DD` — Daily summary `{consumido_ml, meta_ml, restante_ml, percentual, atingiu_meta}`
- Valid beverage types: `AGUA`, `SUCO`, `CAFE`, `CHA`, `LEITE`, `ISOTONICO`, `OUTRO`
- Errors: 422 `{errors: [{field, message}]}`, 403 access denied, 404 not found

#### Treino
- `GET /api/treino/exercicios` — List exercises (global + user custom) → `{itens: Exercicio[], total_itens}`
- `POST /api/treino/exercicios` — Create custom exercise `{nome, grupo_muscular?, observacoes?}` → created exercise
- `POST /api/treino/planos` — Create plan `{nome, objetivo?}` → created plan
- `GET /api/treino/planos` — List user plans → `{itens: Plano[], total_itens}`
- `GET /api/treino/planos/{plano_id}` — Plan detail with items array
- `PATCH /api/treino/planos/{plano_id}` — Update plan (partial body)
- `DELETE /api/treino/planos/{plano_id}` — Remove plan → `{id, removido, mensagem}`
- `POST /api/treino/planos/{plano_id}/itens` — Add exercise to plan `{exercicio_id, ordem?, series?, repeticoes?, descanso_segundos?, carga_kg?, observacoes?}`
- `PATCH /api/treino/itens/{item_id}` — Update plan item (partial body)
- `DELETE /api/treino/itens/{item_id}` — Remove plan item → `{id, removido, mensagem}`
- `POST /api/treino/sessoes` — Create session `{plano_id?, iniciado_em, concluida, observacoes?}`
- `GET /api/treino/sessoes?inicio=&fim=` — List sessions by date range (default: today)
- `GET /api/treino/sessoes/{sessao_id}` — Session detail
- `PATCH /api/treino/sessoes/{sessao_id}` — Update session (concluir, duração)
- `DELETE /api/treino/sessoes/{sessao_id}` — Remove session
- `carga_kg` is decimal string (e.g. "60.00"), IDs are integers
- Frontend routes: `/training`, `/training/plans/:planoId`, `/training/exercises`, `/training/sessions`, `/training/player/:planoId`
- React Query keys: `["treino","planos"]`, `["treino","plano",planoId]`, `["treino","exercicios"]`, `["treino","sessoes",inicio,fim]`

#### Suplementação
- `GET /api/nutricao/suplementacao/protocolos` — List supplement protocols
- `POST /api/nutricao/suplementacao/protocolos` — Create protocol
- `PATCH /api/nutricao/suplementacao/protocolos/{id}` — Update protocol
- `POST /api/nutricao/suplementacao/protocolos/{id}/ativar` — Activate protocol
- `GET /api/nutricao/suplementacao/agenda-hoje` — Today's supplement schedule
- `POST /api/nutricao/suplementacao/agenda/{item_horario_id}/registrar` — Register intake
- `GET /api/nutricao/suplementacao/historico` — Intake history
- `GET /api/nutricao/suplementacao/resumo` — 7d/30d adherence summary

### Key Conventions
- Staging IDs are **integers** (not UUIDs)
- All UX copy is in Brazilian Portuguese (PT-BR)
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- The app is constrained to 430px max-width to simulate a mobile device
- Dates from staging use ISO 8601 with -03:00 timezone offset

### Build & Deploy
- Development: `npm run dev` starts Express server with Vite dev middleware (HMR)
- Production: `npm run build` runs Vite client build + esbuild server bundle → `dist/`
- Production start: `npm start` serves from `dist/index.cjs`

## External Dependencies

- **Staging API** — `https://staging.unio.tec.br` — all business logic, auth, data storage
- **Google Fonts** — Playfair Display and Inter loaded via CDN in `index.html`
- **DiceBear Avatars** — Used for placeholder user/professional avatars (`api.dicebear.com`)
- **Replit Plugins** — `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` for development experience
- **shadcn/ui** — Full Radix UI primitive set installed (dialog, dropdown, tabs, toast, etc.)
- **http-proxy-middleware** — Reverse proxy for API requests to staging