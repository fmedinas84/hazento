# Auditoría integral UX/UI de Hazento

**Fecha:** 24 de agosto de 2026  
**Rama auditada:** `main` en `aef0eb8`  
**Viewports:** 1440×900, 1024×768, 390×844 y 360×800  
**Alcance:** aplicación local con DemoStore/localStorage, cuatro verticales, revisión visual, funcional y de código.  

## 1. Resumen ejecutivo

Hazento ya comunica una propuesta mucho más cercana a un profesional independiente que a un CRM corporativo: el dashboard prioriza la acción, la ficha 360 reúne contexto útil, los formularios se adaptan por vertical y los flujos de solicitudes/pagos conservan trazabilidad. No se detectaron errores de consola ni pérdida de datos en los recorridos ejecutados.

La principal brecha no es estética sino semántica. Cambiar de profesión modifica etiquetas, pero reutiliza datos, servicios, estados y reglas propios de Salud. Un diseñador termina viendo “Sesión individual”, un creator puede marcar contenido como “No asistió” y un profesor conserva referencias a tratamientos. Esto hace que la verticalización parezca cosmética y puede inducir decisiones incorrectas.

También hay fricciones relevantes en acciones centrales: crear una atención desde un paciente vuelve a pedir el paciente, el embudo mobile queda cortado, y las vistas Lista/Tarjetas de oportunidades no ofrecen las mismas acciones. En pagos, la lógica contable es consistente, pero una solicitud cerrada por traslado continúa mostrando saldo sin un vínculo visible con la solicitud sucesora, dando la impresión de deuda duplicada.

Resultado general: **producto navegable y funcional, con buena base de diseño, pero todavía no suficientemente predecible entre contextos, verticales y mobile para considerarlo listo para uso real.**

**Hallazgos:** 0 P0, 6 P1, 10 P2 y 4 P3 (20 total).

## 2. Evaluación general de Hazento

| Dimensión | Evaluación | Observación |
|---|---|---|
| Simplicidad | Buena con reservas | Los flujos principales son directos, pero algunos formularios repreguntan datos conocidos. |
| Comprensión sin CRM | Buena | Predominan términos profesionales; persisten “cuenta” y otros textos de modelo interno. |
| Orientación a acciones | Muy buena | CTA principal, agenda, alertas y acciones contextuales tienen protagonismo. |
| Coherencia entre páginas | Media | Componentes consistentes, pero capacidades y estados cambian según vista. |
| Desktop | Buena | Jerarquía clara y densidad razonable. |
| Mobile | Media-baja | No hay overflow global, pero tablas, kanban y modales largos dependen de scroll poco evidente. |
| Verticalización | Baja-media | Labels centralizados correctamente; datos, servicios, estados y gramática no están completamente verticalizados. |
| Accesibilidad | Media-baja | Foco visual razonable, pero filas clickeables no operables por teclado y targets pequeños. |
| Feedback/estados | Media | Éxitos y confirmaciones funcionan; faltan estados loading/error/retry reales. |

## 3. Principales cinco problemas

1. **Verticalización incompleta (UX-003):** cambiar de profesión conserva contenido y reglas de Salud, debilitando la confianza y la comprensión.
2. **Contexto de persona no heredado (UX-002):** una atención iniciada desde Paciente 360 vuelve a solicitar email/paciente.
3. **Semántica de prestaciones incorrecta (UX-004):** duración y “No asistió” aparecen para entregables/contenidos sin que corresponda.
4. **Embudo mobile difícil de recorrer (UX-005):** las columnas quedan cortadas y el desplazamiento horizontal no se comunica.
5. **Acciones desiguales entre Lista y Tarjetas (UX-006):** ganar/perder no está disponible en la lista de oportunidades.

## 4. Principales cinco fortalezas

1. **Inicio accionable:** la tarjeta negra de acción principal ocupa la primera posición y abre el formulario correcto.
2. **Ficha 360 útil:** concentra métricas, siguiente acción, actividad, organización y accesos rápidos sin parecer enterprise.
3. **Flujo financiero trazable:** solicitudes, pagos parciales, traslado de saldo y anulaciones funcionan sin convertir condonaciones en ingresos.
4. **Base visual consistente:** tipografía, radios, tarjetas, badges y jerarquía mantienen una identidad SaaS sobria.
5. **Arquitectura de labels centralizada:** `src/data.ts` evita duplicar pantallas por profesión y facilita corregir la verticalización.

## 5. Hallazgos transversales

### UX-001 — Referencias temporales inconsistentes

