# Frontend 1 — Core / Auth / App Shell

Ownership: authentication, onboarding, shared UI, routing shell, global styles and app bootstrap.

This folder contains the original source files assigned to Frontend 1. Files were copied without rewriting their contents.

## Local setup
1. Copy `.env.example` to `.env` and fill in your Supabase values.
2. `npm install`
3. `npm run dev`

## Integration
Frontend 2 owns the dashboard feature modules. When integrating into the final application, bring Frontend 2's module files into `src/components/modules/` and its feature route files into `src/routes/`.
