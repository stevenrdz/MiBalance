# MiBalance EC (MVP) - PangoTech

App web de finanzas personales enfocada en Ecuador.

- Moneda: `USD`
- Zona horaria: `America/Guayaquil`
- Idioma: Español
- Stack: `Next.js App Router + TypeScript + Tailwind + Supabase (Auth + Postgres + Storage)`

## 1. Funcionalidades del MVP

- Auth: `login/register/forgot/reset` con Supabase Auth.
- Dashboard:
  - Resumen mensual (ingresos, egresos, balance, por pagar tarjetas, deuda total).
  - Gráficas (Recharts): egresos por categoría + tendencia.
  - Filtros por rango, tipo, categoría y método de pago.
- Transacciones:
  - CRUD de ingresos/egresos.
  - Adjuntos `jpg/png/pdf` (máx `5MB` por archivo) con Supabase Storage.
  - Búsqueda, filtros y paginación.
- Categorías:
  - CRUD por tipo (`INCOME/EXPENSE`) y activación/desactivación.
  - Seed/base automática para usuarios nuevos.
- Tarjetas:
  - CRUD.
  - Ciclo actual con consumos, pagos y por pagar.
- Deudas:
  - CRUD (`LOAN`, `CASH_ADVANCE`).
  - Pagos y cálculo de saldo.
- Seguridad:
  - SSR auth con cookies (Supabase SSR helpers).
  - RLS en todas las tablas y bucket.

## 2. Estructura principal

```txt
app/
  (auth)/auth/login|register|forgot|reset
  (protected)/dashboard
  (protected)/transactions, /transactions/new, /transactions/[id]/edit
  (protected)/cards, /cards/new, /cards/[id]
  (protected)/debts, /debts/new, /debts/[id]
  (protected)/settings/profile, /settings/categories
  api/*
components/
lib/
supabase/
  schema.sql
  seed.sql
  migrations/202602220001_init_schema.sql
docker-compose.yml
```

## 3. Prerrequisitos

- Docker Desktop (Linux containers).
- Node.js 22+ (solo si quieres ejecutar comandos npm en host).
- Git.

## 4. Variables de entorno

Crea `.env.local` desde `.env.example`:

```bash
cp .env.example .env.local
```

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (opcional en este MVP, reservado para tareas administrativas futuras)
- `NEXT_PUBLIC_APP_URL` (por defecto: `http://localhost:3000`)

## 5. Levantar local con Docker (E2E)

### Paso A. Levantar Supabase local

```bash
docker compose run --rm supabase-cli supabase start
```

Obtén claves/URL locales:

```bash
docker compose run --rm supabase-cli supabase status -o env
```

Copia esos valores a `.env.local`.

### Paso B. Aplicar schema + seed local

```bash
npm run db:reset
```

Este comando usa `supabase/migrations` y `supabase/seed.sql`.

### Paso C. Levantar app Next.js en Docker

```bash
docker compose up app
```

Accede en `http://localhost:3000`.

### Paso D. Detener Supabase local

```bash
docker compose run --rm supabase-cli supabase stop
```

## 6. Scripts npm

- `npm run dev`: Next.js dev.
- `npm run lint`: ESLint.
- `npm run typecheck`: TypeScript.
- `npm run db:reset`: reset DB local Supabase (migraciones + seed).
- `npm run supabase:start`: levanta Supabase local desde contenedor CLI.
- `npm run supabase:stop`: detiene Supabase local.

## 7. Base de datos y seguridad

Archivo principal: `supabase/schema.sql`

Incluye:

- Tablas:
  - `profiles`
  - `categories`
  - `transactions`
  - `attachments`
  - `cards`
  - `card_payments`
  - `debts`
  - `debt_payments`
- Constraints (monto > 0, días 1..31, currency USD, etc.).
- Índices por `user_id`, `date`, `type`, `category_id`, etc.
- Trigger `updated_at`.
- Trigger `auth.users -> profiles + categorías base`.
- RLS + policies por `auth.uid()`.
- Bucket `attachments` + policies de storage por carpeta `auth.uid()`.

## 8. Deploy en Supabase remoto

### Opción recomendada con CLI

1. Login y link:

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

2. Push de migraciones:

```bash
supabase db push
```

3. Ejecutar seed (si aplica):

```bash
supabase db reset --linked
```

### Opción manual

1. Ejecuta `supabase/schema.sql` en SQL Editor.
2. Ejecuta `supabase/seed.sql`.
3. Verifica bucket `attachments` y políticas en Storage.

### Auth Redirect URLs (obligatorio)

En Supabase Auth URL Configuration agrega:

- Local:
  - `http://localhost:3000/auth/reset`
  - `http://127.0.0.1:3000/auth/reset`
- Producción:
  - `https://TU_DOMINIO/auth/reset`

## 9. Deploy frontend (Vercel recomendado)

1. Importa el repo en Vercel.
2. Define variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL=https://TU_DOMINIO`
3. Deploy.
4. Verifica flujo auth + rutas protegidas (`/dashboard`, `/transactions`, etc.).

## 10. Troubleshooting

- Error `npm.ps1 execution policy` en Windows:
  - usa `cmd /c npm <comando>` o habilita scripts en PowerShell.
- `supabase start` no levanta:
  - verifica Docker Desktop activo y permisos del socket.
- `No autorizado` en API:
  - revisa sesión activa y cookies.
- Adjuntos fallan:
  - verifica tamaño/MIME y policies del bucket `attachments`.
- Link de reset no funciona:
  - revisa Redirect URLs exactas en Supabase Auth.

## 11. Estado de pruebas

Validado en este repo:

- `npm run typecheck` OK
- `npm run lint` OK

No se incluyó suite e2e automatizada (Playwright queda como extensión futura).