- **Prioridad:** P1
- **Módulo/ruta:** Inicio, `/`
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** la cabecera demo indica “Lunes 17 de agosto”, mientras las métricas comparan el período real hasta el día 24. El asistente informa elementos “Programadas para hoy”, pero cuenta todas las prestaciones programadas restantes.
- **Reproducción:** abrir Inicio; comparar fecha, variación de ingresos y bloque “Necesitan tu atención”.
- **Actual:** mezcla reloj real, fecha demo y agregados de períodos distintos.
- **Esperado:** una única fecha de referencia; “hoy” debe filtrar hoy y “restantes” debe nombrarse como tal.
- **Impacto:** el usuario no puede confiar en qué período representa cada cifra.
- **Evidencia:** [Dashboard desktop](./evidence/01-dashboard-1440.png), [Dashboard mobile](./evidence/03-dashboard-390.png).
- **Causa probable:** `scheduledRemaining` en `src/App.tsx` agrega prestaciones programadas sin acotarlas al día, mientras la fecha del encabezado proviene del escenario demo.
- **Recomendación:** introducir un `referenceDate` único en el store demo y helpers separados `scheduledToday`/`scheduledUntilMonthEnd`; alinear todo el microcopy.
- **Complejidad:** Media.

### UX-002 — El contexto conocido de persona se vuelve a solicitar

- **Prioridad:** P1
- **Módulo/ruta:** Paciente 360 → Nueva atención, `/accounts/:id`
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** al iniciar una prestación desde la ficha de una persona, el selector email-first vuelve a aparecer y permite cambiar de persona implícitamente.
- **Reproducción:** Pacientes → María Pérez → Nueva atención.
- **Actual:** el formulario pregunta email/paciente nuevamente.
- **Esperado:** mostrar persona como contexto compacto de solo lectura; ofrecer “Cambiar” como acción explícita.
- **Impacto:** pasos redundantes y riesgo de guardar la acción en otra persona.
- **Evidencia:** [Modal mobile](./evidence/04-attention-modal-390.png).
- **Causa probable:** `hasInheritedContext` en `src/App.tsx` exige simultáneamente `initialAccountId` e `initialEngagementId`; una ficha de persona solo entrega el primero.
- **Recomendación:** bloquear cada relación heredada de forma independiente y mostrar solamente los selectores desconocidos.
- **Complejidad:** Baja.

### UX-003 — El cambio de vertical conserva datos y conceptos de Salud

- **Prioridad:** P1
- **Módulo/ruta:** toda la aplicación; Configuración → Negocio
- **Vertical:** Diseño, Influencer y Profesor
- **Viewport:** Todos
- **Problema:** tras cambiar profesión aparecen “Sesión individual”, “Evaluación inicial”, “Control”, tratamientos y seguimientos clínico-operativos bajo labels de proyecto, contenido o clase.
- **Reproducción:** Configuración → cambiar Salud por Diseñador/Influencer/Profesor; revisar Inicio, Servicios, Planificación y fichas.
- **Actual:** las mismas filas se renombran sin diferenciar escenario, catálogo ni pertinencia.
- **Esperado:** conservar IDs y modelo común, pero usar escenarios demo y catálogos coherentes; cuando se cambie vertical sobre datos reales, explicar que solo cambia la experiencia, no reinterpretar silenciosamente el significado de registros.
- **Impacto:** confusión grave sobre qué representa cada objeto y pérdida de credibilidad del producto.
- **Evidencia:** [Cronograma Diseñador](./evidence/08-timeline-designer-1440.png).
- **Causa probable:** un único dataset demo y un único catálogo de servicios compartidos por todas las verticales.
- **Recomendación:** separar “configuración de experiencia” de “escenario demo”; filtrar/sugerir servicios por vertical y conservar un label de tipo original cuando los datos preexistan.
- **Complejidad:** Alta.

### UX-004 — Estados y campos de prestación no dependen de su naturaleza

- **Prioridad:** P1
- **Módulo/ruta:** formularios Nueva atención/entregable/contenido/clase
- **Vertical:** Diseño, Influencer y Profesor
- **Viewport:** Todos
- **Problema:** entregables y contenidos muestran duración/hora y permiten “No asistió”; el contenido comparte estructura de sesión incluso cuando solo necesita fecha de entrega/publicación.
- **Reproducción:** cambiar a Diseñador o Influencer → crear prestación.
- **Actual:** set común Programada/Completada/Cancelada/No asistió y campos temporales comunes.
- **Esperado:** configuración de campos y estados por vertical/tipo, manteniendo `Prestation` común.
- **Impacto:** decisiones sin sentido y datos difíciles de interpretar.
- **Causa probable:** render compartido en `src/App.tsx` con condiciones limitadas a labels, no a capacidades.
- **Recomendación:** extender `verticalConfig` con `prestationFields` y `prestationStatuses`; Salud/Profesor usan duración y asistencia, Diseño/Creator usan vencimiento/publicación.
- **Complejidad:** Media.

### UX-005 — Embudo de oportunidades cortado en mobile

