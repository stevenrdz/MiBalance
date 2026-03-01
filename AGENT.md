# AGENT.md - Guia operativa MiBalance EC

## 1. Objetivo

Mantener y extender `MiBalance EC` como app de finanzas personales para Ecuador con:

- `Next.js App Router + TypeScript`
- `Tailwind CSS`
- `Supabase (Auth + Postgres + Storage)`

Contexto fijo:

- Pais: Ecuador
- Moneda: `USD`
- Zona horaria: `America/Guayaquil`
- Idioma UI: Espanol

## 2. Reglas tecnicas

- No usar Firebase.
- No guardar tokens manualmente en `localStorage`.
- Mantener SSR auth con:
  - `lib/supabase/server.ts`
  - `lib/supabase/browser.ts`
  - `middleware.ts`
- Mantener RLS activo en todas las tablas.
- Validar entradas con Zod.
- No construir SQL manual en strings desde la app.
- Los adjuntos viven en Supabase Storage, bucket `attachments`.

## 3. Modulos activos

- Auth: login, register, forgot, reset.
- Dashboard: resumen, filtros y graficas.
- Transacciones: CRUD, adjuntos y OCR de comprobantes.
- Tarjetas:
  - CRUD
  - activacion/desactivacion
  - eliminacion logica
  - pago minimo actual
  - fecha maxima de pago
- Deudas:
  - prestamos, avances y diferidos
  - pagos
  - documentos asociados
  - letras persistidas (`debt_installments`)
  - onboarding de prestamo desde documento
  - activacion/desactivacion separada de eliminacion logica
  - filtro por estado (`todas`, `activas`, `inactivas`)
- Toasts:
  - proveedor global en `components/ui/toast.tsx`
  - usar para exito, error y avisos operativos

## 4. Convenciones de codigo

- `strict: true`
- Formularios con React Hook Form + Zod.
- Separacion de responsabilidades:
  - UI: `components/*`
  - Datos/queries: `lib/data/*`
  - OCR/parsers: `lib/ocr/*`
  - API routes: `app/api/*`
  - SQL/migraciones: `supabase/*`
- Valores monetarios siempre en USD.
- Fecha visible al usuario en formato `dd/MM/yyyy`.
- Cuando una deuda tenga letras reales, priorizar `debt_installments` sobre calculos temporales.
- En onboarding de deudas:
  - `Vence` es fecha programada de la letra
  - `Fecha pagada` solo debe existir si la letra esta marcada como pagada
  - no precargar fecha de pago en cuotas pendientes

## 5. Politica de raiz del repo

- No dejar artefactos generados en la raiz:
  - `.next/`
  - `test-results/`
  - `playwright-report/`
- No dejar plantillas externas o backups de dashboards en la raiz.
- No versionar muestras pesadas o documentos personales en la raiz.
- Si hace falta trabajar con PDFs o capturas locales, usar carpetas ignoradas por Git y documentar su uso en `README.md`.

## 6. Flujo para nuevas funcionalidades

1. Definir impacto de negocio.
2. Ajustar esquema en `supabase/schema.sql`.
3. Crear migracion en `supabase/migrations/`.
4. Ajustar schemas Zod en `lib/schemas/domain.ts`.
5. Implementar endpoints `app/api/...`.
6. Conectar queries en `lib/data/queries.ts`.
7. Implementar UX en `app/(protected)` y `components/forms`.
8. Actualizar `README.md`.

## 7. Validacion minima antes de cerrar cambios

Ejecutar dentro del entorno del proyecto:

1. `npm run build`
2. Validacion manual basica:
   - auth
   - tarjetas
   - deudas
   - onboarding de prestamo
   - carga de documentos y letras
   - estados de deuda (activar, desactivar, eliminar)
   - filtro de deudas por estado

## 8. Pendientes conocidos

- Mejorar OCR/parsing de tablas de amortizacion PDF escaneadas.
- Permitir preview/descarga de documentos y comprobantes.
- Extender onboarding guiado a avances en efectivo y diferidos.
- Consolidar agenda global de pagos y vencimientos.
- Seguir endureciendo el entorno `next dev` en Docker/Windows si reaparecen errores de `.next`.
