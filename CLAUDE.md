# Upper Studio — contexto para Claude

Workflow web para que el equipo de Upper (courier internacional, Ecuador) produzca piezas gráficas fieles al Brandbook 2025, con copy validado por Claude y revisión de marca automática. Se publica en claude.ai como artifact y en hosting propio con `server.js`.

Antes de cambiar algo, lee esta guía completa. Las decisiones de abajo las tomó el equipo de marca: no las reviertas sin que lo pidan.

## Flujo (orden fijo, 4 pasos)
No hay paso de Requerimiento: el equipo lo eliminó porque no incidía en la ejecución y no hay base de datos de requerimientos. Internamente los pasos conservan los ids 2 a 5 (`VIEWS`), pero se muestran como 1 a 4.
1. **Formato:** selector de **país** (Ecuador o Colombia; define conocimiento de marca, Do's y Don'ts y textos de los mockups), formato y una de sus 3 composiciones. Cada una muestra un **mockup de ejemplo** (mensaje de muestra `SAMPLE`, en su contexto: app, feed, chat, historia, mostrador o vitrina) y, opcionalmente, su **esquema neutro**. El mockup de Banner in-app recrea la pantalla de inicio real de la app (`drawAppHome`, referencia en `docs/referencias/app-inicio-ecuador.png`) y cambia textos y casilleros según el país. El diseño con el copy del ejecutor solo se ve en el paso 4.
2. **Mensaje:** el ejecutor escribe su propuesta. **"Validar con lineamientos de marca"** corre sin IA ni conexión (`localVerdict`): aplica las reglas de texto y de negocio del país y responde Aprobado o Rehacer, con lo que hay que corregir y lo que pide criterio ("Revísalo tú": tono, etc.). **"Reescribir con IA"** no llama a ninguna API: arma un prompt (`rewPrompt`) con `VOICE`, `knowledgeBlock()`, los Do's y Don'ts del país, la propuesta, el copy actual y las fallas encontradas; lo copia y abre la IA que elija el ejecutor (Claude, ChatGPT, Gemini, Copilot u otra). El ejecutor pega la respuesta (formato VERSIÓN / TITULAR / CTA…), `parseAiResp` llena los 5 campos ("Completado con IA"), deja las otras versiones como alternativas y vuelve a validar.
3. **Diseño**, en este orden: propuesta inicial (vista previa grande) → Visual de la pieza → "¿Qué más necesita la pieza?" (pedido abierto: "Interpretar con IA" copia un prompt corto con `knowledgeBlock()` y las reglas de marca, abre la IA del ejecutor y `parseInterp` aplica la respuesta pegada con las líneas QR/FECHA/CODIGO/…/ACEPTADO/RECHAZADO/FALTA; sin API) → Elementos permitidos → Revisión de marca.
   - Visuales: 6 ilustraciones, foto de producto, **Productos recortados** (1 a 4 PNG sin fondo, grandes y algo girados; `drawRecortes`), **Cards de producto** (hasta 3, tipo tienda: foto, precio en Noland, precio anterior tachado y nombre, todo opcional; con solo foto, la foto ocupa la card completa; esquinas rectas; `drawCards`) y solo cinta. Recortes y cards van sueltos sobre la cinta verde en arco (`tabCard`), no sobre la tarjeta. El pedido libre puede elegir estos visuales y completar nombre y precios de las cards solo con datos que el ejecutor dé (campo `productos`).
4. **Descarga:** las dos combinaciones de color, PNG y **SVG editable** por pieza, y kit .zip de 12 formatos (PNG + SVG) con `revision.txt`.

## Carrusel (solo Redes sociales)
- En Formato, "Tipo: Post | Carrusel" y número de láminas (2 a 10, `CAR_MIN`/`CAR_MAX`). Todas comparten formato, plantilla (no historias) y combinación de color.
- Estado en `S.car` (`on`, `n`, `idx`, `slides`). La lámina activa vive en `S.copy` y `S.extras` (visual, productos, foto), así render y reglas no cambian; `selectSlide`, `withSlide(i, fn)` y `slideTpl(i)` (con `__slide`, que entienden `reviewOf` y `pieceName`) manejan las demás.
- Mensaje: chips de lámina con estado (cumple / por corregir). "Reescribir con IA" pide el carrusel completo (LÁMINA 1…n: portada con gancho, una idea por lámina, CTA solo en la última) y `parseSlides` lo reparte. Las láminas intermedias pueden ir solo con subtítulo.
- Diseño: tira swipe de miniaturas livianas (`drawSwipe`, ~200 px; solo se redibuja la activa al editar) sobre la vista previa grande.
- Descarga: tira swipe por combinación y "Descargar carrusel .zip" (`exportCarousel`): carpetas `png/` y `svg/` numeradas 01…n, `revision.txt` y `mensaje.txt`. No hay kit multiformato en carrusel.

