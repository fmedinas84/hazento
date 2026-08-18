# Hazento

Prototipo funcional del frontend de Hazento para validar navegación, objetos y flujos principales antes de conectar datos de producción.

## Ejecutar localmente

```bash
npm install
npm run dev
```

La aplicación parte en modo demo con un workspace de Salud. En **Configuración → Negocio** se puede cambiar temporalmente entre Salud, Profesional creativo y Creador de contenido para validar las etiquetas.

## Supabase

El esquema existente se conserva en `supabase/migrations/001_initial_schema.sql`. El frontend no modifica la base de datos y usa datos demo separados en `src/data.ts`.

Para habilitar el cliente público de Supabase, copiar `.env.example` a `.env.local` y configurar:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Nunca usar una `service_role` o secret key en variables `VITE_*`.