- **Prioridad:** P1
- **Módulo/ruta:** Oportunidades, `/opportunities`
- **Vertical:** Todas
- **Viewport:** 360×800 y 390×844
- **Problema:** el kanban mantiene columnas anchas; la segunda columna aparece cortada y no hay pista visual de que se debe desplazar horizontalmente.
- **Reproducción:** abrir Oportunidades en 360 px, vista Tarjetas.
- **Actual:** contenido fuera del primer viewport y columnas cerradas difíciles de descubrir.
- **Esperado:** carrusel con snap/indicador, selector de etapa o lista como default mobile.
- **Impacto:** etapas y oportunidades parecen ausentes.
- **Evidencia:** [Oportunidades 360 px](./evidence/07-opportunities-360.png).
- **Causa probable:** `.kanban` conserva grid horizontal desktop sin tratamiento mobile ni affordance.
- **Recomendación:** usar lista como vista mobile predeterminada o tabs horizontales de etapa; mantener kanban desktop.
- **Complejidad:** Media.

### UX-006 — Lista y tarjetas de oportunidades no tienen paridad de acciones

- **Prioridad:** P1
- **Módulo/ruta:** Oportunidades, `/opportunities`
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** Tarjetas ofrece Ganada/Perdida; Lista solo etapa y edición.
- **Reproducción:** alternar Tarjetas → Lista en una oportunidad abierta.
- **Actual:** el resultado posible depende de la representación elegida.
- **Esperado:** mismos datos, filtros y acciones, con menú compacto si falta espacio.
- **Impacto:** usuarios de lista no pueden completar un flujo principal sin cambiar de vista.
- **Recomendación:** centralizar `OpportunityActions` y reutilizarlo en card, row y detalle.
- **Complejidad:** Baja.

### UX-007 — Saldo trasladado parece duplicado

- **Prioridad:** P2
- **Módulo/ruta:** Pagos → Solicitudes
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** una solicitud cerrada por traslado sigue mostrando su saldo residual, mientras la nueva solicitud muestra el mismo saldo; no existe un enlace visible entre origen y sucesora. Solicitudes canceladas también mantienen “Saldo”.
- **Reproducción:** solicitud $30.000 → pago parcial $20.000 → trasladar $10.000.
- **Actual:** original “cerrada” muestra saldo $10.000 y nueva “pendiente” $10.000.
- **Esperado:** original debe mostrar “$10.000 trasladados” y saldo exigible $0, con enlace bidireccional.
- **Impacto:** percepción de deuda duplicada aunque el indicador global calcule bien.
- **Causa probable:** la UI usa `summary.outstanding` en `src/PaymentRequests.tsx` sin adaptar la presentación al estado terminal.
- **Recomendación:** distinguir saldo matemático de saldo exigible y representar trazabilidad explícita.
- **Complejidad:** Media.

### UX-008 — Formularios mobile exceden el viewport y abren un selector invasivo

- **Prioridad:** P2
- **Módulo/ruta:** Agenda → Nueva atención
- **Vertical:** Todas
- **Viewport:** 360×800 y 390×844
- **Problema:** el modal tiene scroll interno de más de 1.000 px; el selector de email abierto ocupa gran parte del primer viewport y la acción primaria queda muy abajo.
- **Reproducción:** Inicio → Nueva atención en mobile.
- **Actual:** gran recorrido vertical y contexto de cierre/guardado fuera de vista.
- **Esperado:** selector cerrado hasta escribir, resumen sticky de contexto y footer sticky con Guardar.
- **Impacto:** aumenta abandono y errores de entrada en el flujo más frecuente.
- **Evidencia:** [Modal 390 px](./evidence/04-attention-modal-390.png), [Modal 360 px](./evidence/05-attention-modal-360.png).
- **Recomendación:** compactar campos, evitar auto-open sin consulta, y fijar footer dentro del drawer/modal.
- **Complejidad:** Media.

### UX-009 — Listado de personas depende de una tabla de 940 px en mobile

- **Prioridad:** P2
- **Módulo/ruta:** Pacientes/Clientes, `/accounts`
- **Vertical:** Todas
- **Viewport:** 360×800 y 390×844
- **Problema:** la tabla es desplazable horizontalmente y oculta columnas/acciones esenciales.
- **Reproducción:** abrir Pacientes en 360 px.
- **Actual:** el usuario debe arrastrar lateralmente sin indicación.
- **Esperado:** filas compactas tipo card con nombre, email, organización/estado y acción; tabla solo desde tablet.
- **Impacto:** escaneo lento y acciones difíciles de descubrir.
- **Evidencia:** [Pacientes 360 px](./evidence/06-patients-360.png).
- **Causa probable:** `.table-card table` aplica `min-width` fija.
- **Recomendación:** componente responsive con representación mobile específica, conservando filtros y fuente de datos.
- **Complejidad:** Media.

### UX-010 — Búsqueda global no normaliza acentos