## Video (formato "Video": `vfeed` 4:5 y `vsq` 1:1)
- El ejecutor sube un video madre (MP4/MOV) en Diseño; `L.video` lo dibuja a sangre (`coverMedia`) y encima una capa gráfica estática: pestaña con logo, titular en Noland sobre bloque azul recto (`blockText`, `*` en verde), card de producto con borde verde (`vidCard`, usa `S.extras.productos[0]` y el destacado como resaltado); si el producto no tiene nombre ni precios, la foto se muestra completa con su proporción y solo el borde verde (fotos que ya traen la información), CTA y subtítulo como barra de mensaje. Bloques siempre rectos; sin sombras. No muestra fecha, código ni QR (avisa).
- Vista previa: cuadro elegido con el deslizador y "Reproducir vista previa" (sin sonido). La capa se renderiza una vez (`opt.__overlay`) y se compone sobre cada cuadro.
- Exportación en el navegador (`exportVideo`): canvas + `MediaRecorder` en tiempo real, con el audio del video por Web Audio (opción "Exportar sin audio"). MP4 y MOV en H.264 donde el navegador lo soporte (Chrome, Edge, Safari); si no, WebM con aviso. El MOV es el mismo H.264 con extensión .mov; sin AAC sale sin audio. También "Capa gráfica PNG" transparente para editores de video. Los videos no entran al kit multiformato (`kitTpls`) ni a carruseles; no hay SVG de video.

## Elementos libres (todos los formatos)
- Cada composición se divide en grupos (`EL_SETS`): Banner/Pestaña: logo, textos, visual, destacado y CTA; Cupón: logo, textos, visual; Foto de fondo: logo, textos; Video: logo, titular, card de producto, CTA, mensaje. Se marcan en las composiciones con `elBegin`/`elEnd`.
- `measureEls` dibuja la composición una vez en un contexto de medición (`trackCtx`) para obtener el contorno de cada grupo; con eso se aplica mover (`dx`, `dy` en fracciones del lienzo) y tamaño (`s`, escala desde el centro, 40 % a 220 %). Se mide solo cuando hace falta (`layHas`) y siempre en la vista previa de Diseño.
- En Diseño: arrastrar un elemento lo mueve; al tocarlo aparece un recuadro con una esquina para cambiar el tamaño. Panel "Elementos": tamaño, visibilidad y borde (sin borde, fino, grueso, doble o punteado; verde, crema o azul; siempre recto, `elStroke`). "Restablecer diseño" limpia la composición actual.
- La configuración se guarda por composición (`lay.pos/sty/hide` con claves `layout.elemento`) y en el borrador del navegador; aplica al PNG, al SVG, al kit y al video.
- **Logo:** opcional solo en Video y Foto de fondo (`EL_LOGO_OPT`; la regla pasa con "Logo oculto a propósito"). En las demás se puede mover y redimensionar, pero no ocultar, y la regla de tamaño mínimo mide el logo ya escalado.
- `SvgCtx` soporta `setLineDash` (punteado en el SVG).
- **Productos recortados libres:** cada producto es un elemento propio (`p0`…`p3`): se arrastra y redimensiona en la vista previa (gana el elemento más pequeño bajo el cursor), se reordena con ↑/↓ y tiene giro, tamaño y **silueta** (`silImg`: contorno, línea separada o sombra plana, en verde, crema o azul; se genera desde la transparencia del PNG y se guarda en caché). La sombra es plana, sin desenfoque, para no romper la regla de "sin sombras".

## Copy
- Campos del Mensaje: antetítulo, titular, subtítulo, destacado y llamado a la acción. **Empiezan vacíos.** La propuesta escrita no se guarda en el borrador del navegador.
- Elementos permitidos (paso 4), todos **opcionales y vacíos por defecto**: nota del destacado, fecha, código, legal, QR, logos de aliados (máx. 3) y mensaje de WhatsApp/push. Nunca se llenan solos; solo el ejecutor o Claude a pedido explícito, marcando "Completado con IA".
- El pedido abierto del paso 4 no toca los campos del Mensaje.
- **Jerarquía dentro de un texto** (titular, subtítulo y todo lo que pasa por `text()`): `*resaltado*`, `^más grande^` (×1,6), `~más pequeño~` (×0,62) y `|` para salto de línea. Barra de botones (Resaltar, A+, A−, Salto) en Mensaje y en Diseño ("Editar textos aquí"), `fmtBar`/`bindFmt`. Las líneas toman la altura de su palabra más grande y las palabras se alinean por la base. Contadores, reglas y nombres de archivo ignoran las marcas.
- Tono: skill Upper UX Writer, embebido en la constante `VOICE` de `index.html`. La app no depende del skill instalado.

