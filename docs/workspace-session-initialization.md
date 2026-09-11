# Inicialización del workspace con sesión existente

La landing pública omite deliberadamente las consultas de datos internos. Antes, navegar desde ella a `/app` solo cambiaba la ruta: el repositorio podía quedar en estado listo con listas vacías y sin `workspaceId`. La creación fallaba antes de enviar una petición a la base de datos.

La inicialización ahora depende de la identidad de sesión y de entrar a una ruta privada. `INITIAL_SESSION` restaura la sesión; el callback de Auth no ejecuta consultas. Un efecto inicia la carga una sola vez por usuario, y una renovación de token de la misma identidad no borra los datos ni recarga el formulario. Una generación de carga descarta respuestas anteriores tras cerrar sesión, cambiar de usuario o desmontar el proveedor.

La interfaz no se declara lista sin workspace, y las mutaciones y apertura del formulario requieren estado listo. Al recargar directamente una ruta privada, se espera la restauración de la sesión antes de decidir una redirección a login. Un error de carga permite reintentar sin entrar en un bucle automático.

## Validación

`node scripts/validate-workspace-session.mjs` monta el proveedor real mediante React Test Renderer con un cliente Supabase simulado. Cubre sesión existente en landing, carga pendiente y bloqueo de escritura, contactos visibles, creación, navegación interna, renovación de token, cierre de sesión durante una consulta, cambio de identidad, error/reintento, entrada directa y callback de login.

No modifica contactos, usuarios, RLS, suscripciones, esquema ni ambientes remotos. La comprobación visual del flujo completo con una cuenta real queda para Preview antes de desplegar esta corrección en producción.