- **Prioridad:** P2
- **Módulo/ruta:** Topbar → búsqueda global
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** buscar “Maria” encuentra la persona por email, pero no registros cuyo nombre contiene “María”.
- **Reproducción:** escribir `Maria`; comparar resultados con “Tratamiento María Pérez”.
- **Actual:** comparación `lowercase.includes` sensible a diacríticos.
- **Esperado:** normalizar diacríticos, espacios y mayúsculas para todos los objetos buscables.
- **Impacto:** objetos existentes parecen no existir y puede favorecer duplicados.
- **Recomendación:** helper único `normalizeSearchText` aplicado al índice y consulta.
- **Complejidad:** Baja.

### UX-011 — Microcopy técnico durante la creación inline

- **Prioridad:** P2
- **Módulo/ruta:** selectores email-first
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** el mensaje dice “No encontramos una cuenta” y el formulario usa “Nombre de la persona”, aunque la interfaz conoce Paciente/Cliente/Contacto/Alumno.
- **Reproducción:** ingresar un email inexistente en Nueva atención.
- **Actual:** aparecen conceptos genéricos/técnicos.
- **Esperado:** “No encontramos un paciente…” y “Nombre del paciente”, adaptados por vertical.
- **Impacto:** rompe la promesa de no requerir conocimiento CRM.
- **Causa probable:** texto fijo en `src/AccountEmailSelector.tsx`.
- **Recomendación:** consumir labels centralizados en mensajes, ayudas, errores y botones.
- **Complejidad:** Baja.

### UX-012 — Concordancia gramatical incorrecta entre verticales

- **Prioridad:** P2
- **Módulo/ruta:** Inicio, formularios y actividad reciente
- **Vertical:** Influencer, Diseño y Profesor
- **Viewport:** Todos
- **Problema:** aparecen frases como “Contenidos programadas”, “Contenido marcada como realizada” y textos heredados con género de Atención.
- **Reproducción:** cambiar a Influencer y revisar Inicio.
- **Actual:** se interpolan sustantivos en plantillas con adjetivos femeninos fijos.
- **Esperado:** frases completas por vertical o metadatos de género/número.
- **Impacto:** producto percibido como traducción superficial.
- **Causa probable:** plantillas en `src/App.tsx` concatenan labels con copy fijo.
- **Recomendación:** guardar microcopy completo por capacidad, no construir oraciones concatenando sustantivos.
- **Complejidad:** Baja.

### UX-013 — “+N más” del calendario mensual no es interactivo

- **Prioridad:** P2
- **Módulo/ruta:** Agenda/Planificación → Mes
- **Vertical:** Todas
- **Viewport:** Desktop/tablet
- **Problema:** cuando un día supera el límite, se muestra `+N más` sin acción para abrir los eventos ocultos.
- **Reproducción:** vista Mes, localizar día con más de tres eventos.
- **Actual:** el indicador es texto pasivo.
- **Esperado:** click/Enter abre popover o cambia a vista Día.
- **Impacto:** eventos quedan inaccesibles desde la vista que los resume.
- **Recomendación:** convertirlo en botón con contador y aria-label descriptivo.
- **Complejidad:** Baja.

### UX-014 — Filas clickeables no operables por teclado

- **Prioridad:** P2
- **Módulo/ruta:** listados de personas, pagos, solicitudes y prestaciones
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** varias filas usan `onClick` sobre `<tr>` sin `tabIndex`, semántica de enlace ni controlador de teclado.
- **Reproducción:** navegar con Tab por una tabla y tratar de abrir el detalle.
- **Actual:** el mouse abre la fila; teclado no puede enfocarla.
- **Esperado:** nombre como enlace/botón real y acciones independientes.
- **Impacto:** bloquea acceso por teclado y reduce claridad del target.
- **Causa probable:** patrón repetido de `<tr onClick>` en `src/App.tsx` y `src/PaymentRequests.tsx`.
- **Recomendación:** usar enlaces semánticos en la primera columna; evitar convertir toda la fila en control.
- **Complejidad:** Media.

### UX-015 — Búsqueda mobile sin nombre accesible y targets pequeños

- **Prioridad:** P2
- **Módulo/ruta:** Topbar, sidebar, tabs y filtros
- **Vertical:** Todas
- **Viewport:** 360×800 y 390×844
- **Problema:** el buscador colapsa a icono sin nombre accesible; varios controles miden 32–34 px y “Revisar ahora” tiene un área muy reducida.
- **Reproducción:** inspeccionar controles mobile y navegar con lector/teclado.
- **Actual:** algunos iconos no explican su función y targets quedan bajo 44 px.
- **Esperado:** `aria-label`, tooltip y área mínima táctil de aproximadamente 44×44 px.
- **Impacto:** dificultad motora y baja comprensibilidad.
- **Evidencia:** [Dashboard mobile](./evidence/03-dashboard-390.png).
- **Recomendación:** auditar `IconButton`, normalizar `min-height/min-width` y añadir nombres accesibles.
- **Complejidad:** Baja.

