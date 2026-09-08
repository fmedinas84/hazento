# Editor visual de «Quién soy»

El editor de Configuración usa Tiptap con un esquema limitado a párrafos, dos niveles de título, listas ordenadas/no ordenadas y las marcas negrita, cursiva y subrayado. No admite imágenes, enlaces, tablas, colores, código ni HTML arbitrario. Se carga de forma diferida; Partners no incluye Tiptap.

La biografía sigue almacenada en el mismo campo `bio`, sin migración. Los cambios nuevos utilizan el prefijo `hazento-bio-v2:` seguido de un árbol JSON compacto. `packages/partners-config/bio-format.ts` centraliza la codificación, lectura y límite de 1200 caracteres de almacenamiento (incluido el formato). Las descripciones anteriores de texto y Markdown siguen siendo legibles y se convierten visualmente al abrir el editor; no se reescriben automáticamente.

El lector público acepta exclusivamente los nodos y marcas conocidos y genera elementos React con texto escapado, nunca `innerHTML`. Los títulos 1 y 2 del contenido se muestran como h3 y h4 dentro de la jerarquía de la landing. Cambios que exceden el límite se rechazan con un aviso; una descripción antigua extensa puede acortarse progresivamente, pero no se guarda una representación que exceda el límite.

App y Partners deben desplegar esta versión antes de comenzar a guardar el formato v2. No se modificó Supabase ni producción durante la implementación.

Validación: tests de compatibilidad, escape de HTML, lista de formatos permitidos y serialización reversible en `scripts/validate-rich-bio.mjs`. Prueba de navegador aislada sin datos reales: formatos combinados, listas, guardar/recargar local, 360 px sin desbordamiento y escritorio; sin errores de navegador observados. La persistencia remota debe comprobarse en Preview con una cuenta QA.
