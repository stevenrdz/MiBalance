# MiBalance (Vue + Firebase + GitHub Pages)

Dashboard personal para registrar gastos, presupuestos y recordatorios. El flujo es:
1) Login con Google
2) Dashboard con barra lateral y secciones de gastos

## Requisitos
- Node.js 20+
- Cuenta de Firebase

## Configuracion de Firebase
1. Crea un proyecto en Firebase.
2. Habilita **Authentication -> Google**.
3. Crea **Firestore Database** en modo test o production.
4. Copia las credenciales web y crea un archivo `.env` basado en `.env.example`.
5. Agrega tu dominio de GitHub Pages en **Authentication -> Settings -> Authorized domains**.

## Desarrollo local
```bash
npm install
npm run dev
```

## Variables de entorno
Estas variables se usan en build y runtime:
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## GitHub Pages (Actions)
1. Ve a **Settings -> Pages** y elige **GitHub Actions**.
2. Agrega secrets en GitHub con los mismos nombres de las variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Haz push a `main` y espera el deploy.

URL esperada:
`https://stevenrdz.github.io/MiBalance`

## Pruebas unitarias
```bash
npm test
npm run test:coverage
```

## SonarQube (buenas practicas)
- Configuracion base en `sonar-project.properties`
- Cobertura generada en `coverage/lcov.info`
- Excluye `dist/`, `node_modules/` y `coverage/`

## Docker (preview local)
Build (con variables):
```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=... \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... \
  -t mibalance .
```

Run:
```bash
docker run --rm -p 8080:80 mibalance
```
Luego abre `http://localhost:8080`.

## Notas
- `vite.config.js` usa `base: './'` para GitHub Pages.
- Los datos viven en Firestore bajo `users/{uid}/...`.