### UX-016 — No existen estados loading/error/retry representativos

- **Prioridad:** P2
- **Módulo/ruta:** todos los listados y formularios
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** DemoStore responde sin latencia; la UI no demuestra qué ocurrirá durante consultas, errores o guardados remotos.
- **Reproducción:** revisar componentes/repositorios; no hay forma visible de simular fallo.
- **Actual:** estados felices y vacíos, sin skeleton, error contextual ni reintento.
- **Esperado:** contratos de repositorio con pending/error y componentes consistentes antes de migrar a Supabase.
- **Impacto:** futura conexión remota puede introducir saltos, dobles envíos y mensajes genéricos.
- **Recomendación:** definir estados async en la capa de datos y catálogo de patrones loading/error/success.
- **Complejidad:** Alta.

### UX-017 — Mensajes del asistente y notificaciones parecen dinámicos, pero son fijos

- **Prioridad:** P3
- **Módulo/ruta:** Sidebar e Inicio
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** el bloque “Asistente Hazento” presenta recomendaciones con apariencia operacional, aunque parte del contenido está hardcodeado o usa agregados imprecisos.
- **Actual:** genera una expectativa de inteligencia/actualización que el sistema no sostiene.
- **Esperado:** derivar cada mensaje de datos verificables o etiquetarlo como ejemplo demo.
- **Impacto:** erosiona confianza, especialmente en cobros y agenda.
- **Recomendación:** crear reglas transparentes y permitir navegar al conjunto exacto que originó la alerta.
- **Complejidad:** Media.

### UX-018 — Control “Este año” parece accionable pero no cambia el gráfico

- **Prioridad:** P3
- **Módulo/ruta:** Inicio
- **Vertical:** Todas
- **Viewport:** Desktop/tablet
- **Problema:** el selector visual de período no ofrece opciones ni cambia los datos.
- **Actual:** control aparente sin comportamiento.
- **Esperado:** convertirlo en texto estático o implementar selector real.
- **Impacto:** pequeña pérdida de previsibilidad.
- **Recomendación:** no representar como control hasta que exista más de un período.
- **Complejidad:** Baja.

### UX-019 — El cronograma acumula densidad y scrolls anidados

- **Prioridad:** P3
- **Módulo/ruta:** Planificación → Cronograma
- **Vertical:** Diseño e Influencer
- **Viewport:** 1024×768 y mobile
- **Problema:** la grilla diaria es precisa, pero barra lateral sticky, scroll horizontal, scroll de página, advertencias y marcadores compiten en pantallas menores.
- **Actual:** excelente en 1440 px; más exigente en tablet/mobile.
- **Esperado:** mantener precisión diaria, pero ofrecer rango corto o modo lista en mobile.
- **Impacto:** esfuerzo visual, no bloqueo.
- **Evidencia:** [Cronograma 1440 px](./evidence/08-timeline-designer-1440.png).
- **Recomendación:** preset semanal mobile, resumen por engagement y leyenda plegable.
- **Complejidad:** Media.

### UX-020 — “Entidad secundaria” expone el modelo conceptual

- **Prioridad:** P3
- **Módulo/ruta:** Empresas → detalle
- **Vertical:** Todas
- **Viewport:** Todos
- **Problema:** el eyebrow “ENTIDAD SECUNDARIA” describe arquitectura interna, no una necesidad del usuario.
- **Actual:** enfatiza jerarquía del modelo People First.
- **Esperado:** “EMPRESA”/“ORGANIZACIÓN” o eliminar el eyebrow.
- **Impacto:** microcopy artificial y corporativo.
- **Recomendación:** usar label vertical de organización y mantener People First mediante jerarquía visual, no explicación técnica.
- **Complejidad:** Baja.

## 6. Hallazgos por módulo

### Acceso y perfil

- No existe Auth; por tanto no fue posible auditar login, recuperación ni vínculo real entre email y `auth.users`.
- Perfil permite cambiar nombre y refleja el cambio en sidebar; el email demo se muestra correctamente. El workspace permite cambiar nombre y lo actualiza en topbar.
- La pantalla es clara, aunque debe validarse nuevamente al conectar identidad remota y estados de guardado.
- Evidencia: [Configuración de perfil](./evidence/09-profile-settings-1440.png).

### Inicio y dashboard

- Buena jerarquía: CTA negro primero, tres métricas y agenda/alertas inmediatamente visibles.
- Problemas principales: períodos incoherentes (UX-001), gramática vertical (UX-012), acciones aparentes (UX-018) y asistente poco verificable (UX-017).

### Personas y ficha 360

- La ficha 360 responde bien quién es, qué viene y cuánto se ha trabajado/cobrado.
- La creación inline preserva datos del formulario y evita duplicados por email.
- Repetición de persona desde su propia ficha (UX-002), tabla mobile (UX-009) y copy “cuenta” (UX-011).

