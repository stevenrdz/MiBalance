# AGENTS

## Proyecto

- Nombre: `MiBalance EC`
- Stack: `Next.js App Router`, `TypeScript`, `Tailwind CSS`, `Supabase`
- Moneda: `USD`
- Zona horaria: `America/Guayaquil`
- Idioma de UI y APIs: `espanol`

## Objetivo actual

- Mantener una app de finanzas personales para Ecuador con foco en:
  - transacciones con OCR de comprobantes,
  - tarjetas con pagos y estados,
  - deudas con onboarding desde documento, cronograma, documentos y pagos.

## Flujo de deuda

- `/debts/new` usa flujo `scan-first`:
  - primero se sube el documento,
  - luego se escanea para autocompletar,
  - despues se confirman datos base y cuotas.
- `/debts/[id]` tiene enfoque movil:
  - resumen compacto arriba,
  - secciones plegables para editar, acciones, cronograma, documentos y pagos,
  - tablas paginadas de 10 en 10.

## Reglas de trabajo

- Mantener textos de UI, validacion y respuestas API en espanol.
- No exponer `error.message` crudo al usuario desde rutas API.
- Preservar compatibilidad con Server Components cuando se toquen tablas o vistas `app/`.
- Antes de cambiar flujos de deudas, revisar:
  - `app/(protected)/debts/new/page.tsx`
  - `components/forms/debt-onboarding-form.tsx`
  - `app/(protected)/debts/[id]/page.tsx`
  - `components/ui/data-table.tsx`

## Validacion esperada

- Build: `npm run build`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- E2E: `npm run e2e`

## Entorno local

- Desarrollo web: `npm run dev`
- Docker local: `docker-compose up -d`
- Reinicio rapido de app: `powershell -ExecutionPolicy Bypass -File .\scripts\restart-app.ps1`
- Supabase local:
  - iniciar: `powershell -ExecutionPolicy Bypass -File .\scripts\supabase-start.ps1`
  - detener: `powershell -ExecutionPolicy Bypass -File .\scripts\supabase-stop.ps1`
  - reset DB: `powershell -ExecutionPolicy Bypass -File .\scripts\db-reset.ps1`

## Git

- Rama principal: `main`
- Remotos activos:
  - `origin` -> GitHub
  - `bitbucket` -> Bitbucket
- Cuando el usuario pida publicar cambios, empujar a ambos remotos salvo que indique lo contrario.