## Marca
- Colores: solo Upper Dark Blue `#141D30`, Green `#CDF5A3` y Cream Green `#F0FFE8`. Combinaciones: verde + azul oscuro, y azul oscuro + claro Upper.
- Tipografías: Noland Bold (titulares, siempre en mayúsculas) y **Rethink Sans** (cuerpo, decisión del equipo en lugar de Tropiline Sans). Van **incrustadas en `index.html`** (`FONT_DATA`, base64 de `fonts/Noland-Bold.otf` y `fonts/RethinkSans-Variable.ttf`): la página funciona en cualquier web sin la carpeta `fonts/`, no hay tipografías de reemplazo ni se pueden cambiar desde la interfaz. Si no cargan, `gate()` bloquea toda descarga (regla `d_type`, garantizada por la plataforma). Si cambia una versión, regenera `FONT_DATA` desde `fonts/`. Noland es licenciada: el repositorio debe seguir privado y la página solo en webs internas de Upper.
- Logo: vector oficial embebido (`LOGO_D`), color según el fondo, mínimo 35 px en pantalla / 0,5 cm impreso.
- Ilustraciones: solo las 6 oficiales de `assets/ilustraciones/`, versión `_claro` u `_oscuro` según el fondo. Colores normalizados a la paleta exacta. Original en `fuentes/NUEVAS_ILUSTRACIONES.ai`.
- **Sin botones ni bloques redondeados con texto.** El CTA va como texto en Noland, mayúsculas, con el mismo resaltado que las palabras marcadas con `*` (fondo verde de esquinas rectas, texto azul oscuro; `ctaText`). No se agregan elementos que no estén en el copy (nada de flechas). Antetítulo, destacado, fecha y código también van como texto, sin cajas ni contornos. El recuadro del QR es de esquinas rectas.
- Sin emojis en la gráfica (van en el mensaje que acompaña la pieza), sin gradientes, sombras ni fondos fotográficos completos. **Excepción pedida por el equipo:** la composición **Foto de fondo** (`L.foto`, plantillas `foto` 4:5 y `fotostory` 9:16 en Redes sociales), con foto a sangre y texto de marca abajo, centrado: antetítulo en Rethink Sans espaciado, titular en Noland con el resaltado recto de `*`, destacado, subtítulo y CTA. El logo va en una pestaña verde sólida, nunca sobre la foto (regla `n_logo_bg`). Sin sombras ni degradados para legibilidad: `photoLum` avisa si la foto es clara donde va el texto; encuadre arriba/centro/abajo (`fondoY`). No muestra código ni QR. La foto es por lámina en carrusel. Referencias en `docs/referencias/social/foto-*.webp`.

## Conocimiento de marca por país
- Panel "Conocimiento de marca" con dos pestañas: Ecuador y Colombia. Base inicial en `KB_DEFAULT` (`index.html`), tomada de upper.com.ec/ayudaecuador y upperlogistics.com/es/ayuda; copia de referencia en `docs/conocimiento/`.
- El país elegido en Formato decide qué conocimiento y qué reglas aplica Claude: `knowledgeBlock()` se agrega a los prompts de validar mensaje, revisar tono e interpretar pedidos. Claude no debe afirmar datos que no estén ahí.
- Diferencias clave: Ecuador tiene bodegas en Miami y Madrid, tarifas con "+ IVA", tasa de USD 20 por orden (la cobra el gobierno), 4x4 y retiro en 4 agencias (domicilio cuesta USD 3,50 + IVA). Colombia solo tiene bodega en Miami (Doral), USD 5 por libra con entrega a la puerta incluida e impuestos desde USD 200.
- Tiempos de Ecuador: el dato operativo es de 7 a 10 días hábiles desde Miami (confirmado por el equipo). "En 7 días" se mantiene como claim de marketing aprobado para Ecuador; en Colombia solo se usan los tiempos publicados.
- Sección "Formatos de diseño para redes" (`ec_disenos`, `co_disenos`): patrones de las piezas de referencia en `docs/referencias/social/`; Claude la usa al interpretar pedidos de diseño. Lo que choca con la revisión de marca (emojis, cápsulas redondeadas, degradados) no se replica. Si el conocimiento ya fue editado, `kbOf` suma al final las secciones nuevas de `KB_DEFAULT`.
- Lo editado se guarda compartido: `config/conocimiento` en el artifact y `conocimiento.json` en `DATA_DIR`. Los cambios quedan en el historial.

