# Sistema visual

## Dirección

Taste Skill, modo app: `framed-sheet`, seed `855823077`. Es una herramienta documental para consultar durante una migración técnica, no una landing comercial.

El explorador de APIs adopta una dirección de **digital twin industrial**: escena oscura neutra, geometría con profundidad real, interfaz documental clara y verde azulado como único acento. No usa gradientes, brillos, partículas ni animación continua.

Pregunta principal: **¿qué debo construir primero para alcanzar un backend mid-advanced y qué debo reservar para el nivel advanced?**

## Identidad

La secuencia propia del proyecto —CHASIS, MOTOR, TAPICERÍA, RUEDAS, TERMINADO— se convierte en el mapa de la migración. Un bloque de niveles separa visualmente las órdenes de fabricación mid-advanced de la simulación advanced. La marca dibuja la fábrica original y el documento conserva nombres reales del dominio. IBM Plex Sans se usa en interfaz y lectura; IBM Plex Mono queda limitado a código, rutas e identificadores.

## Tokens y composición

- Marco verde grisáceo `#f2f6f5`, hoja blanca y tinta `#131416`.
- Acento `#176b62` reservado a selección, foco y progreso.
- Hoja inset 8px, radio 16px, borde tenue y sin sombra.
- Navegación lateral de 228px y barra superior de 48px.
- En móvil desaparece el marco y la navegación se abre como hoja completa.

## Interacción

- Navegación mediante enlaces reales y hashes profundos.
- Búsqueda reflejada en `?q=` y accesible con `Ctrl/Cmd + K`.
- Escape cierra búsqueda y menú móvil, devolviendo el foco al disparador.
- Código copiable con confirmación `aria-live`.
- La fuente Markdown completa puede descargarse.
- El capítulo 18 incorpora un mapa Three.js de las APIs: no anima continuamente, se carga al acercarse a la sección y ofrece botones equivalentes para teclado y móvil.
- En escritorio, el mapa ocupa el 67 % y el inspector con scroll propio el 33 %. En móvil se apilan mapa, endpoints y contrato.
- La selección se conserva en `?api=<módulo>&endpoint=<operación>` y Escape devuelve a la arquitectura completa.
- Sin animaciones de entrada: únicamente feedback de controles y apertura de paneles, con `prefers-reduced-motion`.

## Adaptaciones justificadas

La documentación contiene más de 50 filas de tablas y numerosos bloques de código. Se mantienen reglas y bordes tenues porque son estructura funcional de una app documental. No se usan tarjetas KPI decorativas, gráficos inventados, gradientes, sombras ni iconos coloreados.
