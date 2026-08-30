# Sistema visual de Hazento

Hazento combina una identidad editorial cálida con una interfaz operativa compacta. La landing y la aplicación autenticada comparten los mismos fundamentos; cambia la densidad, no la marca.

## Principios

- **Humano y sereno:** fondos cálidos, contraste claro y superficies sin ruido decorativo.
- **Editorial para orientar:** Georgia se reserva para títulos principales y cifras protagonistas.
- **Funcional para operar:** DM Sans se usa en navegación, formularios, tablas, fechas, montos y estados.
- **Densidad con aire suficiente:** las pantallas operativas conservan filas y controles compactos.
- **Semántica antes que color:** cada estado incluye texto y, cuando corresponde, icono o forma.
- **Una fuente de verdad:** los valores viven en `src/design-system.css`; los módulos consumen tokens semánticos.

## Matriz de unificación

| Elemento | Landing | Aplicación anterior | Sistema unificado | Responsable |
|---|---|---|---|---|
| Fondo | Off-white cálido | Gris frío | Off-white cálido | `--background` |
| Acción principal | Verde oscuro | Negro/violeta | Verde oscuro | `--primary` |
| Títulos | Serif editorial | Manrope | Serif editorial | `--font-editorial` |
| Texto operativo | DM Sans | DM Sans | DM Sans | `--font-functional` |
| Superficie | Blanco cálido | Blanco/gris | Blanco cálido | `--surface` |
| Superficie secundaria | Arena | Violeta/gris | Arena | `--surface-warm` |
| Bordes | Gris cálido | Gris frío | Gris cálido | `--border` |
| Foco | Verde translúcido | Violeta | Verde translúcido | `--focus-ring` |
| Tarjetas | Borde fino, sombra suave | Varias sombras | Borde fino, sombra suave | `--shadow-soft` |
| Modales | Blanco, radio amplio | Blanco variable | Superficie y radio comunes | `--radius-xl` |

## Tokens

| Token | Propósito | Uso |
|---|---|---|
| `--background` | Fondo global cálido | Shell y páginas |
| `--surface` | Superficie principal | Cards, tablas, modales |
| `--surface-subtle` | Separación suave | Headers de tabla, hover, filtros |
| `--surface-warm` | Superficie editorial secundaria | Bloques informativos y navegación activa |
| `--surface-strong` | Superficie de marca | Sidebar y énfasis excepcional |
| `--foreground` | Texto principal | Títulos y contenido |
| `--foreground-muted` | Texto secundario | Ayudas, metadata y descripciones |
| `--primary` | Acción principal | CTA, enlaces activos y foco visual |
| `--primary-hover` | Hover de acción | Botón primario |
| `--primary-foreground` | Texto sobre primario | Botones y sidebar |
| `--accent-subtle` | Acento suave | Iconos, selección y contexto |
| `--border` | Separación normal | Cards, controles y tablas |
| `--border-strong` | Separación reforzada | Focus/hover de campos |
| `--success` / `--success-subtle` | Estado positivo | Pagada, completada, ganada |
| `--warning` / `--warning-subtle` | Atención | Pendiente, parcial, no asistió |
| `--danger` / `--danger-subtle` | Estado crítico | Cancelada, perdida, anulada |
| `--info` / `--info-subtle` | Información | Estados informativos |
| `--focus-ring` | Foco accesible | Todos los controles interactivos |
| `--shadow-soft` | Elevación discreta | Cards y superficies flotantes |
| `--shadow-raised` | Elevación alta | Modales y menús |

## Tipografía

- `--font-editorial`: títulos de página, títulos de secciones y métricas protagonistas.
- `--font-functional`: cuerpo, navegación, inputs, botones, tablas, calendario, badges y montos densos.
- No usar serif en celdas, labels, fechas ni controles.
- Los números comparables usan la fuente funcional y cifras tabulares cuando el contexto lo requiere.

## Radios, sombras y espaciado

- Controles: `--radius-sm`.
- Cards: `--radius-lg`.
- Modales: `--radius-xl`.
- Badges: `--radius-pill`.
- Elevación normal: `--shadow-soft`; `--shadow-raised` queda reservado para overlays y menús.
- Altura base de control: `--control-height`; tablas y filtros pueden usar `--control-height-compact`.

## Componentes

### Botones

- **Primario:** verde oscuro, una acción dominante por contexto.
- **Secundario/outline:** superficie clara y borde cálido.
- **Ghost/link:** navegación o acciones de baja jerarquía.
- **Destructivo:** rojo semántico; nunca usar verde o negro.
- Disabled conserva legibilidad; loading no cambia el ancho del control.

### Campos

Inputs, selects y textareas comparten superficie, borde, radio y foco. El label siempre es visible. Error y ayuda no dependen solo del color.

### Cards

Usar solo cuando una superficie necesita agrupación real. Variantes: estándar, métrica, interactiva e informativa. No envolver cada bloque en otra card.

### Modales

Overlay sobrio, superficie cálida, encabezado claro, cierre accesible y footer estable. En mobile ocupan el ancho disponible y usan scroll interno.

### Badges y estados

Los estados se agrupan por significado: éxito, advertencia, peligro e información. El texto sigue siendo obligatorio.

## Patrones a evitar

- Violeta como color de marca o acción primaria.
- Botones negros desconectados del verde Hazento.
- Colores hardcodeados nuevos fuera de tokens.
- Serif en textos operativos pequeños.
- Sombras grandes en contenido estático.
- Estados comunicados únicamente mediante color.
- Espaciado propio por módulo cuando existe un patrón compartido.

## Validación de la migración visual

Se revisaron Landing/Login, Dashboard, Personas, ficha 360, Agenda, Oportunidades, Tratamientos, Pagos, Configuración, Facturación y un modal representativo. La inspección se realizó en 360, 390, 768, 1024, 1366 y 1440 px sin detectar overflow horizontal global ni errores de consola.

Las capturas anteriores de la auditoría permanecen en `docs/evidence/`. La comparación posterior confirmó el nuevo shell verde, títulos editoriales, cards cálidas, controles coherentes y adaptación mobile en cards.

### Rendimiento visual

La hoja CSS de producción pasó de 131,11 kB (24,63 kB gzip) a 142,47 kB (27,08 kB gzip): +11,36 kB, o +2,45 kB transferidos. No se agregó ninguna dependencia. El warning existente del chunk de gráficos continúa sin cambios funcionales y queda fuera del alcance de esta migración visual.

### Accesibilidad verificada

- Un solo `h1` en la landing.
- Foco global visible mediante token semántico.
- Estados mantienen texto además de color.
- Controles táctiles y layout mobile sin desbordamiento global.
- Modales cerrables mediante botón, backdrop y tecla `Escape`.
- Movimiento reducido mediante `prefers-reduced-motion`.
