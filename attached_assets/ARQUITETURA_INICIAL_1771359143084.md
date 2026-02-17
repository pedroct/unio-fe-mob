# PRPOSTA DE ARQUITETURA

## Definição da Stack Tecnológica

### Mobile: React Native (bare workflow, sem Expo managed)

A escolha não é óbvia, mas é deliberada:

Por que não Expo managed: O Expo simplifica muito, mas o acesso BLE de baixo nível que você precisa (ler payloads proprietários da Xiaomi, parsear GATT characteristics da balança de cozinha) exige controle fino sobre módulos nativos. O Expo Go não suporta react-native-ble-plx adequadamente, e o EAS build adiciona complexidade sem ganho real quando você já vai distribuir via TestFlight.

Por que não Flutter: Flutter tem excelentes packages BLE (flutter_blue_plus), mas a integração com HealthKit é mais madura no ecossistema React Native (react-native-health). Além disso, se seu time tem mais familiaridade com JavaScript/TypeScript, o ganho de produtividade é real. Flutter seria a escolha se BLE:

- React Native 0.76+ (New Architecture habilitada)
- react-native-ble-plx para BLE
- react-native-health para HealthKit
- WatermelonDB para persistência offline (justificativa na seção 3)
- TypeScript obrigatório
- Navegação: React Navigation 7

### Backend: Phyton + Django Ninja
Por que não FastAPI: FastAPI é excelente para APIs puras, mas você precisa de um Admin Panel para gestão de dieta/estoque. O Django Admin sozinho economiza 2-3 semanas de desenvolvimento de CRUD administrativo. Django Ninja dá a mesma experiência de desenvolvimento que FastAPI (type hints, OpenAPI automático, async support) mas rodando dentro do Django.

Por que não DRF: Django Ninja é mais rápido para desenvolver, tem serialização automática via Pydantic, e a documentação OpenAPI é gerada sem configuração extra. DRF é mais maduro, mas para um MVP a velocidade do Ninja compensa.

#### Stack backend:

Python 3.12
Django Ninja
PostgreSQL 15
Celery + Redis (para tarefas assíncronas de sync)
Gunicorn com workers Uvicorn (para endpoints async)

### Frontend Web
Django API + Frontend separado (React + TypeScript)
Máxima liberdade de UI. Você implementa seu design system sem restrição nenhuma. Mas adiciona: um segundo projeto para manter, build pipeline, gerenciamento de estado, CORS, autenticação duplicada (token no mobile e no web). Para um MVP solo ou com time pequeno, isso facilmente adiciona 3-4 semanas.

### Frontend Web Tech Stack
Core: React 19 + TypeScript + Vite
Estilização: Tailwind CSS v4 + tailwindcss-animate (Design System baseado em CSS Variables)
UI Library: Arquitetura shadcn/ui (baseada em Radix UI headless)
Ícones: Lucide React
Gráficos: Recharts (usado para gráficos de área e linha)
Roteamento: Wouter (API similar ao react-router, mais leve)
Formulários: React Hook Form + Zod (para validação de schemas)
Gerenciamento de Estado: React Query (TanStack Query) está configurado no App.tsx para futuro consumo de API.

