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

## Modelo de clientes People First

Hazento inicia cada relación desde una persona. Una empresa o marca agrega contexto, pero no reemplaza a la persona como sujeto operativo:

```text
Person
└── Organization opcional (máximo una organización principal)

Person
├── Opportunities
├── Engagements
├── Prestations
├── Activities
└── Payments
```

En el adaptador demo, `AccountData` representa a la persona y conserva `accountId` en los objetos operativos para evitar un cambio masivo de contratos. `organizationId` y `role` son opcionales. `Organization` tiene repositorio propio, se identifica funcionalmente por nombre normalizado dentro del workspace y se presenta como una pestaña secundaria dentro de Personas/Pacientes/Contactos/Alumnos.

La creación por email sigue aplicando unicidad funcional por `workspaceId + normalizedEmail`; todas las relaciones continúan usando IDs, nunca emails o nombres. Los registros locales antiguos se enriquecen sin borrar ni convertir silenciosamente sus datos.

Esta iteración no cambia PostgreSQL. Al conectar la persistencia real habrá que incorporar `organizations`, asociar la persona mediante `organization_id`, definir las restricciones multitenant correspondientes y decidir la migración controlada de Accounts históricos tipo empresa/marca. Auth y RLS permanecen intactos hasta esa etapa.

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

## Facturación con Mercado Pago

Hazento ofrece dos planes: **Free ($0 CLP/mes)** y **Plus ($4.990 CLP/mes)**. Plus se implementa como una suscripción recurrente de Mercado Pago, no como pagos únicos repetidos:

```text
Checkout Bricks (Public Key, navegador)
→ token de tarjeta de un solo uso
→ /api/billing/subscription (Access Token, servidor)
→ POST /preapproval
→ Mercado Pago programa y ejecuta los cobros mensuales siguientes
```

El Card Payment Brick se usa únicamente para capturar y tokenizar una tarjeta de crédito. Hazento nunca recibe ni almacena el número completo, vencimiento o CVV. El backend crea un `preapproval` sin plan asociado, porque actualmente existe un único plan pago fijo; allí define `frequency: 1`, `frequency_type: months`, `transaction_amount: 4990` y `currency_id: CLP`. Un `preapproval_plan` podrá incorporarse si más adelante varios planes comparten configuración.

### Endpoints

- `GET /api/billing/config`: entrega al navegador solo la Public Key y el modo configurado.
- `POST /api/billing/subscription`: crea la autorización recurrente Plus.
- `GET /api/billing/subscription`: consulta el estado autoritativo en Mercado Pago.
- `PATCH /api/billing/subscription`: pausa, reactiva o cancela mediante `/preapproval/{id}`.
- `POST /api/billing/webhook`: valida `x-signature` y confirma el recurso notificado directamente con Mercado Pago.

El frontend conserva únicamente una capacidad firmada y opaca para recuperar la suscripción demo. El Access Token nunca sale de las funciones server-side. La clave de idempotencia se conserva durante el intento para que un doble click, retry o refresh no cree dos solicitudes diferentes. Los webhooks actuales realizan una lectura autoritativa sin efectos secundarios, por lo que su repetición es idempotente.

### Estados

| Mercado Pago | Hazento |
|---|---|
| `pending` | `pending` |
| `authorized` | `active` |
| `paused` | `paused` |
| `canceled` | `cancelled` |
| cuota/pago `recycling` o `rejected` | `payment_failed` |

Mercado Pago genera las cuotas, procesa los cobros y ejecuta sus reintentos. Hazento no usa cron jobs para cobrar. La cancelación envía `status: canceled`, detiene renovaciones futuras y se confirma consultando nuevamente Mercado Pago. Pausa y reactivación usan los estados oficiales `paused` y `authorized`.

### Variables de entorno

Configurar en Vercel y, para pruebas locales con `vercel dev`, en `.env.local`:

```text
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
BILLING_CAPABILITY_SECRET=
APP_BASE_URL=
```

La Public Key y el Access Token deben provenir de la misma aplicación y del mismo entorno. En desarrollo se esperan credenciales `TEST-`. Nunca usar variables `VITE_*` para el Access Token, el secreto del webhook o la capacidad.

### Configuración manual en Mercado Pago Developers

1. Crear o seleccionar la aplicación de Hazento y copiar sus credenciales de prueba.
2. Registrar `https://TU_DOMINIO/api/billing/webhook` como URL HTTPS de Webhooks.
3. Activar `subscription_preapproval`, `subscription_authorized_payment` y `payments`.
4. Copiar la clave secreta de firma a `MERCADOPAGO_WEBHOOK_SECRET`.
5. Probar con usuario y tarjetas de prueba antes de cargar credenciales de producción.

### Limitación temporal por falta de Auth

