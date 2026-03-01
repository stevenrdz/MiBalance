# MiBalance EC

Aplicacion web de finanzas personales para Ecuador.

- Moneda: `USD`
- Zona horaria: `America/Guayaquil`
- Idioma: Espanol
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
  - onboarding guiado para prestamos desde documento
- Toasts globales para mensajes de exito y error.

## Flujo nuevo de prestamos

Ruta: `/debts/new`

Si el usuario selecciona `Prestamo`:

1. Sube primero el documento.
2. El sistema intenta analizarlo.
3. Si el archivo no parece ser de prestamo, muestra toast de error.
4. Si el archivo es valido, autorrellena campos base cuando detecta datos.
5. Muestra las letras detectadas o generadas.
6. El usuario puede marcar cuales ya fueron pagadas.
7. Las letras vencidas se determinan por fecha.

Notas:

- El parser actual es heuristico. Funciona mejor con tablas de amortizacion legibles.
- Para PDFs escaneados complejos todavia puede requerir ajuste manual.

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
- flujo de tarjetas con activacion/desactivacion y nuevos campos
- onboarding de prestamos con documento, letras y estados

## Pendientes

- OCR mas robusto para tablas de amortizacion escaneadas.
- Preview y descarga de documentos/comprobantes.
- Extender el onboarding a avances y diferidos.
- Agenda unificada de pagos, minimos y vencimientos.
