# Upper Studio — contexto para Claude

Workflow web para que el equipo de Upper (courier internacional, Ecuador) produzca piezas gráficas fieles al Brandbook 2025, con copy validado por Claude y revisión de marca automática. Se publica en claude.ai como artifact y en hosting propio con `server.js`.

Antes de cambiar algo, lee esta guía completa. Las decisiones de abajo las tomó el equipo de marca: no las reviertas sin que lo pidan.

## Flujo (orden fijo)
1. **Requerimiento:** campaña, objetivo, canal, vigencia y descripción.
2. **Formato:** formato y una de sus 3 composiciones. Se muestran **esquemas neutros**, nunca el diseño con copy: el diseño condiciona la ejecución y solo se ve en el paso 4.
3. **Mensaje:** el ejecutor escribe su propuesta → "Validar con Claude" evalúa y **completa los 5 campos del copy** (marcados "Completado por Claude"; la marca desaparece al editarlos) y ofrece 2 versiones alternativas. Al costado, solo la revisión de reglas de texto.
4. **Diseño**, en este orden: propuesta inicial (vista previa grande) → Visual de la pieza → "¿Qué más necesita la pieza?" (pedido abierto que Claude interpreta) → Elementos permitidos → Revisión de marca.
5. **Descarga:** las dos combinaciones de color, PNG por pieza y kit .zip de 12 formatos con `revision.txt`.

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
- **Un solo bloque redondeado con texto por pieza: el CTA.** Antetítulo, destacado, fecha y código van como texto, sin cajas ni contornos.
- Sin emojis en la gráfica (van en el mensaje que acompaña la pieza), sin gradientes, sombras ni fondos fotográficos completos.

## Revisión de marca
- Catálogo en `BRAND_RULES` (`index.html`). Cada regla tiene tipo (Do / Don't), verificación (automática, Claude, ejecutor o garantizada por la plataforma) y severidad (Bloqueante, Alerta, Recomendación).
- Reglas del equipo de marca: titular ≤ 7 palabras, subtítulo ≤ 15 palabras, un solo CTA, un solo bloque, no sobreinformar (≤ 30 palabras sin fecha, código ni legal) y el tono del skill.
- Edición (opción B): las reglas del brandbook no se borran; se pueden suavizar o desactivar **con motivo obligatorio**. Las del equipo se agregan, editan y borran libremente. Todo queda en el historial.
- Al descargar con incumplimientos aparece un aviso: Alerta deja continuar; Bloqueante exige un motivo. Cada excepción se registra con usuario, fecha y motivo.
- Almacenamiento compartido: en claude.ai, la base `db` del artifact (`config/reglas`, `cambios`, `excepciones`); en hosting propio, `DATA_DIR` (`reglas.json`, `cambios.jsonl`, `excepciones.jsonl`).

## Técnica
- `index.html`: app completa y autocontenida, escrita como fragmento (sin `<html>`/`<head>`), formato que exige el artifact de claude.ai. `server.js` le agrega el esqueleto al servirla.
- El artifact publicado vive en https://claude.ai/artifact/PVXfvYdm6SMJGQyHL5gZqo. Capacidades: `sample`, `downloads`, `db`, `user` (perfil).
- `server.js`: Node 20+, SDK `@anthropic-ai/sdk`, modelo por defecto `claude-opus-5-5`. Usuarios en `STUDIO_USERS="nombre:clave,…"`. La API key nunca llega al navegador.
- Plantillas: 3 composiciones adaptables (`L.hero`, `L.tab`, `L.cupon`) × 4 formatos = 12 piezas. Las medidas se calculan en proporción al lienzo.
- Para verificar cambios visuales, renderiza las 12 plantillas en ambas combinaciones con Playwright y revisa que pasen la revisión de marca.

## Pendientes conocidos
- ¿Suavizar una regla del brandbook debe requerir aprobación de un rol de marca?
- Severidades por defecto y el límite de 30 palabras están por validar con el equipo.
- Imprenta: marcas de corte, PDF y zona de sangrado visible.
- Formatos por sumar: header de newsletter, banners de anuncios de la app y piezas animadas.
- La composición "Welcome to the Upper Club" (páginas 3 y 4 del .ai) no se usa todavía.