Esta integración puede probarse de punta a punta en modo test, pero aún no concede beneficios Plus de producción. Sin Supabase Auth no existe una identidad server-side durable que vincule de forma inequívoca la suscripción con un workspace. La futura integración deberá persistir `workspace_id`, `preapproval_id`, estado, fechas y eventos procesados en PostgreSQL, protegidos por RLS, y reemplazar la capacidad demo por autorización autenticada. Hasta entonces Mercado Pago es la fuente autoritativa y no se confía en `localStorage` para otorgar acceso Plus.

## Modelo de suscripciones por workspace

La migración `supabase/migrations/002_workspace_subscriptions.sql` prepara la persistencia definitiva de planes sin modificar Auth ni conectar todavía el frontend:

```text
auth.users
├── profiles (identidad de la persona)
└── workspace_members
    └── workspaces (negocio y límite multitenant)
        └── subscriptions (plan contratado por el negocio)
```

La suscripción pertenece al workspace, no al profile. Esto permite que varios miembros compartan el plan de un negocio y que un usuario participe en workspaces con planes independientes.

Si no existe una fila en `subscriptions`, el workspace se considera **Free** y no se crea ningún objeto en Mercado Pago. Una fila `plan = 'plus'` representa la intención o suscripción pagada; `pending` no concede acceso Plus. El precio de Plus ($4.990 CLP/mes) permanece en la configuración del producto.

Los miembros autenticados solo tienen lectura mediante `is_workspace_member(workspace_id)`. `plan`, `status`, referencias del proveedor y períodos se reservan para procesos server-side que reaccionen a respuestas o webhooks verificados. No se almacenan tarjetas, CVV ni tokens sensibles.

Una evolución posterior podrá agregar `subscription_payments` con `subscription_id`, `provider_payment_id`, monto, moneda, estado y fecha de pago. Estos cobros de Hazento permanecerán separados de `payments` y `payment_allocations`, que representan pagos operativos recibidos por los profesionales.

## Boletas, pagos parciales y ajustes

La migración `003_payment_allocations_and_adjustments.sql` incorpora `documents` para boletas y amplía la tabla existente `payment_allocations`; no crea una segunda tabla de pagos. Una asignación apunta exactamente a una prestación o a una boleta. Así un pago puede distribuirse entre varias boletas, una boleta puede recibir varios pagos y el remanente del pago queda disponible sin inventar movimientos.

El estado tributario (`draft`, `issued`, `voided`) se almacena en `documents`. El estado de cobro se deriva en `document_payment_summaries`:

```text
pagado    = asignaciones cuyos payments están paid
ajustado  = descuentos + saldos condonados
pendiente = total_amount - pagado - ajustado
```

Los ajustes viven en `document_adjustments` y nunca aumentan ingresos cobrados. Si la boleta está emitida, el trigger conserva `total_amount` y marca la corrección tributaria como `pending`; la interfaz explica que será necesario anular y emitir nuevamente cuando exista integración SII. Para borradores, el total definitivo puede modificarse antes de emitir.

Los triggers bloquean montos negativos, duplicados, cruces de workspace/persona, asignaciones superiores al saldo del pago o de la boleta y reducciones del pago bajo lo ya asignado. `replace_document_payment_allocations(payment_id, jsonb)` reemplaza todas las asignaciones de una edición dentro de una sola transacción. Las tablas nuevas usan el mismo helper RLS `is_workspace_member(workspace_id)`.

Los escenarios mínimos están documentados como prueba transaccional con rollback en `supabase/tests/payment_allocations_and_adjustments.sql`.

## Solicitudes de pago, pagos y boletas

Hazento mantiene tres conceptos independientes:

```text
Solicitud de pago = monto que se espera cobrar
Pago              = dinero efectivamente recibido
Boleta            = documento tributario futuro
```

Las solicitudes nunca se crean al registrar una atención, entregable, contenido, clase o engagement. Se generan mediante una acción explícita desde su ficha y pueden agrupar varios conceptos en `payment_request_items`. `payment_allocations` se reutiliza para asociar pagos reales a prestaciones, solicitudes o documentos, con una sola clase de destino por fila.

`settle_payment_request` ejecuta en una única transacción el pago total o parcial. Ante un pago parcial, la solicitud original se cierra y el saldo se traslada a una nueva solicitud enlazada mediante `parent_request_id`, o se registra como diferencia condonada con monto, motivo, fecha y usuario. Una condonación reduce el saldo, pero nunca aumenta ingresos: los indicadores suman exclusivamente filas reales de `payments` con estado pagado.

Las tablas `payment_requests` y `payment_request_items` usan claves foráneas compuestas para mantener `workspace_id` y persona consistentes con prestaciones, engagements y oportunidades. Ambas tienen RLS por membresía del workspace; la vista derivada `payment_request_summaries` usa `security_invoker`. Las pruebas con rollback están en `supabase/tests/payment_requests.sql`.

Las boletas permanecen preparadas en `documents`, pero no forman parte de la navegación principal. En la solicitud se reservan las acciones inactivas “Generar link de pago” y “Generar boleta” para iteraciones futuras.
