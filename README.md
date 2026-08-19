# Hazento

Prototipo funcional del frontend de Hazento para validar navegación, objetos y flujos principales antes de conectar datos de producción.

## Ejecutar localmente

```bash
npm install
npm run dev
```

La aplicación parte en modo demo con un workspace de Salud. En **Configuración → Negocio** se puede cambiar temporalmente entre Salud, Diseñador, Influencer, Profesor y Otras actividades. El cambio adapta exclusivamente el lenguaje visible; no migra ni modifica los datos existentes.

## Persistencia temporal

Durante la validación de producto, el frontend usa una arquitectura intencionalmente temporal:

```text
Pantallas React → repositorios (`src/repositories.ts`) → DemoStore → localStorage
```

Los componentes no leen ni escriben `localStorage`. La capa de repositorios calcula estados derivados —por ejemplo, el saldo y estado de pago desde `paymentAllocations`— y concentra las operaciones de cada objeto. `DemoStore` sólo persiste el escenario local bajo una clave versionada.

En la futura integración se reemplazará el adaptador interno por repositorios Supabase:

```text
Pantallas React → mismos contratos de repositorio → Supabase → PostgreSQL
```

Puntos de reemplazo pendientes para esa iteración: carga inicial, suscripciones a cambios, manejo de errores de red, identidad del workspace, Auth y políticas RLS por usuario. Ninguno se simula ni se debilita en esta etapa.

## Planificación por vertical

La planificación separa dos vistas derivadas, sin crear entidades nuevas:

```text
Calendario = Prestations + Activities
Cronograma = Engagements + Prestations como hitos
```

- Salud y Profesor usan **Agenda**, únicamente con Calendario.
- Diseñador, Influencer y Otras actividades usan **Planificación**, con Calendario y Cronograma.
- Los Engagements nunca se repiten como eventos del Calendario.
- `Prestation.date` sigue siendo la única fecha programada o de entrega en el adaptador demo.
- `Activity` usa `scheduledAt ?? completedAt ?? createdAt` según corresponda.
- `Engagement.startDate` y `Engagement.endDate` son opcionales y alimentan exclusivamente el Cronograma.

`startDate` y `endDate` son campos temporales del modelo frontend/DemoStore. Cuando se reemplace el repositorio demo, deberán mapearse a `engagements.start_date` y `engagements.end_date`, que ya existen en el esquema objetivo de Supabase. Esta iteración no modifica PostgreSQL.

## Supabase

El esquema existente se conserva en `supabase/migrations/001_initial_schema.sql`. El frontend no modifica la base de datos y usa datos demo separados en `src/data.ts`. `supabase/seed.sql` contiene un escenario PostgreSQL idempotente y sin credenciales para inspeccionar el modelo manualmente; no es la fuente de datos del frontend.

Para habilitar el cliente público de Supabase, copiar `.env.example` a `.env.local` y configurar:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Nunca usar una `service_role` o secret key en variables `VITE_*`.
