# MiBalance (Vue + Firebase + GitHub Pages)

Dashboard personal para registrar ingresos, gastos, préstamos, deudas, presupuestos y recordatorios. Pensado para publicarse en GitHub Pages sin backend propio.

## Requisitos
- Node.js 18+
- Cuenta de Firebase

## Configuración de Firebase
1. Crea un proyecto en Firebase.
2. Habilita **Authentication → Google**.
3. Crea una base **Firestore** en modo producción o prueba.
4. Copia tus credenciales web y crea un archivo `.env` basado en `.env.example`.

## Desarrollo local
```bash
npm install
npm run dev
```

## Publicar en GitHub Pages
1. Construye el proyecto:
   ```bash
   npm run build
   ```
2. Sube el contenido de `dist/` a la rama `gh-pages` o configura Pages para usar `dist/` desde una acción.
3. En Firebase, agrega tu URL de GitHub Pages en **Authentication → Settings → Authorized domains**.

## Notas
- El proyecto usa `base: './'` en `vite.config.js` para que funcione en subcarpetas de GitHub Pages.
- Los datos quedan en Firestore bajo `users/{uid}/...`.
