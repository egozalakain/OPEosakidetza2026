# OPEosakidetza2026

Proyecto personal de Egoitz para preparar la OPE de Osakidetza 2026 (no es Ideiatek).

## Estructura del repo (importante)
- Repo activo = la raíz. Tiene `origin` (github.com/egozalakain/OPEosakidetza2026) y trackea `ope-quiz/`. Commit/push SIEMPRE desde aquí.
- `ope-quiz/.git` es un repo anidado ABANDONADO (sin remoto, historia obsoleta). No commitear ahí.
- `ope-quiz/` = app web (Next.js 16 + Turbopack, Drizzle/Neon, next-auth). Baterías en `ope-quiz/data/questions.json`; PDFs de exámenes/baterías y temario en la raíz.

## App (`ope-quiz/`)
- Test `npm test` (vitest + jsdom + RTL) · Lint `npm run lint` · Build `npm run build`.
- Tests de componente: mockear `next/navigation` (useRouter) y `fetch` global (ej. `src/__tests__/components/exam-config-form.test.tsx`).
- `next build` (Turbopack) NO falla por errores de ESLint (hay uno pre-existente en `theme-toggle.tsx` que no bloquea).
- Deploy: `cd ope-quiz && npx vercel --prod` (CLI, NO por git push). Proyecto enlazado en `ope-quiz/.vercel`; requiere `vercel login` (el token del CLI caduca; el "no expira" del dashboard es del navegador y no sirve para el CLI).

## PDFs / Python
- Disponibles `pymupdf` (fitz), `PyPDF2`, `pdftotext`. En Python sobre Windows usa rutas con unidad (`C:/Users/...`), no estilo MSYS (`/c/Users/...`).
- Validación examen↔batería: ver `validacion-orden/` (scripts en `scripts/`, conclusiones en `resultados/RESULTADOS.md`).
