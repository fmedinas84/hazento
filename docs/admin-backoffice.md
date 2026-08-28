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

### Carga y cache de recursos

El Admin solicita recursos independientes (`dashboard`, `users`, `subscriptions`, `system` y `user-detail`) en vez de reconstruir un dataset global para cada pantalla. Dashboard, Usuarios y Suscripciones consumen `admin_workspace_usage`, una función SQL agregada de solo lectura accesible únicamente por `service_role`; la identidad y autorización administrativa se siguen validando en cada request server-side.

El navegador mantiene un cache exclusivamente en memoria y dentro de la sesión administrativa. Cada recurso tiene un stale time centralizado (60 segundos para Dashboard, Usuarios, Suscripciones y fichas; 45 segundos para Sistema). Una visita posterior muestra inmediatamente los datos disponibles y revalida en segundo plano. Las solicitudes simultáneas con la misma clave se deduplican. Al cerrar sesión se abortan solicitudes pendientes y se elimina todo el cache.

El endpoint expone métricas no sensibles mediante `Server-Timing`, `X-Admin-Query-Count` y `X-Admin-Payload-Bytes`. En Preview registra un resumen por recurso; en Production solo registra requests excepcionalmente lentas.

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
- Los KPI de usuarios y el funnel deduplican por `user_id`; una persona con membresías en más de un workspace se cuenta una sola vez. Plus continúa midiéndose por workspace.
- Funnel: usuario registrado → primer cliente → primera prestación → primer pago real no anulado. Cada etapa muestra porcentaje sobre registrados y conversión desde la etapa anterior.
- Comparaciones mensuales: si el período anterior contiene cero registros no se calcula un porcentaje artificial; se muestran ambos valores y el tramo comparable.
- Requieren atención: usuarios sin primer cliente, sin actividad operacional por más de 30 días, suscripciones `payment_failed` y recordatorios `failed`. Solo aparecen señales con valor mayor que cero.
- Usuarios recientes: últimas cinco altas de Auth, con metadata mínima de plan, fecha, actividad y adopción.

El gráfico de crecimiento muestra nuevos usuarios por mes durante los últimos seis meses. Se implementó con HTML/CSS accesible y se retiró Recharts: para una única serie de barras, la dependencia agregaba complejidad y peso de bundle sin aportar interacción necesaria. Los valores siguen disponibles como texto y `title` para no depender solo de la altura visual.

## Estado derivado de usuario

Los umbrales están centralizados en `apps/admin/api/admin.ts`:

- Nuevo: alta en los últimos 14 días y hasta dos eventos operacionales recientes.
- Muy activo: actividad en los últimos 3 días y al menos diez eventos en 30 días.
- Activo: actividad en los últimos 14 días.
- En riesgo: última actividad entre 15 y 45 días.
- Inactivo: más de 45 días o sin actividad operacional.

## Sistema y limitaciones

Se muestran fallos persistidos en suscripciones y recordatorios. Los estados de webhooks y entrega de emails figuran como `No disponible` porque el schema aún no tiene un registro global confiable para esos eventos. No se inventan métricas.

Los agregados operacionales se calculan en PostgreSQL y el endpoint ya no descarga las tablas completas para cada navegación. La lista de usuarios todavía obtiene identidad y último login mediante Auth Admin API; antes de gran escala conviene agregar paginación server-side y filtros remotos.

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