### Empresas/organizaciones

- Listado compacto, conteo derivado y modal suficiente para el rol secundario.
- “Entidad secundaria” es innecesario (UX-020). La navegación conserva a la persona como entrada principal.

### Engagements: proyectos, tratamientos, planes y partnerships

- Creación y edición precargan correctamente datos; contexto hacia prestación funciona cuando hay persona+engagement.
- La verticalización de datos y servicios es el riesgo mayor (UX-003/004).
- Cronograma desktop es una fortaleza; tablet/mobile requiere alternativa (UX-019).

### Prestaciones: atenciones, clases, entregables y contenidos

- Crear, editar duración y guardar funcionan; seguimiento de Salud permanece asociado.
- Campos/estados no se adaptan por naturaleza de la prestación (UX-004).
- El contexto desde persona sola falla; desde engagement funciona.

### Oportunidades

- Creación, edición, métricas, cierre y carriles colapsados funcionan.
- Ganada muestra CTA contextual para crear atención y mueve la oportunidad fuera del embudo abierto.
- Lista y tarjetas no tienen paridad (UX-006), y kanban mobile se corta (UX-005).

### Agenda/calendario

- Día/semana/mes renderizan sin errores y los seguimientos aparecen como actividades.
- `+N más` oculta eventos sin permitir abrirlos (UX-013).
- El formulario mobile es demasiado largo (UX-008).

### Seguimientos y tareas

- Seguimiento se visualiza como actividad separada y conserva fecha de guardado.
- Al cambiar vertical, estos registros se reinterpretan sin contexto (UX-003).

### Solicitudes y pagos

- No se crean pagos desde la página general; el origen contextual está bien protegido.
- Pago parcial, traslado, anulación e indicadores se recalculan correctamente.
- La presentación del saldo trasladado/cancelado es ambigua (UX-007).
- Acciones futuras están deshabilitadas y explican “Próximamente”, buen patrón.

### Configuración y vertical

- Cambios de perfil/workspace funcionan y persistieron durante el reload local.
- Labels y capacidades de navegación se actualizan inmediatamente.
- El mismo dataset se reinterpreta, generando incompatibilidades semánticas (UX-003/004/012).

## 7. Matriz de flujos probados

| # | Flujo | Entrada | Pasos aprox. | Resultado | Fricción/recomendación |
|---:|---|---|---:|---|---|
| 1 | Crear atención desde Inicio | CTA negro | 7 | Completado | Abre Agenda+modal; compactar modal y no abrir selector sin consulta. |
| 2 | Crear atención desde paciente | Paciente 360 | 7 | Completado con fricción | Repite email/paciente; bloquear relación heredada. |
| 3 | Crear desde tratamiento/proyecto | Detalle engagement | 4 | Completado | Contexto persona+engagement correcto y editable solo explícitamente. |
| 4 | Crear persona dentro de una acción | Selector email | 6 | Completado | Conserva formulario; reemplazar “cuenta/persona” por label vertical. |
| 5 | Editar atención/duración | Lista Atenciones | 4 | Completado | 60→90 minutos persistió y se reflejó como 1 h 30 min. |
| 6 | Crear/editar proyecto o tratamiento | Engagements | 4 | Parcial | Edición precargada inspeccionada; no se guardó un segundo engagement para no contaminar más el demo. |
| 7 | Crear y cerrar oportunidad | Oportunidades | 6 | Parcial | Ganada ejecutada; Perdida se inspeccionó por simetría de UI/código, sin crear otro registro. |
| 8 | Alternar Lista/Tarjetas | Oportunidades | 1 | Completado con falla | Datos/filtros coinciden; acciones Ganada/Perdida faltan en Lista. |
| 9 | Solicitud desde proyecto/elemento | Tratamiento | 5 | Parcial | Desde engagement ejecutada; origen individual inspeccionado sin crear solicitud adicional. |
| 10 | Pago total | Detalle solicitud | 3 | Parcial | UI y solicitud ya pagada verificadas; no se generó un pago total nuevo. |
| 11 | Pago parcial + traslado | Detalle solicitud | 6 | Completado | $20.000/$30.000 y nueva solicitud $10.000; presentación ambigua del saldo original. |
| 12 | Anular pago | Detalle pago | 4 | Completado | Exige motivo, conserva auditoría, restaura saldo y excluye ingreso. |
| 13 | Cambiar vertical | Configuración | 2 por vertical | Completado con falla | Navegación cambia; datos/estados no son coherentes fuera de Salud. |
| 14 | Editar perfil/workspace | Configuración | 3 | Completado | Nombre y email visibles; ambos nombres actualizan UI y se restauraron al demo original. |

## 8. Comparación desktop/mobile

