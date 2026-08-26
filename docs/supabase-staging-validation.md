# Validación de Supabase staging

Fecha: 2026-08-25  
Proyecto aislado: `Hazento Staging Schema Validation`  
Project ref: `nsqwooyjcmsrlbldwcne`  
Producción: no modificada

## Estrategia utilizada

El proyecto principal `Hazento Project` se trató como producción. Supabase Branching fue evaluado primero, pero la organización no dispone de plan Pro y la API rechazó la creación de una branch. Se creó entonces un proyecto separado de staging en `us-east-2`, con costo informado por Supabase de USD 0/mes. No se copiaron datos productivos ni credenciales.

El frontend sigue en:

```text
React → repositories → DemoStore/localStorage
```

Staging se usa únicamente para validar PostgreSQL, no como backend del frontend actual.

## Resultado general

| Área | Estado | Resultado | Pendiente |
|---|---|---|---|
| Migraciones | OK | 14 migraciones aplicadas desde una base vacía | Promover solo después de Auth/RLS y plan de datos legacy |
| Seed | OK | Ejecutado dos veces; mismos conteos, sin duplicados | Mantener datos demo fuera de producción |
| People First | OK | Persona independiente y persona→organización validadas | Migrar company/brand reales si aparecen en producción |
| Payments | OK | Pagos parciales, allocations, ajustes e inmutabilidad validados | Test de RPC con usuarios Auth reales |
| Subscriptions | OK | 0..1 por workspace; ausencia equivale a Free | Backend de billing autoritativo |
| Reminders | OK | `scheduled`, `sent`, `cancelled`, `failed` representables | Scheduler/Resend server-side |
| RLS | Parcial | Todas las tablas públicas tienen RLS | Prueba cruzada requiere dos usuarios Auth reales |
| Types | OK | Generados desde staging en `src/types/database.types.ts` | Mapper de dominio en SupabaseRepository |
| Security Advisor | Parcial | Sin tablas públicas sin RLS; 4 warnings de RPC privilegiados | Internalizar helper RLS y validar RPCs con Auth |
| Performance Advisor | OK | 12 FKs indexadas; cero avisos de FK sin índice | Ignorar “unused” hasta contar con carga representativa |

## Migraciones y seed

Se aplicaron, en orden, las migraciones funcionales existentes más:

- `prepare_production_data_model`;
- `harden_financial_rpcs`;
- `add_missing_foreign_key_indexes`;
- `restrict_received_payment_privileges`.

El seed terminó correctamente dos veces. Conteos estables:

| Tabla | Filas demo |
|---|---:|
| workspaces | 1 |
| accounts/personas | 6 |
| organizations | 2 |
| contacts legacy | 0 |
| services | 4 |
| opportunities | 5 |
| engagements | 3 |
| prestations | 18 |
| activities | 11 |
| payments | 12 |
| payment_allocations | 12 |
| appointment_reminders | 1 |
| auth.users | 0 |

No se insertaron usuarios falsos ni se encontraron emails normalizados duplicados.

## Validaciones funcionales SQL

Ejecutadas correctamente:

- `supabase/tests/production_data_model.sql`;
- `supabase/tests/payment_allocations_and_adjustments.sql`;
- `supabase/tests/staging_validation.sql`.

Validan:

- email único dentro de un workspace y permitido entre workspaces;
- FK que impide asociar una organización de otro workspace;
- organización opcional y varias personas por organización;
- engagement types `treatment`, `project`, `partnership`, `plan`;
- estados de prestaciones de citas y entregas/contenidos;
- pagos de 30.000, parcial de 20.000, saldo 10.000, segundo pago y ajustes;
- solicitud sucesora con trazabilidad y saldo trasladado único;
- una suscripción máxima por workspace;
- estados de recordatorio y cita sin recordatorio;
- `timestamptz` en citas, actividades, recordatorios, pagos y períodos de suscripción.

`supabase/tests/rls_isolation.sql` quedó preparado pero no ejecutado: exige dos usuarios Auth reales y membresías reales. Deliberadamente no crea filas en `auth.users`.

## People First y legacy

La validación confirmó:

```text
accounts (persona)
  └── organization_id nullable → organizations
```

- María, Daniela, Felipe y Pedro existen sin organización.
- Juan representa a Acme.
- Carolina representa a Nike.
- cambiar `organization_id` no elimina la organización;
- una relación cruzada entre workspaces falla por FK compuesta;
- oportunidades, engagements, prestaciones, actividades y pagos usan el ID estable de persona.

Staging no contiene `accounts.account_type IN ('company','brand')` ni contactos legacy. Si producción sí los contiene, la transformación debe ser documentada antes de migrar:

```text
account company/brand → organization
contact principal → account/persona
FK operativas → ID de la persona
```

No se realizará automáticamente ni se eliminarán los registros originales hasta reconciliar IDs y duplicados.

## RLS