Essa stack de frontend é sólida e o Replit vai acelerar bastante a prototipagem das telas. Vamos atualizar o plano técnico para refletir essa decisão.

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Mobile (iOS)              Frontend Web          Backend   │
│   React Native              React 19 + Vite       Django    │
│   WatermelonDB              TanStack Query         Ninja    │
│        │                         │                   │      │
│        │         ┌───────────────┘                   │      │
│        │         │                                   │      │
│        └────────▶│◀─────────────────────────────────┘      │
│                  │                                          │
│            REST API (JSON)                                  │
│            /api/v1/*                                        │
│                                                             │
│   api.unio.com.br               ← Nginx serve ambos         │
│   /                             ← SPA (React build)         │
│   /api/*                        ← Django Ninja              │
│   /admin/*                      ← Django Admin (interno)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Geração automática de types TypeScript
Isso elimina a dor de manter types manualmente nos dois lados. Django Ninja gera OpenAPI 3.1, e você usa uma ferramenta para converter em types:
# No CI ou como script de dev
# 1. Exportar schema do Django
python manage.py export_openapi_schema > openapi.json

# 2. Gerar types TypeScript
npx openapi-typescript openapi.json -o frontend/src/types/api.d.ts

# Arquitetura de Dados (Schema Preliminar)
A modelagem segue alguns princípios: toda entidade que sincroniza com o mobile tem uuid como PK (não auto-increment), campos de controle de sync (created_at, updated_at, is_deleted para soft-delete), e o campo synced_at que o sync engine usa.

┌─────────────────────────────────────────────────────────────────┐
│                        SCHEMA UNIO                              │
└─────────────────────────────────────────────────────────────────┘

users
├── id: UUID (PK)
├── email: VARCHAR UNIQUE
├── password_hash: VARCHAR
├── name: VARCHAR
├── birth_date: DATE
├── sex: ENUM('M','F')
├── height_cm: DECIMAL(5,2)
├── activity_level: ENUM('sedentary','light','moderate','active','very_active')
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

body_records                          ← Dados da Xiaomi + manuais
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── recorded_at: TIMESTAMPTZ         ← quando a medição aconteceu
├── source: ENUM('xiaomi_scale','manual','apple_health')
├── weight_kg: DECIMAL(5,2)
├── impedance_ohm: INTEGER NULL      ← raw da balança
├── body_fat_pct: DECIMAL(5,2) NULL  ← calculado localmente
├── muscle_mass_kg: DECIMAL(5,2) NULL
├── lean_body_mass_kg: DECIMAL(5,2) NULL
├── bone_mass_kg: DECIMAL(4,2) NULL
├── water_pct: DECIMAL(5,2) NULL
├── visceral_fat: INTEGER NULL
├── bmr_kcal: INTEGER NULL
├── raw_payload: JSONB NULL          ← payload BLE cru p/ debug
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
├── is_deleted: BOOLEAN DEFAULT FALSE
└── INDEX(user_id, recorded_at DESC)

lab_exams
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── exam_date: DATE
├── category: VARCHAR                ← 'hemograma','hormonal','metabolico',...
├── results: JSONB                   ← flexível: {"tsh": 2.1, "t4_livre": 1.3, ...}
├── file_url: VARCHAR NULL           ← PDF do exame se houver
├── notes: TEXT NULL
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── is_deleted: BOOLEAN DEFAULT FALSE

foods
├── id: UUID (PK)
├── name: VARCHAR
├── brand: VARCHAR NULL
├── barcode: VARCHAR NULL
├── serving_g: DECIMAL(7,2)          ← porção padrão em gramas
├── calories_kcal: DECIMAL(7,2)
├── protein_g: DECIMAL(7,2)
├── carbs_g: DECIMAL(7,2)
├── fat_g: DECIMAL(7,2)
├── fiber_g: DECIMAL(7,2) NULL
├── sodium_mg: DECIMAL(7,2) NULL
├── is_custom: BOOLEAN DEFAULT FALSE ← criado pelo usuário
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

food_stock
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── food_id: UUID (FK → foods)
├── quantity_g: DECIMAL(9,2)         ← quantidade atual em gramas
├── expiry_date: DATE NULL
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── is_deleted: BOOLEAN DEFAULT FALSE

meal_logs
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── meal_type: ENUM('breakfast','lunch','snack','dinner','pre_workout','post_workout')
├── logged_at: TIMESTAMPTZ
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── is_deleted: BOOLEAN DEFAULT FALSE

meal_log_items
├── id: UUID (PK)
├── meal_log_id: UUID (FK → meal_logs)
├── food_id: UUID (FK → foods)
├── quantity_g: DECIMAL(7,2)         ← pesado na balança de cozinha
├── auto_deducted_from_stock: BOOLEAN DEFAULT FALSE
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

exercises
├── id: UUID (PK)
├── name: VARCHAR
├── muscle_group: VARCHAR            ← 'chest','back','legs',...
├── equipment: VARCHAR NULL
├── is_custom: BOOLEAN DEFAULT FALSE
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

workout_sessions
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── started_at: TIMESTAMPTZ
├── finished_at: TIMESTAMPTZ NULL
├── notes: TEXT NULL
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── is_deleted: BOOLEAN DEFAULT FALSE

workout_sets
├── id: UUID (PK)
├── session_id: UUID (FK → workout_sessions)
├── exercise_id: UUID (FK → exercises)
├── set_order: SMALLINT
├── reps: SMALLINT
├── weight_kg: DECIMAL(5,2) NULL
├── rpe: SMALLINT NULL               ← Rate of Perceived Exertion (1-10)
├── rest_seconds: SMALLINT NULL
├── notes: VARCHAR NULL
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── is_deleted: BOOLEAN DEFAULT FALSE

water_intake
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── amount_ml: INTEGER
├── logged_at: TIMESTAMPTZ
├── synced_to_healthkit: BOOLEAN DEFAULT FALSE
├── created_at: TIMESTAMPTZ
└── is_deleted: BOOLEAN DEFAULT FALSE

sync_log                              ← Controle de sincronização
├── id: BIGSERIAL (PK)
├── user_id: UUID (FK → users)
├── device_id: VARCHAR                ← identificador do dispositivo
├── direction: ENUM('push','pull')
├── table_name: VARCHAR
├── records_count: INTEGER
├── last_pulled_at: TIMESTAMPTZ       ← marca d'água do último pull
├── status: ENUM('success','partial','failed')
├── error_detail: TEXT NULL
└── synced_at: TIMESTAMPTZ DEFAULT NOW()

## Estratégia de Sincronização (Sync Engine)
Recomendação: WatermelonDB + Sync Protocol customizado
WatermelonDB é a escolha certa aqui pelos seguintes motivos: ele roda sobre SQLite, já implementa o modelo de "lazy loading" e observables (reatividade para UI), e — crucialmente — tem um protocolo de sync documentado que define exatamente o contrato entre client e server.
Como funciona na prática:
O protocolo WatermelonDB sync é baseado em timestamps (não em CRDTs ou event sourcing). É simples e funciona assim:

PULL (mobile ← server):
  1. Mobile envia: GET /api/sync/pull?last_pulled_at=2025-01-15T10:30:00Z
  2. Server responde com todos os registros criados/alterados/deletados DEPOIS desse timestamp
  3. Response format:
     {
       "changes": {
         "body_records": {
           "created": [...],
           "updated": [...],
           "deleted": ["uuid1", "uuid2"]
         },
         "meal_logs": { ... },
         ...
       },
       "timestamp": 1705312200  ← novo last_pulled_at
     }

PUSH (mobile → server):
  1. Mobile envia: POST /api/sync/push
  2. Body contém todas as mudanças locais pendentes no mesmo formato
  3. Server aplica as mudanças e responde com sucesso/conflitos

Resolução de conflitos — Last-Write-Wins com merge granular:
Para um MVP de uso pessoal/pequena escala, LWW (Last-Write-Wins) por campo é suficiente. O fluxo é:

Cada registro tem updated_at no server e no client.
No PUSH, se o server tem uma versão mais recente do mesmo UUID, ele compara campo a campo.
Campos que mudaram apenas no client: aceita a mudança do client.
Campos que mudaram apenas no server: mantém o server.
Campos que mudaram em ambos: o mais recente vence (daí o "last-write-wins").
Se houver conflito irreconciliável, o server retorna o conflito e o client resolve na próxima sync.

Passos de setup (em ordem):

Provisionar VPS — Ubuntu 24.04, mínimo 4GB RAM, 2 vCPUs
DNS no Cloudflare — Apontar api.unio.com.br para o IP da VPS (proxy mode ON)
Hardening básico — ufw allow 22,80,443, fail2ban, disable root SSH, criar user deploy
Instalar Docker + Docker Compose — via repositório oficial
Clonar repo, configurar .env — com secrets de produção
Gerar certificado SSL — primeiro deploy com Nginx servindo HTTP, rodar certbot, depois habilitar HTTPS
docker compose -f docker-compose.prod.yml up -d
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
Configurar backup automático do Postgres — cron job com pg_dump diário para um storage externo

Consideração sobre Cloudflare:
Como o Cloudflare já faz terminação SSL e proxy, você pode usar o modo Full (Strict) no Cloudflare e o Certbot no servidor para end-to-end encryption. Alternativamente, use Origin Certificates do Cloudflare para simplificar.