## Revisión de marca
- Catálogo en `BRAND_RULES` y reglas de negocio por país en `BUSINESS_RULES` (`index.html`); cada regla tiene `pais` (`all`, `ec` o `co`) y solo aplica a campañas de ese país. Las de negocio se editan igual que las del brandbook (opción B).
- Catálogo de marca en `BRAND_RULES`. Cada regla tiene tipo (Do / Don't), verificación (automática, Claude, ejecutor o garantizada por la plataforma) y severidad (Bloqueante, Alerta, Recomendación).
- Reglas de negocio con verificación automática por patrones de texto (sin IA): tarifas con + IVA, domicilio gratis, "sin impuestos" sin condición, origen España o agencias en Colombia, tiempos no publicados, productos restringidos y jerga logística.
- Reglas del equipo de marca: titular ≤ 7 palabras, subtítulo ≤ 15 palabras, un solo CTA, sin botones ni bloques redondeados, no sobreinformar (≤ 30 palabras sin fecha, código ni legal) y el tono del skill.
- Edición (opción B): las reglas del brandbook no se borran; se pueden suavizar o desactivar **con motivo obligatorio**. Las del equipo se agregan, editan y borran libremente. Todo queda en el historial.
- Al descargar con incumplimientos aparece un aviso: Alerta deja continuar; Bloqueante exige un motivo. Cada excepción se registra con usuario, fecha y motivo.
- Almacenamiento compartido: en claude.ai, la base `db` del artifact (`config/reglas`, `cambios`, `excepciones`); en hosting propio, `DATA_DIR` (`reglas.json`, `cambios.jsonl`, `excepciones.jsonl`).

## Exportación SVG editable
- `SvgCtx` imita el contexto 2D del canvas y escribe SVG; `renderSvg()` corre las mismas composiciones (`L.*`) que el PNG, así ambos salen idénticos.
- Textos editables: una línea = un `<text>`, palabras resaltadas como `<tspan>`; fuentes "Noland" (700) y "Rethink Sans". Logo como `<path>` (`LOGO_D`), ilustraciones como SVG anidado (texto guardado en `img.__svg` al cargarlas), fotos y QR como imagen incrustada.
- No se genera .AI (formato propietario): el SVG se abre en Illustrator y se guarda como .AI.
- Si una plantilla nueva usa otra función del canvas, agrégala a `SvgCtx` y compara PNG vs SVG de las 12 piezas.

## Técnica
- `index.html`: app completa y autocontenida, escrita como fragmento (sin `<html>`/`<head>`), formato que exige el artifact de claude.ai. `server.js` le agrega el esqueleto al servirla.
- El artifact publicado vive en https://claude.ai/artifact/PVXfvYdm6SMJGQyHL5gZqo. Capacidades: `sample`, `downloads`, `db`, `user` (perfil).
- Vercel (`upperdesignstudio.vercel.app`): `npm run build` (`scripts/build.mjs`) genera `public/` con la página envuelta por `lib/pagina.js`; `server.js` queda como función solo para `/api`; `proxy.js` (Routing Middleware) pide usuario y contraseña con `STUDIO_USERS`. Sin almacenamiento externo, en Vercel los endpoints de reglas y conocimiento responden 404 y la app usa el navegador. No sirvas archivos estáticos desde `server.js` en Vercel: no se incluyen en la función.
- `server.js`: Node 20+, SDK `@anthropic-ai/sdk`, modelo por defecto `claude-opus-5-5`. Usuarios en `STUDIO_USERS="nombre:clave,…"`. La API key nunca llega al navegador.
- Plantillas: 3 composiciones adaptables (`L.hero`, `L.tab`, `L.cupon`) × 4 formatos = 12 piezas, más Foto de fondo (`L.foto`) en Redes sociales: 14 en total. Las medidas se calculan en proporción al lienzo.
- Verificación visual: prueba solo la pieza afectada (no renderices las 12 plantillas salvo que se pida): el equipo pidió ahorrar tokens.

## Pendientes conocidos
- ¿Suavizar una regla del brandbook debe requerir aprobación de un rol de marca?
- Severidades por defecto y el límite de 30 palabras están por validar con el equipo.
- Imprenta: marcas de corte, PDF y zona de sangrado visible.
- Formatos por sumar: header de newsletter, banners de anuncios de la app y piezas animadas.
- La composición "Welcome to the Upper Club" (páginas 3 y 4 del .ai) no se usa todavía.
