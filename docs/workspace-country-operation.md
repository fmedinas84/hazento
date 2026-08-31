# País de operación del workspace

## Decisión funcional

El país representa dónde opera el negocio y pertenece al workspace, no a la identidad del usuario:

```text
auth.users
  → workspace_members
  → workspaces.country_code
  → workspaces.currency_code
```

La configuración central del frontend está en `src/countries.ts`:

| Código | País | Moneda | Registro disponible |
|---|---|---|---|
| CL | Chile | CLP | Sí |
| PE | Perú | PEN | No, próximamente |
| PY | Paraguay | PYG | No, próximamente |

El registro guarda la intención en metadata de Auth para conservarla durante la confirmación de email. Esa metadata no autoriza nada: `bootstrap_user_workspace` vuelve a validar el código y actualmente rechaza cualquier valor distinto de `CL`. El RPC deriva `CLP` mediante `private.workspace_currency_for_country`; el cliente nunca decide la moneda.

## Inmutabilidad y soporte

Después del bootstrap, la aplicación muestra país y moneda en modo de solo lectura. Las mutaciones normales del repository no envían esas columnas. El trigger `workspaces_enforce_region` rechaza cambios hechos con el rol `authenticated`, incluso si alguien manipula una petición directa.

Una futura corrección excepcional deberá ejecutarse con permisos administrativos, comprobar dependencias regionales e históricas y escribir en `admin_audit_log`. Esa acción no forma parte de esta iteración; Hazento Admin permanece read-only.

## Migración de workspaces existentes

La migración verifica primero que todos los workspaces existentes sean coherentes con la operación actual en Chile. Si encuentra otro país o moneda, se detiene para evitar reinterpretar montos. En staging se verificaron 28 workspaces, todos `CL/CLP`; no se modificó ningún monto histórico.

## Estado del soporte multi-workspace

El modelo PostgreSQL ya permite que un usuario tenga varias filas en `workspace_members` y que cada workspace posea país, moneda y datos operacionales independientes. Las políticas RLS autorizan por membresía y no dependen de `user.country_code`.

La experiencia actual todavía asume un workspace activo:

- `bootstrap_user_workspace` devuelve la primera membresía por fecha y no crea una segunda;
- `SupabaseDataProvider` conserva un solo `workspaceId` en memoria;
- no existe selector ni persistencia de workspace activo;
- las rutas no incluyen contexto de workspace;
- el Admin lista combinaciones usuario/workspace, pero la aplicación principal no permite cambiar entre ellas.

Para habilitar multi-workspace habrá que agregar selección explícita, validar el workspace activo contra las membresías, recargar repositories al cambiarlo y decidir cómo persiste esa preferencia. No será necesario mover `country_code` ni duplicarlo en `profiles`.

## Despliegue

Migración versionada: `20260831023357_add_workspace_country_operation.sql` (alineada con la versión registrada por staging).

Se aplicó y validó únicamente en Supabase staging (`nsqwooyjcmsrlbldwcne`). Producción no fue modificada.