| Área | Desktop 1440/1024 | Mobile 390/360 |
|---|---|---|
| Dashboard | Jerarquía clara; 4 cards en línea a 1440 | 2×2 estable; CTA primero. |
| Navegación | Sidebar clara y colapsable | Drawer funciona; targets de algunos iconos son pequeños. |
| Formularios | Espacio suficiente, lectura cómoda | Scroll interno largo; acción principal fuera del primer viewport. |
| Personas | Tabla escaneable | Tabla de 940 px y scroll lateral poco evidente. |
| Oportunidades | Kanban y lista utilizables | Kanban cortado; lista debería ser default. |
| Agenda | Vistas día/semana/mes legibles | Mes denso; modal domina la pantalla. |
| Cronograma | Muy útil a 1440 | Requiere scroll anidado; conviene rango corto/lista. |
| Ficha 360 | Buena relación 2 columnas | Apilado correcto, pero acciones compiten por espacio. |

## 9. Inconsistencias entre verticales

| Aspecto | Salud | Diseño | Influencer | Profesor | Hallazgo |
|---|---|---|---|---|---|
| Persona | Paciente | Cliente | Contacto | Alumno | Labels correctos. |
| Engagement | Tratamiento | Proyecto | Partnership | Plan | Labels correctos; datos subyacentes se reinterpretan. |
| Prestation | Atención | Entregable | Contenido | Clase | Labels correctos; estados/campos no. |
| Servicio demo | Sesión/Evaluación/Control | Igual | Igual | Igual | Debe ser contextual o neutro. |
| Estado “No asistió” | Pertinente | No pertinente | No pertinente | Pertinente | Requiere capacidades por vertical. |
| Cronograma | Oculto | Visible | Visible | Oculto | Decisión coherente. |
| Gramática | Mayormente correcta | Mixta | Errores de género | Datos de Salud | Microcopy debe ser frase completa por vertical. |
| Seguimiento | Pertinente | Se filtra/renombra como actividad | Se filtra/renombra | Referencias clínicas visibles | Debe conservar naturaleza original. |

## 10. Problemas de nomenclatura y microcopy

- “No encontramos una **cuenta**…” → usar paciente/cliente/contacto/alumno.
- “Nombre de la **persona**” → usar label vertical en creación contextual.
- “**Entidad secundaria**” → eliminar o usar Empresa/Organización.
- “Contenidos **programadas**” → “Contenidos programados”.
- “Contenido **marcada como realizada**” → “Contenido marcado como completado/publicado”, según estado real.
- “Programadas para hoy” → usar el género correcto y solo si el filtro realmente es hoy.
- “Saldo” en solicitudes trasladadas/canceladas → “Saldo trasladado” o saldo exigible $0.
- “Este año” → texto, no control, mientras no cambie período.

## 11. Mejoras rápidas de alto impacto

1. Corregir `hasInheritedContext` para bloquear persona aunque no exista engagement (UX-002).
2. Reutilizar acciones Ganada/Perdida en la vista Lista (UX-006).
3. Normalizar acentos en búsqueda global (UX-010).
4. Reemplazar copy fijo por frases completas de `verticalConfig` (UX-011/012).
5. Hacer `+N más` interactivo y añadir `aria-label` al botón de búsqueda mobile (UX-013/015).
6. Mostrar “saldo trasladado” y vínculo entre solicitudes (UX-007).

## 12. Cambios estructurales recomendados

1. **Capacidades por vertical:** además de labels, definir campos, estados, verbos, fecha primaria y reglas aplicables a cada `Prestation`.
2. **Escenarios demo aislados:** permitir alternar profesión sin reinterpretar silenciosamente datos de otra vertical; mantener un dataset coherente por escenario o un origen semántico persistente.
3. **Context resolver común:** construir un objeto de contexto por acción (`account`, `organization`, `engagement`, `source`) que decida qué mostrar, bloquear u ocultar.
4. **Sistema async antes de Supabase:** repositories con estados pending/error, idempotencia de guardado y feedback consistente.
5. **Representaciones responsive:** misma fuente de datos, pero tabla/lista/kanban adaptados a viewport; no comprimir componentes desktop.
6. **Semántica de saldo:** separar en selectores `rawOutstanding`, `collectibleOutstanding`, `transferredAmount` y `forgivenAmount`.

## 13. Backlog priorizado

### P0

No se detectaron bloqueos totales ni corrupción de datos en los flujos ejecutados.

### P1

- UX-001 Unificar fecha/períodos del dashboard.
- UX-002 Heredar persona de forma independiente.
- UX-003 Evitar reinterpretación vertical de datos/servicios.
- UX-004 Configurar campos y estados por vertical.
- UX-005 Rediseñar kanban mobile.
- UX-006 Igualar acciones entre lista y tarjetas.

### P2

