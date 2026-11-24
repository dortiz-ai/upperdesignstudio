# Integrar Upper Studio en la web admin interna

Guía para el equipo de desarrollo. Upper Studio es una página estática autocontenida (HTML + JS + canvas). No necesita base de datos ni API de IA para funcionar. Lo único opcional es un backend pequeño para que las reglas y el conocimiento de marca sean compartidos.

## 1. Qué se entrega

```bash
npm ci
npm run build
```

`npm run build` genera la carpeta `public/`, que es todo lo que hay que publicar:

```
public/
  index.html                 la app completa (tipografías incrustadas en base64)
  assets/ilustraciones/*.svg  las 6 ilustraciones oficiales (12 archivos: claro y oscuro)
  assets/Logo_Upper.svg
  fonts/                      copia de respaldo; la app no la necesita
```

Todas las rutas que usa la app son **relativas** (`assets/...`, `api/...`). Se puede servir en cualquier subruta, por ejemplo `/studio/`.

## 2. Forma recomendada: ruta propia + iframe

1. Servir `public/` como estático en el mismo dominio del admin, por ejemplo en `https://admin.dominio/studio/`. Así no hay problemas de CORS ni de cookies.
2. Proteger esa ruta con el login del admin, igual que cualquier otra sección interna. **Obligatorio:** la página lleva la tipografía Noland, que es licenciada, y no puede quedar pública.
3. Mostrarla dentro del admin con un iframe:

```html
<iframe src="/studio/" title="Upper Studio"
  style="width:100%;height:calc(100vh - 64px);border:0"
  allow="clipboard-write"
  sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals"></iframe>
```

Por qué cada permiso:
- `allow-downloads`: PNG, SVG y .zip.
- `allow-popups` y `allow-popups-to-escape-sandbox`: los botones "Reescribir con IA" e "Interpretar con IA" abren Claude, ChatGPT, Gemini o Copilot en otra pestaña.
- `allow="clipboard-write"`: esos mismos botones copian el prompt al portapapeles.
- `allow-modals`: el aviso de reglas antes de descargar usa `<dialog>`.

El iframe es preferible a incrustar el HTML directo en una vista del admin. La app usa variables globales y CSS propio, y dentro del iframe no choca con el admin.

Alternativa sin iframe: abrir `/studio/` como página completa desde el menú del admin.

## 3. Datos compartidos del equipo (opcional, recomendado)

Sin backend, la app funciona completa, pero lo que cada persona edita (reglas de marca, conocimiento, excepciones) queda solo en su navegador. Para que sea compartido, la app busca estos endpoints **relativos a su propia URL**, por ejemplo `/studio/api/reglas`:

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET api/reglas` | — | `{ config: {overrides, custom, updatedAt}, me: "nombre del usuario" }` |
| `PUT api/reglas` | `{ config, change: {accion, regla, motivo} }` | `{ ok: true }` y guarda `change` en el historial |
| `GET api/conocimiento` | — | `{ config: {ec: [...] \| null, co: [...] \| null, updatedAt} }` |
| `PUT api/conocimiento` | `{ config, change }` | `{ ok: true }` y guarda `change` en el historial |
| `GET api/cambios?n=40` | — | `{ items: [ {at, by, accion, regla, motivo} ] }`, la más reciente primero |
| `GET api/excepciones?n=40` | — | `{ items: [ ... ] }`, la más reciente primero |
| `POST api/excepciones` | `{ pais, campana, esquema, piezas[], reglas[], comentario }` | `{ ok: true }` |

Cómo detecta el modo la app: si `GET api/reglas` responde 200, usa el servidor; si no, usa el navegador.

Hay dos formas de dar estos endpoints:

**A. Usar `server.js` tal cual (lo más rápido).** Es Node 20+ sin dependencias de base de datos y guarda JSON en `DATA_DIR`. Se corre como servicio (hay `Dockerfile`) y el admin hace de proxy inverso de `/studio/` hacia él:

```bash
DATA_DIR=/var/lib/upper-studio PORT=8080 node server.js
```

`DATA_DIR` debe estar en un volumen persistente. `server.js` también sirve `index.html` y `assets/`, así que el proxy puede mandar todo `/studio/` a ese servicio, quitando el prefijo `/studio`.

**B. Implementarlos en el backend del admin.** Hay que respetar el contrato de la tabla. La validación y los límites de cada campo están en `server.js`, en las funciones `cleanRules`, `cleanKb` y `cleanException`: conviene copiarlas.

**Usuario.** Hoy `server.js` identifica a la persona con Basic Auth (`STUDIO_USERS`). Dentro del admin conviene usar su sesión: el proxy agrega un header con el nombre del usuario logueado y `authUser()` en `server.js` lo lee en lugar de Basic Auth. Ese nombre queda en el historial de cambios y en las excepciones.

## 4. IA

No hace falta API key. "Reescribir con IA" e "Interpretar con IA" copian un prompt y abren la IA que tenga cada persona; no hay llamadas desde el servidor. Los endpoints `api/health` y `api/claude` de `server.js` son opcionales: sin ellos, la app muestra "IA: sin conexión" y todo sigue funcionando.

## 5. Dependencias externas

La página carga dos librerías desde cdnjs:
- `qrcodejs 1.0.0`: QR en las piezas.
- `jszip 3.10.1`: kit y carruseles en .zip.

Si la red interna o la CSP del admin bloquean `cdnjs.cloudflare.com`, hay que permitir ese host o descargar los dos archivos, servirlos junto a `index.html` y cambiar las dos etiquetas `<script>` al inicio de `index.html`.

Las tipografías no dependen de nada externo: van incrustadas.

Si el admin usa Content-Security-Policy, la página necesita:
- `script-src 'unsafe-inline' https://cdnjs.cloudflare.com` y `style-src 'unsafe-inline'`: la app usa script y estilos inline;
- `font-src data:` e `img-src data: blob:`;
- `connect-src 'self'`.

## 6. Actualizaciones

El repositorio es la fuente: los cambios se hacen sobre `index.html` (ver `CLAUDE.md`). Para actualizar el admin: `git pull`, `npm run build` y volver a publicar `public/`. Los datos del equipo en `DATA_DIR` o en el backend no se tocan.

## 7. Prueba de aceptación

- [ ] La página abre en `/studio/` dentro del admin y pide login del admin.
- [ ] El Kit de marca muestra Noland Bold y Rethink Sans en verde (cargadas).
- [ ] Las ilustraciones se ven en el paso Diseño (carga `assets/ilustraciones`).
- [ ] Descarga un PNG, un SVG y un carrusel .zip (carpetas `png/` y `svg/`).
- [ ] "Reescribir con IA" copia el prompt y abre la IA en otra pestaña.
- [ ] Con backend: una regla editada en un navegador aparece en otro, y el historial muestra el nombre del usuario del admin.
