# Hazento Partners · landing pública profesional

## Arquitectura

```text
Hazento App (autenticada)
  → Configuración → Landing pública
  → partner_pages + Storage

Hazento Partners (pública, apps/partners)
  → /{slug}
  → RPC get_published_partner_page
  → solo campos públicos de una landing publicada
```

La URL completa nunca se persiste. La identidad estable es `country_code + slug`; el host se resuelve por ambiente. Chile usa `CL` y el destino comercial futuro es `https://partners.hazento.cl/{slug}`.

## Modelo de datos y estados

`partner_pages` mantiene exactamente una configuración por workspace (`workspace_id` único). La combinación `(country_code, slug)` también es única. Sus estados son:

- `draft`: configuración privada o landing despublicada.
- `published`: accesible desde la aplicación pública.
- No configurada: no existe fila todavía.

Despublicar cambia el estado y conserva la configuración. Cambiar el slug no crea una redirección del enlace anterior.

La publicación exige nombre, especialidad, descripción, foto y al menos un contacto expresamente marcado como público. WhatsApp y email nunca se publican por defecto.

## Frontera de seguridad

- `partner_pages` tiene RLS y solo miembros del workspace pueden leer o modificar su configuración.
- `anon` no tiene acceso directo a la tabla.
- El RPC público `get_published_partner_page` usa `search_path` vacío, filtra por `published` y devuelve únicamente nombre, especialidad, descripción, foto, contactos autorizados y el entitlement de agenda.
- La disponibilidad del slug requiere sesión autenticada. La restricción única es la autoridad final ante carreras.
- Las fotos usan el bucket público `partner-photos`; solo miembros del workspace pueden escribir o eliminar bajo `{workspace_id}/...`. Los nombres contienen UUID aleatorios y una página no publicada nunca revela su ruta mediante la API pública.
- Ninguna clave `service_role` o secret se usa en el navegador.

El warning del Advisor sobre el RPC público `SECURITY DEFINER` es aceptado deliberadamente: la lectura anónima es el propósito del producto y la función expone una proyección cerrada, no filas internas. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

## Free, Plus y agenda futura

Free puede publicar foto, presentación y contacto completo. Dentro de Configuración descubre que el autoagendamiento requiere Plus; el visitante no ve el plan.

`scheduling_enabled` conserva la preferencia futura, pero el RPC solo devuelve `can_auto_schedule = true` si la suscripción del workspace es `plus/active`. Un downgrade mantiene la landing y la preferencia, pero la capacidad pública queda desactivada. Esta HU no renderiza reservas.

## Hosts por ambiente

Hazento App usa:

- `VITE_PARTNERS_PUBLIC_URL`: host realmente navegable de Partners en el ambiente.
- `VITE_PARTNERS_COMMERCIAL_URL`: host que se comunica al usuario; en Chile, `https://partners.hazento.cl`.

Hazento Partners usa:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PARTNERS_COUNTRY_CODE=CL`
- `VITE_HAZENTO_MARKETING_URL`

## Crear manualmente el proyecto Vercel

No se crea durante esta HU. Cuando la rama sea aprobada:

| Campo | Valor |
|---|---|
| Nombre sugerido | `hazento-partners` |
| Repositorio | El mismo repositorio de Hazento |
| Root Directory | `apps/partners` |
| Framework Preset | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Preview debe usar URL y Publishable Key de Supabase staging. Production deberá usar URL y Publishable Key de Supabase production solamente después de aplicar y aprobar las migraciones. `VITE_PARTNERS_COUNTRY_CODE=CL` en ambos. `VITE_HAZENTO_MARKETING_URL` apunta a la landing comercial correspondiente. No agregar `service_role`.

Después de crear el proyecto Preview, configurar en el proyecto principal de Hazento `VITE_PARTNERS_PUBLIC_URL` con el dominio Preview de Partners. No conectar todavía `partners.hazento.cl`.

## Migraciones y pruebas

- `20260901005307_partner_public_landings.sql`: tabla, constraints, RLS, RPCs y bucket/policies.
- `20260901010539_restrict_partner_slug_check.sql`: limita la comprobación de disponibilidad a usuarios autenticados.
- `20260901011315_grant_partner_photo_policy_helper.sql`: habilita la función mínima usada por las policies de Storage para usuarios autenticados.
- `supabase/tests/partner_public_landings.sql`: unicidad, publicación pública, 404 lógico e aislamiento entre dos workspaces, todo dentro de una transacción revertida.
- `npm run test:partner-slugs`: normalización, tildes, URLs, slugs reservados y formato.

## Alcance pendiente

- Crear y configurar el proyecto Vercel Partners.
- Conectar el dominio `partners.hazento.cl` después del Preview.
- Implementar disponibilidad y reservas en la HU de autoagendamiento.
- Aplicar migraciones a producción solo después de aprobación.