| Tabla | SELECT | INSERT | UPDATE | DELETE | Frontera |
|---|---|---|---|---|---|
| profiles | propio | propio | propio | propio | `auth.uid() = id` |
| workspaces | miembro | RPC onboarding | miembro | miembro | `workspace_members` |
| workspace_members | miembro | miembro | miembro | miembro | `workspace_members` |
| accounts | miembro | miembro | miembro | miembro | `workspace_id` |
| organizations | miembro | miembro | miembro | miembro | `workspace_id` |
| services | miembro | miembro | miembro | miembro | `workspace_id` |
| opportunities | miembro | miembro | miembro | miembro | `workspace_id` |
| engagements | miembro | miembro | miembro | miembro | `workspace_id` |
| prestations | miembro | miembro | miembro | miembro | `workspace_id` |
| activities | miembro | miembro | miembro | miembro | `workspace_id` |
| payment_requests/items | miembro | miembro | miembro | miembro con guards | `workspace_id` |
| payment_allocations | miembro | miembro | miembro | miembro | `workspace_id` |
| payments | miembro | RPC únicamente | RPC únicamente | no permitido | `workspace_id` + RPC auditado |
| documents/adjustments | miembro | miembro | miembro | miembro | `workspace_id` |
| subscriptions | miembro | backend | backend | backend | `workspace_id` |
| appointment_reminders | miembro | backend | backend | backend | `workspace_id` |

La dependencia inicial `workspaces ↔ workspace_members` está resuelta conceptualmente mediante `create_workspace`, que crea workspace y owner dentro de una operación privilegiada. Antes de Auth se deben probar: usuario autenticado, validación de payload, rollback, doble envío, creación de profile y acceso inmediato a la nueva membresía.

## Hallazgo de seguridad corregido

Las migraciones financieras utilizaban settings de sesión (`hazento.settling_payment_request` y `hazento.voiding_payment`) que un cliente PostgreSQL podía configurar para saltar triggers. Se reemplazaron por RPCs `SECURITY DEFINER` con:

- `search_path` vacío;
- autenticación explícita;
- comprobación de membresía del workspace;
- transacción y locks;
- grants mínimos;
- pagos con privilegio directo exclusivamente `SELECT` para `authenticated`.

La consulta de validación confirmó cero bypasses financieros basados en `current_setting` y ningún privilegio directo de INSERT/UPDATE/DELETE/TRUNCATE sobre `payments`.

## Advisors

### Security

Quedan cuatro warnings `authenticated_security_definer_function_executable`:

- `create_workspace`: RPC intencional de onboarding, aún sin prueba Auth.
- `settle_payment_request`: RPC financiero intencional y restringido por membresía.
- `void_received_payment`: RPC financiero intencional y restringido por membresía.
- `is_workspace_member`: helper que deberá moverse a un esquema privado durante la iteración Auth/RLS.

Referencia: [Supabase lint 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

### Performance

El primer análisis detectó 12 foreign keys sin índice. Todas recibieron índices compuestos de cobertura. El segundo análisis reportó cero `unindexed_foreign_keys`.

Los 63 avisos restantes son `unused_index`, normales inmediatamente después de crear staging. No se eliminan índices de integridad o consultas previstas sin métricas reales de uso.

Referencia: [Supabase lint 0001](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys).

## Tipos TypeScript

Tipos oficiales guardados en `src/types/database.types.ts`.

Regeneración:

```text
npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID --schema public
```

Los tipos generados son tipos de persistencia, no sustituyen los tipos de dominio.

| Dominio frontend | PostgreSQL | Adaptación futura |
|---|---|---|
| IDs `number` demo | UUID `string` | Mapper de ID en repository |
| Fecha visible `17 Ago · 09:00` | `timestamptz` ISO | Parser/formateador por timezone |
| Monto `$35.000` | `numeric` | Mapper monetario CLP |
| Estados visibles localizados | estados estables en inglés | Traducción por `verticalConfig` |
| `AccountData` People First | tabla técnica `accounts` | Alias/repository `Person` |
| `organizationId` | `organization_id` nullable | camelCase ↔ snake_case |
| datos derivados de dashboard | queries/selectors | No persistir redundancias |
| checks SQL | campos TypeScript `string` | Uniones de dominio y validación de entrada |

## Bloqueantes

### Antes de SupabaseRepository

- Implementar mappers UUID, fechas, dinero, nullables y estados.
- Definir un contexto de workspace para el adapter.
- Probar idempotencia y conflictos de escritura.
- No activar el adapter en el navegador hasta contar con identidad Auth o un backend de desarrollo controlado.

El schema sí está listo para desarrollar `SupabaseRepository`; el frontend aún no está listo para cambiar su persistencia activa.

### Antes de Auth

- Internalizar `is_workspace_member` y volver a ejecutar el Security Advisor.
- Probar `create_workspace` con usuarios reales y rollback.
- Definir creación de profile y selección de workspace activo.
- Ejecutar `rls_isolation.sql` con dos usuarios reales.
- Diseñar invitaciones y roles owner/admin/member.

### Antes de producción

- Inventariar datos legacy y emails duplicados en el entorno de destino.
- Hacer backup y ensayo de migración sin seed demo.
- Resolver o aceptar formalmente los warnings `SECURITY DEFINER`.
- Ejecutar pruebas RLS/Auth y advisors finales.
- Configurar proveedores server-side de billing/reminders sin secretos en frontend.
- Definir monitoreo, recuperación y rollback.

## Conclusión

El schema de Hazento V1 está desplegado y validado sobre PostgreSQL real en staging. Estamos listos para comenzar la implementación del adapter `SupabaseRepository`, pero no para activarlo en el frontend ni para producción hasta completar Auth, contexto de workspace y pruebas RLS reales.
