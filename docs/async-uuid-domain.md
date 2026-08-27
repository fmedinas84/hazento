# Dominio preparado para repositories remotos

## Estado anterior

Hazento usaba identificadores numéricos y las mutaciones del DemoStore eran síncronas. Las rutas convertían parámetros con `Number`, por lo que no podían aceptar UUID de PostgreSQL sin una nueva adaptación de la interfaz.

## Estado actual

La fuente activa continúa siendo exclusivamente:

```text
React
→ contratos async de repository
→ DemoRepository / DemoStore
→ localStorage
```

- Todos los IDs y foreign keys del dominio son `string`.
- Las entidades nuevas usan `crypto.randomUUID()`.
- Las rutas y helpers conservan los IDs como texto, sin coerción numérica.
- Las mutaciones del DemoRepository devuelven `Promise` y los formularios principales esperan su confirmación antes de cerrarse.
- La carga inicial expone estados `loading`, `ready` y `error`, con acción de reintento.
- Las acciones reutilizables usan un bloqueo de operación para evitar doble envío y muestran errores amigables.
- SupabaseRepository permanece inactivo. No hay escritura dual ni fallback silencioso.

## Migración de localStorage

El formato persistido usa `demoSchemaVersion: 5`. Al encontrar el formato anterior, Hazento:

1. reconoce IDs numéricos o strings compuestos solo por dígitos;
2. les asigna un ID estable y legible por tipo (`person-demo-001`, `engagement-demo-001`, etc.);
3. transforma todas las claves foráneas con el prefijo de la entidad relacionada;
4. normaliza el resto de los campos legacy;
5. persiste una envoltura versionada.

La transformación es idempotente: los IDs ya migrados se conservan en las siguientes cargas. No se eliminan registros ni se regeneran IDs al recargar.

## Siguiente paso

La siguiente etapa podrá seleccionar explícitamente:

```text
React
→ los mismos contratos async
→ SupabaseRepository
→ PostgreSQL
```

Antes de activarla deben completarse las pruebas de paridad CRUD y pagos contra staging. DemoRepository debe permanecer aislado como modo demo; nunca debe escribir simultáneamente con Supabase.
