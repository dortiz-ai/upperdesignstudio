# Upper Studio — contexto para Claude

Workflow web para que el equipo de Upper (courier internacional, Ecuador) produzca piezas gráficas fieles al Brandbook 2025, con copy validado por Claude y revisión de marca automática. Se publica en claude.ai como artifact y en hosting propio con `server.js`.

Antes de cambiar algo, lee esta guía completa. Las decisiones de abajo las tomó el equipo de marca: no las reviertas sin que lo pidan.

## Flujo (orden fijo, 4 pasos)
No hay paso de Requerimiento: el equipo lo eliminó porque no incidía en la ejecución y no hay base de datos de requerimientos. Internamente los pasos conservan los ids 2 a 5 (`VIEWS`), pero se muestran como 1 a 4.
1. **Formato:** selector de **país** (Ecuador o Colombia; define conocimiento de marca, Do's y Don'ts y textos de los mockups), formato y una de sus 3 composiciones. Cada una muestra un **mockup de ejemplo** (mensaje de muestra `SAMPLE`, en su contexto: app, feed, chat, historia, mostrador o vitrina) y, opcionalmente, su **esquema neutro**. El mockup de Banner in-app recrea la pantalla de inicio real de la app (`drawAppHome`, referencia en `docs/referencias/app-inicio-ecuador.png`) y cambia textos y casilleros según el país. El diseño con el copy del ejecutor solo se ve en el paso 4.
2. **Mensaje:** el ejecutor escribe su propuesta → "Validar con Claude" evalúa y **completa los 5 campos del copy** (marcados "Completado por Claude"; la marca desaparece al editarlos) y ofrece 2 versiones alternativas. Al costado, solo la revisión de reglas de texto.
3. **Diseño**, en este orden: propuesta inicial (vista previa grande) → Visual de la pieza → "¿Qué más necesita la pieza?" (pedido abierto que Claude interpreta) → Elementos permitidos → Revisión de marca.
4. **Descarga:** las dos combinaciones de color, PNG y **SVG editable** por pieza, y kit .zip de 12 formatos (PNG + SVG) con `revision.txt`.

## Copy
- Campos del Mensaje: antetítulo, titular, subtítulo, destacado y llamado a la acción. **Empiezan vacíos.**
- Elementos permitidos (paso 4), todos **opcionales y vacíos por defecto**: nota del destacado, fecha, código, legal, QR, logos de aliados (máx. 3) y mensaje de WhatsApp/push. Nunca se llenan solos; solo el ejecutor o Claude a pedido explícito, marcando "Completado por Claude".
- El pedido abierto del paso 4 no toca los campos del Mensaje.
- Tono: skill Upper UX Writer, embebido en la constante `VOICE` de `index.html`. La app no depende del skill instalado.

## Marca
- Colores: solo Upper Dark Blue `#141D30`, Green `#CDF5A3` y Cream Green `#F0FFE8`. Combinaciones: verde + azul oscuro, y azul oscuro + claro Upper.
- Tipografías: Noland Bold (titulares, siempre en mayúsculas) y **Rethink Sans** (cuerpo, decisión del equipo en lugar de Tropiline Sans). Están en `fonts/`; Noland es licenciada: el repositorio debe seguir privado.
- Logo: vector oficial embebido (`LOGO_D`), color según el fondo, mínimo 35 px en pantalla / 0,5 cm impreso.
- Ilustraciones: solo las 6 oficiales de `assets/ilustraciones/`, versión `_claro` u `_oscuro` según el fondo. Colores normalizados a la paleta exacta. Original en `fuentes/NUEVAS_ILUSTRACIONES.ai`.
- **Sin botones ni bloques redondeados con texto.** El CTA va como texto en Noland, mayúsculas, con el mismo resaltado que las palabras marcadas con `*` (fondo verde de esquinas rectas, texto azul oscuro; `ctaText`). No se agregan elementos que no estén en el copy (nada de flechas). Antetítulo, destacado, fecha y código también van como texto, sin cajas ni contornos. El recuadro del QR es de esquinas rectas.
- Sin emojis en la gráfica (van en el mensaje que acompaña la pieza), sin gradientes, sombras ni fondos fotográficos completos.

## Conocimiento de marca por país
- Panel "Conocimiento de marca" con dos pestañas: Ecuador y Colombia. Base inicial en `KB_DEFAULT` (`index.html`), tomada de upper.com.ec/ayudaecuador y upperlogistics.com/es/ayuda; copia de referencia en `docs/conocimiento/`.
- El país elegido en Formato decide qué conocimiento y qué reglas aplica Claude: `knowledgeBlock()` se agrega a los prompts de validar mensaje, revisar tono e interpretar pedidos. Claude no debe afirmar datos que no estén ahí.
- Diferencias clave: Ecuador tiene bodegas en Miami y Madrid, tarifas con "+ IVA", tasa de USD 20 por orden (la cobra el gobierno), 4x4 y retiro en 4 agencias (domicilio cuesta USD 3,50 + IVA). Colombia solo tiene bodega en Miami (Doral), USD 5 por libra con entrega a la puerta incluida e impuestos desde USD 200.
- Tiempos de Ecuador: el dato operativo es de 7 a 10 días hábiles desde Miami (confirmado por el equipo). "En 7 días" se mantiene como claim de marketing aprobado para Ecuador; en Colombia solo se usan los tiempos publicados.
- Lo editado se guarda compartido: `config/conocimiento` en el artifact y `conocimiento.json` en `DATA_DIR`. Los cambios quedan en el historial.

## Revisión de marca
- Catálogo en `BRAND_RULES` y reglas de negocio por país en `BUSINESS_RULES` (`index.html`); cada regla tiene `pais` (`all`, `ec` o `co`) y solo aplica a campañas de ese país. Las de negocio se editan igual que las del brandbook (opción B).
- Catálogo de marca en `BRAND_RULES`. Cada regla tiene tipo (Do / Don't), verificación (automática, Claude, ejecutor o garantizada por la plataforma) y severidad (Bloqueante, Alerta, Recomendación).
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
- Plantillas: 3 composiciones adaptables (`L.hero`, `L.tab`, `L.cupon`) × 4 formatos = 12 piezas. Las medidas se calculan en proporción al lienzo.
- Verificación visual: prueba solo la pieza afectada (no renderices las 12 plantillas salvo que se pida): el equipo pidió ahorrar tokens.

## Pendientes conocidos
- ¿Suavizar una regla del brandbook debe requerir aprobación de un rol de marca?
- Severidades por defecto y el límite de 30 palabras están por validar con el equipo.
- Imprenta: marcas de corte, PDF y zona de sangrado visible.
- Formatos por sumar: header de newsletter, banners de anuncios de la app y piezas animadas.
- La composición "Welcome to the Upper Club" (páginas 3 y 4 del .ai) no se usa todavía.
