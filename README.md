# MiBalance EC

Aplicacion web de finanzas personales para Ecuador.

- Moneda: `USD`
- Zona horaria: `America/Guayaquil`
- Idioma: `Espanol`
- Stack: `Next.js App Router + TypeScript + Tailwind + Supabase`

## Funcionalidades

- Auth con Supabase.
- Dashboard con resumen, filtros y graficas.
- Transacciones con adjuntos y OCR de comprobantes.
- Tarjetas:
  - CRUD
  - activacion y desactivacion
  - eliminacion logica
  - pago minimo actual
  - fecha maxima de pago
- Deudas:
  - prestamos
  - avances en efectivo
  - diferidos
  - pagos
  - documentos asociados
  - letras persistidas
  - onboarding scan-first desde documento
  - activacion, desactivacion y eliminacion logica
  - filtro por estado en listado
  - detalle responsive movil con secciones plegables
  - cronograma, documentos y pagos paginados de 10 en 10
- Toasts globales para mensajes de exito y error.

## Flujo nuevo de deudas

Ruta: `/debts/new`

1. El usuario sube primero el documento.
2. El sistema intenta analizarlo.
3. Si el archivo no parece corresponder a la deuda, muestra error.
4. Si el archivo es valido, autocompleta campos base cuando detecta datos.
5. Muestra las letras detectadas o generadas.
6. El usuario puede marcar cuales ya fueron pagadas.
7. Las letras vencidas se determinan por fecha.
8. `Fecha pagada` solo se llena si la cuota se marca como pagada.

Notas:

- El parser actual es heuristico. Funciona mejor con tablas de amortizacion legibles.
- Para PDFs escaneados complejos todavia puede requerir ajuste manual.

## UX de deudas

- `/debts/new` prioriza el escaneo antes del llenado manual.
- `/debts/[id]` usa un header compacto con resumen y estado.
- En movil, `Editar deuda`, `Acciones`, `Cronograma`, `Documentos` y `Pagos` se muestran como secciones plegables.
- Las tablas usan una version compacta para movil y mantienen la paginacion dentro del mismo componente visual.

## Estructura principal

```txt
app/
  (auth)/
  (protected)/
  api/
components/
lib/
  data/
  ocr/
supabase/
  schema.sql
  migrations/
scripts/
```

## Prerrequisitos

- Docker Desktop
- Node.js 22+
- Git

## Variables de entorno

Usa `.env.local` basado en `.env.example`.

Variables principales:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_INTERNAL_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `OPENAI_API_KEY` opcional
- `OPENAI_OCR_MODEL` opcional

## Desarrollo local

Levantar servicios:

```bash
docker-compose up -d
```

Aplicar migraciones locales:

```bash
docker-compose run --rm supabase-cli sh -lc "npx supabase@latest db push --local"
```

Build de validacion:

```bash
docker-compose exec app npm run build
```

Validaciones utiles:

```bash
npm run lint
npm run typecheck
npm run build
npm run e2e
```

Si `next dev` se corrompe y deja de abrir rutas como `/debts/new`, reinicia solo la app:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restart-app.ps1
```

Scripts de apoyo:

- iniciar Supabase local: `powershell -ExecutionPolicy Bypass -File .\scripts\supabase-start.ps1`
- detener Supabase local: `powershell -ExecutionPolicy Bypass -File .\scripts\supabase-stop.ps1`
- reset DB local: `powershell -ExecutionPolicy Bypass -File .\scripts\db-reset.ps1`

Notas del entorno Docker:

- `.next` usa un volumen dedicado del contenedor para reducir corrupcion del cache en Windows.
- `app` evita reinstalar dependencias en cada arranque si `node_modules` ya existe.

## Base de datos

Entidades principales:

- `profiles`
- `categories`
- `transactions`
- `attachments`
- `cards`
- `card_payments`
- `debts`
- `debt_payments`
- `debt_documents`
- `debt_installments`

## Limpieza de raiz

No deben quedarse en la raiz:

- `.next/`
- `test-results/`
- muestras pesadas o documentos personales
- plantillas externas o respaldos de dashboards

## Estado actual

Validado recientemente:

- migraciones locales aplicadas
- `docker-compose exec app npm run build` OK
- `npm run build` OK
- flujo de tarjetas con activacion/desactivacion y nuevos campos
- onboarding de deudas reordenado a flujo `scan-first`
- deudas con activar/desactivar separado de eliminar
- filtro de deudas por estado
- correccion de `Fecha pagada` en onboarding de letras
- preview y descarga de documentos y comprobantes
- vista de detalle de deudas compactada para movil con acordeones y tablas densas
- OCR de comprobantes para autocompletar transacciones
- tooling E2E con Playwright

## Pendientes

- OCR mas robusto para tablas de amortizacion escaneadas.
- Extender el onboarding a avances y diferidos.
- Agenda unificada de pagos, minimos y vencimientos.
