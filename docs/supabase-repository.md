# Persistencia con SupabaseRepository

## Arquitectura

Hazento selecciona una sola fuente de persistencia mediante `VITE_DATA_SOURCE`:

```text
React
  -> contratos async de DataStore/repositories
     -> demo: DemoProvider -> localStorage
     -> supabase: SupabaseDataProvider -> Supabase staging
```

No existe dual-write ni fallback silencioso. En modo `supabase`, un error remoto muestra un estado de error y permite reintentar; no escribe en `localStorage`.

## Inicialización Supabase

1. Restaurar la sesión de Supabase Auth.
2. Ejecutar el RPC idempotente `bootstrap_user_workspace`.
3. Resolver el workspace desde la membresía autenticada.
4. Cargar en paralelo los dominios del workspace.
5. Publicar el estado `ready` al frontend.

El navegador utiliza solo URL y publishable key. No se utiliza `service_role`.

## Dominios conectados

- Personas y organizaciones (People First).
- Servicios.
- Oportunidades.
- Engagements compartidos por vertical.
- Prestaciones y actividades/seguimientos.
- Solicitudes de pago, pagos y allocations.
- Lectura de suscripción del workspace.
- Lectura de recordatorios y persistencia de su configuración.

Los datos tributarios futuros y contactos legacy no forman parte de la fuente operativa People First.

## Mapeo

La adaptación está concentrada en la capa de persistencia. Resuelve UUID/string, `snake_case`/`camelCase`, nullables, estados estables, montos CLP y fechas. Los componentes continúan consumiendo los tipos de dominio y no filas generadas de Supabase.

Las fechas de citas se almacenan como `timestamptz`. Al interpretar el texto de agenda se construye un instante con offset de Santiago y al presentar se usa `Intl.DateTimeFormat` con `America/Santiago`. Una cita `26 Ago · 16:00` conserva ese día y hora después de recargar.

## Operaciones atómicas

- `create_payment_request_with_items`: crea solicitud y conceptos en una transacción.
- `settle_payment_request`: registra pago total/parcial, allocations y traslado/condonación de saldo.
- `void_received_payment`: anula el pago sin borrarlo y restablece el saldo derivado.
- trigger `sync_prestation_follow_up`: sincroniza seguimiento y Activity sin duplicados.

Estas operaciones verifican la identidad y membresía del workspace. No requieren una clave privilegiada en el cliente.

## Configuración

```text
VITE_DATA_SOURCE=demo|supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Para staging se usa `supabase`; para desarrollo visual puede seguir usándose `demo`. Los ambientes no comparten datos.

## Validación reproducible

```text
npm run test:supabase-repository
npm run test:demo-migration
npm run build
```

La prueba E2E crea dos usuarios QA temporales con sesiones reales, ejecuta bootstrap, CRUD principal, pago parcial y pruebas negativas de aislamiento RLS. Rechaza cualquier project ref distinto del staging autorizado.

## Límites actuales

- No se conecta producción ni Vercel.
- No se envían emails; los estados de entrega siguen siendo server-side.
- No se activa Mercado Pago productivo.
- Las advertencias de Security Advisor sobre RPC `SECURITY DEFINER` existentes se conservan porque son endpoints intencionales con validación explícita de identidad/membresía. Deben revisarse nuevamente antes del rollout productivo.
