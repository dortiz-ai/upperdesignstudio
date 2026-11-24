# Upper Studio v0.2

Workflow web para producir piezas de Upper fieles al Brandbook 2025: requerimiento → formato → copy asistido por Claude → extras → propuestas y kit multiformato.

## Qué cambió frente a v0.1

| Área | v0.1 | v0.2 |
|---|---|---|
| Cromática | Azul #027BFF, amarillo, ámbar (paleta anterior) | Solo Upper Dark Blue #141D30, Green #CDF5A3, Cream Green #F0FFE8 |
| Combinaciones | 2 esquemas inventados | Las 2 jerarquías del brandbook: verde + azul oscuro y azul oscuro + claro Upper |
| Logo | Texto "upper" provisional o PNG subido | Vector oficial embebido, color automático por jerarquía, tamaño mínimo verificado (35 px / 0,5 cm) |
| Tipografía | Poppins | Noland Bold (titulares, mayúsculas) + Rethink Sans (cuerpo), incluidas en `fonts/` |
| Composiciones | Cupón, split, tira, stack | Hero con cinta en U, pestaña de logo (piezas sociales), cupón tipo gift card |
| Elementos gráficos | Caja amarilla dibujada, sello amarillo | Cinta Upper, las 6 ilustraciones oficiales (versión clara y oscura), resaltado verde en titulares (`*así*`) |
| Formatos | 9 plantillas | 12 plantillas: in-app, redes, WhatsApp, hablador impreso |
| Salida | 1 PNG | PNG y SVG editable por pieza + kit .zip con las 12 adaptaciones, el mensaje y la revisión |
| IA | Solo dentro de claude.ai | claude.ai **o** servidor propio (`server.js`), con la API key fuera del navegador |

## Ejecutar en local

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... STUDIO_USERS="ana:clave-ana,luis:clave-luis" npm start
```

Abre http://localhost:8080.

## Desplegar en hosting propio

Necesita un hosting que ejecute Node 20+ (VPS, Render, Railway, Fly.io, Cloud Run o Docker). Un hosting compartido solo con PHP no sirve tal cual: ver "Próximos pasos".

Docker:

```bash
docker build -t upper-studio .
docker run -p 8080:8080 -e ANTHROPIC_API_KEY=sk-ant-... -e STUDIO_USERS="ana:clave-ana,luis:clave-luis" -v upper-data:/app/data upper-studio
```

Variables:

- `ANTHROPIC_API_KEY` (obligatoria para la IA). Sin ella la app funciona, pero sin validación de copy.
- `STUDIO_USERS`: usuarios del equipo, `nombre:clave` separados por comas. Protegen la herramienta y firman cada cambio de reglas y cada excepción. Sin usuarios, cualquiera con la URL entra y gasta tu cuota de API.
- `DATA_DIR` (por defecto `./data`): dónde se guardan `reglas.json`, `cambios.jsonl` y `excepciones.jsonl`. Respáldala; en Docker, móntala como volumen.
- `UPPER_MODEL` (por defecto `claude-opus-5-5`) y `UPPER_EFFORT` (`low`, `medium`, `high`; por defecto `medium`).

El servidor limita cada IP a 40 consultas cada 10 minutos y solo sirve `index.html`, `assets/` y `fonts/`.

## Revisión de marca

Cada pieza se revisa contra Do's y Don'ts en vivo, junto a la vista previa.

- **Cómo se verifica:** automática (la plataforma mide), con Claude (tono y contenido), confirmada por el ejecutor, o garantizada por la plataforma (las plantillas no permiten romperla).
- **Severidad:** Bloqueante (para continuar hay que escribir un motivo), Alerta (avisa y deja continuar) y Recomendación (solo informa).
- **Edición (opción B):** las reglas del brandbook no se borran; se pueden suavizar o desactivar escribiendo el motivo. Las reglas del equipo se agregan, editan y eliminan libremente. Todo queda en el historial.
- **Al descargar:** si algo no cumple, aparece un aviso con la opción de volver a corregir o continuar. Las excepciones se registran con nombre, fecha y motivo, y el .zip incluye `revision.txt`.
- **Compartidas:** en el servidor propio se guardan en `DATA_DIR`; en claude.ai, en la base de datos del artifact. Sin ninguna de las dos, quedan solo en el navegador y el panel lo indica.

## Desplegar en Vercel

El repositorio ya trae la configuración (`vercel.json`, `proxy.js` y `scripts/build.mjs`):

- En cada despliegue, `npm run build` genera `public/` con la página, el logo, las ilustraciones y las tipografías. Vercel la sirve desde su CDN.
- `server.js` atiende solo `/api` (Claude y estado del servidor).
- `proxy.js` pide usuario y contraseña antes de mostrar cualquier ruta.

Variables de entorno en Vercel (Settings → Environment Variables, para Production y Preview):

- `ANTHROPIC_API_KEY`: activa la validación con Claude.
- `STUDIO_USERS`: usuarios del equipo, `nombre:clave` separados por comas. **Sin esta variable, el sitio queda abierto a cualquiera con el enlace.**

Después de agregarlas, vuelve a desplegar (Deployments → ⋯ → Redeploy).

Limitación actual: Vercel no guarda archivos entre solicitudes, así que en Vercel las reglas, el conocimiento de marca y las excepciones quedan en el navegador de cada persona, y la app lo indica. Para compartirlos hay que conectar un almacenamiento externo (por ejemplo Upstash Redis desde el Marketplace de Vercel); en el servidor propio (`npm start` o Docker) ya se comparten.

## Tipografías

`fonts/` trae Noland Bold y Rethink Sans variable. Noland es una fuente con licencia: no publiques la carpeta en un repositorio público. Si falta algún archivo, la app usa Anton o Lexend y cada pieza muestra la alerta "Tipografía provisional".

## Ilustraciones

`assets/ilustraciones/` tiene las 6 ilustraciones de `fuentes/NUEVAS_ILUSTRACIONES.ai` en SVG, cada una en dos versiones: `_claro` (línea azul, para fondos claros) y `_oscuro` (línea crema, para fondos azules). La app elige la versión según el fondo. Los colores se ajustaron a la paleta exacta del brandbook (el .ai traía #1D2233, #000000 y #D6F3A4).

Para agregar una ilustración nueva: exporta las dos versiones como `nombre_claro.svg` y `nombre_oscuro.svg` sin fondo de mesa de trabajo, cópialas en esa carpeta y añade `['nombre','Etiqueta']` a la lista `ILUS` en `index.html`.

## Estructura

```
index.html       la app completa (también se publica tal cual en claude.ai)
server.js        servidor estático + proxy a la API de Claude
assets/          logo oficial e ilustraciones en SVG
fonts/           tipografías (Noland es licenciada)
fuentes/         archivos originales de diseño (.ai); el servidor no los publica
```
