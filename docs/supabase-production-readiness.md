# Preparación del modelo Supabase de Hazento V1

## Alcance y estado

Esta iteración alinea el modelo funcional actual con PostgreSQL sin cambiar la persistencia de la aplicación.

```text
Estado actual
React → repositories → DemoStore/localStorage

Próxima etapa
React → repositories → Supabase

Etapa posterior
Supabase Auth → profiles → workspace_members → workspaces → RLS → repositories → PostgreSQL
```

El frontend continúa usando DemoStore. `src/persistence/contracts.ts` define contratos asíncronos, resultados tipados e idempotencia para que los adaptadores Supabase puedan agregarse sin introducir llamadas directas desde componentes.

## Comparación por dominio

| Dominio | Frontend actual | Supabase antes | Supabase después | Cambio realizado |
|---|---|---|---|---|
| Identidad | Perfil demo, sin Auth | `profiles` enlazada a `auth.users` | Sin cambios destructivos | Auth queda para la tercera etapa |
| Workspace | Negocio, vertical y dirección | Tres verticales, sin dirección | Cinco verticales y `address_line` | Alineado con configuración actual |
| Personas | People First; email único por workspace | `accounts` podía ser persona/empresa/marca | `accounts` se documenta como persona y suma nombre, organización, rol y email normalizado | Se conserva el nombre técnico para no romper FKs |
| Organizaciones | Entidad secundaria opcional | No existía | Nueva `organizations` | Relación compuesta por workspace desde persona |
| Contactos legacy | No domina la experiencia | `contacts` y `primary_contact_id` | Se conservan deprecados | Migración de datos previa a eliminación futura |
| Servicios | Catálogo compartido | `services` | Permanece | Ya soportaba precio/duración |
| Oportunidades | Una persona principal | Cuenta + contacto opcional | Relación principal sigue en `account_id`; contacto queda legacy | No se fuerza organización duplicada |
| Engagements | Tratamiento/proyecto/partnership/plan | Faltaba plan | Incluye `plan` | Un modelo común por vertical |
| Prestations | Estados por capacidad, seguimiento | Estados solo de cita; sin seguimiento | Estados compartidos ampliados y `follow_up_note` | Soporta atención, clase, entregable y contenido |
| Actividades | Seguimiento automático distinguible | Sin fuente | `source = prestation_follow_up` e índice único | Una actividad automática por prestación |
| Solicitudes de pago | Total, parcial, traslado, condonación | `payment_requests` + items | Permanece | El modelo ya preserva origen/sucesora |
| Pagos | Dinero recibido e inmutable | `payments` y anulación auditada | Permanece | No se confunde con solicitudes |
| Allocations | Pago hacia solicitud/prestación/documento | `payment_allocations` | Permanece | Integridad y validación existentes |
| Billing Hazento | Free/Plus por workspace | `subscriptions` | Permanece | El workspace recibe la capacidad |
| Recordatorios | Repository mock, dos slots | No existía | Nueva `appointment_reminders` | Preparado para scheduler/Resend server-side |

## People First

`accounts` permanece temporalmente como nombre técnico de la tabla de personas porque todos los objetos operativos ya la referencian. La representación es:

```text
accounts (PERSONA)
  └── organization_id nullable → organizations (EMPRESA)
```

La FK compuesta `(workspace_id, organization_id)` impide asociar una persona con una organización de otro workspace. La empresa se archiva; no se elimina mientras esté representada por personas. Los tipos legacy `company` y `brand` no se borran silenciosamente: deben migrarse a `organizations` en una tarea de datos antes de restringir `account_type` a `person`.

El índice único de `(workspace_id, normalized_email)` evita personas duplicadas dentro de un workspace y permite el mismo email en workspaces diferentes. El email nunca funciona como foreign key.

## Pagos y trazabilidad

```text
prestation / engagement
  → payment_requests
  → payments (dinero real)
  → payment_allocations
```

`parent_request_id` conserva el traslado de saldo; `waived_amount`, motivo, fecha y usuario conservan la condonación; los pagos recibidos se anulan con auditoría y no se editan ni eliminan. `documents` sigue siendo un dominio tributario futuro separado.

## RLS y onboarding futuro

Todas las tablas operacionales tienen `workspace_id`. Las tablas nuevas tienen RLS activo:

- miembros autenticados pueden leer y gestionar organizaciones de sus workspaces;
- recordatorios son legibles por miembros, pero sus campos de entrega se escriben únicamente desde backend/service role;
- el cliente anónimo no recibe privilegios;
- las suscripciones pagadas continúan siendo de lectura para miembros y escritura server-side.

La dependencia circular del primer workspace se resuelve con la función transaccional e idempotente `public.bootstrap_user_workspace`: valida `auth.uid()`, crea perfil, workspace y membresía owner. `create_workspace` fue retirado. Se conserva el `search_path` cerrado y el grant exclusivamente a `authenticated`; no se habilita INSERT libre en `workspaces` ni se desactiva RLS.

## Tablas

### Permanecen