- UX-007 Clarificar saldo trasladado/cancelado.
- UX-008 Compactar formulario mobile y fijar CTA.
- UX-009 Crear lista mobile de personas.
- UX-010 Normalizar búsqueda.
- UX-011 Eliminar copy técnico.
- UX-012 Corregir concordancia vertical.
- UX-013 Abrir eventos ocultos del mes.
- UX-014 Hacer tablas operables por teclado.
- UX-015 Mejorar labels accesibles y touch targets.
- UX-016 Preparar estados async.

### P3

- UX-017 Derivar mensajes del asistente.
- UX-018 Quitar apariencia interactiva de “Este año”.
- UX-019 Simplificar cronograma en pantallas menores.
- UX-020 Reemplazar “Entidad secundaria”.

## 14. Propuesta de orden de implementación

1. **Confianza y corrección semántica:** UX-001, UX-002, UX-003, UX-004, UX-007.
2. **Paridad de acciones y mobile crítico:** UX-005, UX-006, UX-008, UX-009.
3. **Lenguaje y descubrimiento:** UX-010, UX-011, UX-012, UX-013.
4. **Accesibilidad:** UX-014 y UX-015.
5. **Preparación de persistencia real:** UX-016.
6. **Pulido:** UX-017 a UX-020.

## Resumen de hallazgos

| ID | Prioridad | Módulo | Problema | Recomendación | Complejidad |
|---|---|---|---|---|---|
| UX-001 | P1 | Dashboard | Fechas y períodos incoherentes | Fuente temporal única y agregados explícitos | Media |
| UX-002 | P1 | Persona 360 | Repite persona conocida | Bloqueo independiente por relación heredada | Baja |
| UX-003 | P1 | Verticalización | Datos de Salud en otras profesiones | Escenarios/catálogos coherentes por vertical | Alta |
| UX-004 | P1 | Prestaciones | Estados y campos no pertinentes | Capacidades por vertical | Media |
| UX-005 | P1 | Oportunidades | Kanban cortado en mobile | Lista default o tabs/carrusel con affordance | Media |
| UX-006 | P1 | Oportunidades | Lista sin Ganada/Perdida | Componente común de acciones | Baja |
| UX-007 | P2 | Pagos | Saldo trasladado parece duplicado | Saldo exigible y trazabilidad visible | Media |
| UX-008 | P2 | Formularios | Modal mobile demasiado largo | Compactar y footer sticky | Media |
| UX-009 | P2 | Personas | Tabla de 940 px en mobile | Representación mobile tipo card | Media |
| UX-010 | P2 | Búsqueda | No normaliza acentos | Helper de normalización común | Baja |
| UX-011 | P2 | Microcopy | “Cuenta/persona” visibles | Labels verticales en mensajes completos | Baja |
| UX-012 | P2 | Verticalización | Errores de género y número | Copy completo por vertical | Baja |
| UX-013 | P2 | Calendario | `+N más` no abre eventos | Botón hacia popover/día | Baja |
| UX-014 | P2 | Accesibilidad | Filas solo clickeables con mouse | Enlaces/botones semánticos | Media |
| UX-015 | P2 | Accesibilidad | Icono sin nombre y targets pequeños | aria-label y mínimo táctil | Baja |
| UX-016 | P2 | Estados | Sin loading/error/retry | Contratos async de repositorio | Alta |
| UX-017 | P3 | Asistente | Mensajes aparentan datos dinámicos | Reglas verificables y enlaces filtrados | Media |
| UX-018 | P3 | Dashboard | “Este año” parece selector inactivo | Texto estático o selector real | Baja |
| UX-019 | P3 | Cronograma | Densidad/scrolls en pantallas menores | Rango corto o modo lista | Media |
| UX-020 | P3 | Empresas | “Entidad secundaria” es técnico | Label vertical o eliminación | Baja |

## Evidencia y limitaciones

La evidencia fue capturada sobre datos demo. Se restauraron el nombre de perfil y workspace tras comprobar su edición. Se agregaron registros demo durante los flujos de creación, sin borrar información.

No pudieron probarse completamente:

- **Acceso/Auth:** no existe autenticación real en esta etapa.
- **RLS entre workspaces:** el frontend usa DemoStore/localStorage y no ejecuta consultas autenticadas contra Supabase.
- **Errores de red/loading:** DemoStore es síncrono y no ofrece simulación de fallos.
- **Oportunidad Perdida:** se inspeccionó UI y lógica equivalente, pero no se creó un segundo registro solo para cerrar el escenario.
- **Pago total nuevo:** se verificó un pago existente y la interfaz; el recorrido creado se concentró en pago parcial+traslado y anulación.
- **Solicitud desde elemento individual:** se inspeccionó el punto de entrada; la ejecución completa se realizó desde engagement.
- **Lectores de pantalla reales:** se revisó semántica/teclado mediante DOM, no con VoiceOver, NVDA o TalkBack.

