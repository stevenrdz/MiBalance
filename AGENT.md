# AGENT.md - Guía de contribución MiBalance EC

## 1. Objetivo del proyecto

Mantener y extender el MVP de `MiBalance EC` (PangoTech) usando:

- `Next.js App Router + TypeScript`
- `Tailwind CSS`
- `Supabase (Auth + Postgres + Storage)`

Contexto fijo:

- País: Ecuador
- Moneda: `USD`
- Timezone: `America/Guayaquil`
- Idioma de UI: Español

## 2. Reglas técnicas obligatorias

- No usar Firebase.
- No guardar tokens manualmente en `localStorage`.
- Usar clientes Supabase SSR:
  - `lib/supabase/server.ts`
  - `lib/supabase/browser.ts`
  - `middleware.ts` para proteger rutas.
- Mantener RLS activo en todas las tablas.
- No usar SQL concatenado en strings desde la app.

## 3. Convenciones de código

- TypeScript estricto (`strict: true`).
- Validar inputs con Zod (`lib/schemas`).
- Formularios con React Hook Form.
- Separar responsabilidades:
  - UI: `components/*`
  - Acceso a datos: `lib/data/*`
  - Endpoints: `app/api/*`
  - SQL: `supabase/*`
- OCR de comprobantes:
  - Endpoint server-side en `app/api/ocr/receipt/route.ts`
  - Lógica de extracción en `lib/ocr/server.ts` con fallback a parser local.
- Configuración Supabase en Docker local:
  - Browser/client: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - SSR/server container: `SUPABASE_INTERNAL_URL=http://host.docker.internal:54321`
- Formato de fecha mostrado: `dd/mm/yyyy`.
- Valores monetarios siempre en USD.

## 4. Convenciones de commits

Formato recomendado (Conventional Commits):

- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `docs: ...`
- `chore: ...`

Ejemplos:

- `feat: add debt payment flow`
- `fix: enforce card_id on card transactions`
- `docs: update local docker setup`

## 5. Flujo de validación antes de merge

Ejecutar:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`
4. Validación manual básica:
   - login/register/forgot/reset
   - CRUD transacciones
   - CRUD categorías
   - CRUD tarjetas + pagos
   - CRUD deudas + pagos
   - Dashboard con filtros y gráficas

## 6. Cómo agregar un nuevo módulo

1. Definir alcance de negocio y entidad SQL.
2. Actualizar:
   - `supabase/schema.sql`
   - migración en `supabase/migrations/`
   - `supabase/seed.sql` (si aplica)
3. Crear schema Zod en `lib/schemas`.
4. Crear endpoints `app/api/...`.
5. Crear queries en `lib/data/queries.ts` o módulo dedicado.
6. Crear UI en `app/(protected)/...` y `components/...`.
   - En tablas de listado, priorizar acciones con iconos y `aria-label` (editar/eliminar) para mantener densidad visual.
7. Aplicar RLS/policies para la nueva tabla.
8. Actualizar `README.md`.

## 7. Pendientes / Future Work

- Presupuestos mensuales por categoría.
- Alertas de corte/pago de tarjetas.
- Importación CSV bancos.
- OCR avanzado de comprobantes (mejorar precisión y extraer ítems).
- PWA offline.
- Estabilizar pruebas E2E con Playwright (flujo de login en entorno containerizado).
- Internacionalización multi-país (si se decide expandir fuera de Ecuador).