`profiles`, `workspaces`, `workspace_members`, `accounts`, `contacts`, `opportunities`, `services`, `engagements`, `prestations`, `activities`, `payments`, `payment_allocations`, `documents`, `document_adjustments`, `subscriptions`, `payment_requests`, `payment_request_items`.

### Modificadas

- `workspaces`: verticales `sessions`/`other` y dirección.
- `accounts`: nombre separado, organización, rol y email normalizado.
- `engagements`: tipo `plan`.
- `prestations`: estados compartidos ampliados y seguimiento.
- `activities`: fuente del seguimiento automático.

### Nuevas

- `organizations`.
- `appointment_reminders`.

### Eliminadas o deprecadas

Ninguna tabla se elimina. `contacts`, `accounts.account_type = company/brand`, `opportunities.primary_contact_id` y `activities.contact_id` quedan deprecados hasta migrar y verificar datos reales.

## Constraints e índices

- Unicidad de email normalizado por workspace.
- Unicidad de nombre normalizado para organizaciones activas por workspace.
- FKs compuestas que impiden relaciones entre workspaces.
- Una actividad automática de seguimiento por prestación.
- Idempotencia exacta de recordatorios y un recordatorio activo por prestación/slot.
- Índices parciales para organizaciones activas, recordatorios programados y relaciones opcionales.

## Seed

`supabase/seed.sql` usa UUIDs fijos y `ON CONFLICT`, no contiene secretos ni inserta `auth.users`. Incluye personas independientes, personas que representan organizaciones, seguimiento/actividad enlazados y un recordatorio mock. Debe ejecutarse después de todas las migraciones.

## Riesgos y pendientes antes de producción

1. Ejecutar y verificar todas las migraciones en una instancia local o preview; la CLI de Supabase no estaba disponible en esta iteración.
2. Inspeccionar datos reales para emails duplicados antes de aplicar el índice único.
3. Migrar filas legacy company/brand y contactos secundarios antes de retirar columnas/tablas antiguas.
4. Implementar adaptadores Supabase de los repositories y pruebas de concurrencia/idempotencia.
5. Implementar Auth, creación de profile, onboarding y pruebas RLS cruzadas; no ampliar políticas para sortear onboarding.
6. Crear scheduler/backend para recordatorios y webhooks de Resend; el navegador no debe modificar estado de entrega.
7. Generar tipos TypeScript desde el schema desplegado y añadirlos al adaptador, no a los componentes.
8. Ejecutar asesores de seguridad/rendimiento sobre la instancia vinculada antes de producción.

## Orden recomendado

1. Validar migración/seed en Supabase local y preview.
2. Implementar `SupabaseRepository` detrás de los contratos actuales, inicialmente con un workspace de prueba controlado.
3. Agregar Auth + onboarding transaccional + pruebas RLS multiusuario.
4. Migrar datos legacy, restringir `accounts` a personas y retirar dependencias de `contacts`.
5. Habilitar proveedores server-side (Mercado Pago y Resend) después de identidad y tenant confiables.

## Gate de producción — 26 de agosto de 2026

Proyecto productivo confirmado: `qypxfvbhrsepenrrwmqn` (`Hazento Project`). Staging permanece aislado en `nsqwooyjcmsrlbldwcne`.

### Acciones completadas

- Se identificó y eliminó, con autorización explícita, el dataset demo productivo: 1 workspace, 6 personas, 5 oportunidades, 3 engagements, 18 prestaciones, 9 actividades, 12 pagos y sus relaciones. No existían usuarios Auth, perfiles ni membresías reales.
- Se aplicaron en orden las migraciones versionadas ya validadas en staging: modelo V1, hardening financiero, índices, privilegios, bootstrap, RLS de membresías, retiro de RPC legacy y operaciones atómicas del repository.
- Security Advisor productivo no reporta errores críticos. Se aceptan tres warnings de RPC `SECURITY DEFINER`: `bootstrap_user_workspace`, `settle_payment_request` y `void_received_payment`. Todos fijan `search_path`, verifican `auth.uid()`, validan membresía y deniegan ejecución a `anon`.
- Vercel Production tiene `VITE_DATA_SOURCE=supabase`, URL productiva y publishable key productiva. No existe `service_role` en el navegador.
- Supabase Auth tiene confirmación de email activa, registro anónimo deshabilitado, Site URL y redirect exacto `https://hazento.vercel.app`.
- El registro de usuarios quedó temporalmente deshabilitado para mantener la beta cerrada.

### Bloqueantes antes del deployment y smoke productivo

1. Custom SMTP está deshabilitado. Debe configurarse un proveedor productivo para confirmación y recuperación antes de habilitar cuentas beta.
2. La UI actual de Auth todavía debe comprobarse de extremo a extremo con confirmación y recuperación reales.
3. Después de configurar SMTP: habilitar registro solo durante el alta controlada, crear dos usuarios QA, ejecutar smoke/RLS/pagos, volver a cerrar registro y recién entonces desplegar.

No se ejecutó seed, no se copiaron usuarios QA de staging y no se activaron Mercado Pago ni recordatorios reales.
