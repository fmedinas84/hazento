# Hazento Admin — V1

## Alcance

Hazento Admin es una aplicación separada y de solo lectura para observar adopción, uso, suscripciones y señales operacionales. No expone notas, seguimientos clínicos ni contenido detallado de prestaciones.

La aplicación vive en `apps/admin` y no cambia el build ni las rutas de la app principal.

## Arquitectura y seguridad

```text
Admin browser
  → Supabase Auth (publishable key)
  → /api/admin + access token
  → auth.getUser(token)
  → admin_users
  → consultas globales server-side
```

- El navegador recibe exclusivamente `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- La clave secreta/service role existe únicamente en la función server-side.
- La función vuelve a verificar la identidad con `auth.getUser(token)` y luego exige una fila en `admin_users`.
- `admin_users` y `admin_audit_log` tienen RLS habilitado, cero policies públicas y cero grants para `anon`/`authenticated`.
- El endpoint solo admite `GET`; la V1 no expone mutaciones operacionales.
- El service role tiene privilegios mínimos: `SELECT` en `admin_users` y `SELECT, INSERT` en `admin_audit_log`.

Agregar un administrador es una operación deliberada de infraestructura, no una función de la UI:

```sql
insert into public.admin_users (user_id, role)
values ('<auth-user-uuid>', 'super_admin');
```

## Auditoría

Se registran metadatos mínimos para:

- `admin_login`
- `user_viewed`, con el workspace consultado

No se registran notas, textos clínicos ni payloads operacionales.

## Métricas

- Usuarios: perfiles/membresías y fechas de `auth.users` obtenidas server-side.
- Plus: suscripción `plus` con estado `active` o `paused`, siempre a nivel workspace.
- Variaciones mensuales: día 1 hasta hoy frente al mismo tramo del mes anterior, calculado en `America/Santiago` para evitar cortes incorrectos por UTC.
- Último login: `auth.users.last_sign_in_at`, mediante Auth Admin API server-side.
- Última actividad: máximo `created_at`/`updated_at` de people, prestaciones, oportunidades, engagements, actividades, solicitudes y pagos del workspace.
- Usuarios activos: última actividad operacional dentro de 7 o 30 días. No es tracking de clics.
- Funnel: workspace/usuario registrado → primer cliente → primera prestación → primer pago real no anulado.

## Estado derivado de usuario

Los umbrales están centralizados en `apps/admin/api/admin.ts`:

- Nuevo: alta en los últimos 14 días y hasta dos eventos operacionales recientes.
- Muy activo: actividad en los últimos 3 días y al menos diez eventos en 30 días.
- Activo: actividad en los últimos 14 días.
- En riesgo: última actividad entre 15 y 45 días.
- Inactivo: más de 45 días o sin actividad operacional.

## Sistema y limitaciones

Se muestran fallos persistidos en suscripciones y recordatorios. Los estados de webhooks y entrega de emails figuran como `No disponible` porque el schema aún no tiene un registro global confiable para esos eventos. No se inventan métricas.

La lectura global pagina las tablas en bloques de 1.000 filas. Es suficiente para V1; antes de gran escala conviene mover agregados a un schema privado/RPC administrativo con consultas SQL agregadas y paginar la tabla de usuarios desde servidor.

## Vercel Admin

- Proyecto sugerido: `hazento-admin`
- Root Directory: `apps/admin`
- Build Command: `npm run build`
- Output Directory: `dist`

Variables públicas:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Variables solo servidor:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` se acepta temporalmente como nombre compatible si el proyecto aún usa la clave JWT legacy, pero nunca debe llevar prefijo `VITE_`. Para Preview se deben usar URL, publishable key y secret key del proyecto staging. Production se configurará más adelante con el proyecto productivo.
