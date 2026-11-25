# Agente de diseño Upper: paquete para conectarlo a cualquier plataforma

Este paquete convierte Upper Studio en un agente: recibe pedidos por chat, pregunta lo que falta, escribe el copy con el tono y el conocimiento de Upper, adapta referencias y entrega piezas PNG y SVG generadas con el mismo motor de la plataforma.

## Qué hay aquí

| Archivo | Para qué sirve |
|---|---|
| `PROMPT_SISTEMA.md` | Instrucciones del agente: rol, proceso, preguntas, adaptación de referencias, marca y formato del pedido. Pégalo como *system prompt* o instrucciones del agente. |
| `conocimiento/ecuador.md`, `conocimiento/colombia.md` | Tono, conocimiento de negocio y reglas de cada país, exportados de la plataforma. |
| `conocimiento/catalogo.json` | Formatos, plantillas, visuales, elementos y límites. |
| `conocimiento/pedido-ejemplo.json` | Ejemplo del pedido que recibe el generador. |
| `mcp-server.mjs` | Servidor MCP con 3 herramientas: `catalogo`, `conocimiento` y `generar_pieza`. |
| `Dockerfile` | Imagen del servidor MCP en modo HTTP para publicarlo en la nube. |
| `INSTRUCCIONES.md` | Versión de las instrucciones para Claude en Slack o Claude Code (usa el generador por comando). |

El motor está en la raíz del repo: `index.html` (plataforma completa, con tipografías incrustadas), `assets/`, `lib/pagina.js` y `scripts/render.mjs`.

## Cómo conectarlo a tu plataforma (por ejemplo, Buzz)

Depende de lo que permita la plataforma.

### Nivel 1: solo instrucciones y archivos

Si la plataforma solo deja pegar instrucciones y subir archivos:

1. Pega `PROMPT_SISTEMA.md` como instrucciones del agente.
2. Sube `conocimiento/ecuador.md`, `conocimiento/colombia.md` y `conocimiento/catalogo.json` como conocimiento.

El agente pregunta, escribe y valida el copy y arma el pedido, pero **no genera imágenes**. Entrega el copy y el pedido para generarlo en Upper Studio.

### Nivel 2: con herramientas MCP (recomendado)

Si la plataforma acepta servidores MCP, el agente además **genera las piezas** y lee la revisión de marca.

- **MCP remoto (HTTP), en la nube:**
  1. Publica el servidor con el `Dockerfile` en un servicio que corra contenedores.
  2. Define una variable `AGENTE_TOKEN` con un token largo.
  3. En la plataforma, agrega el servidor MCP con la URL `https://<tu-servicio>/mcp` y el encabezado `Authorization: Bearer <AGENTE_TOKEN>`.

  ```bash
  docker build -f agente/Dockerfile -t upper-agente .
  ```

  ```bash
  docker run -p 8787:8787 -e AGENTE_TOKEN=un-token-largo upper-agente
  ```

  `GET /salud` responde `{"ok":true}` para verificar que está arriba.

- **MCP local (stdio)**, para Claude Desktop o Claude Code en un computador con el repo, Node 20+ y Playwright:

  ```json
  { "mcpServers": { "upper-studio": { "command": "node", "args": ["/ruta/al/repo/agente/mcp-server.mjs"] } } }
  ```

### Nivel 3: agente con acceso al repositorio

Claude en Slack, Claude Code o un agente con terminal sigue `INSTRUCCIONES.md` y usa directamente `node scripts/render.mjs`.

## Mantenerlo al día

El conocimiento y las reglas viven en `index.html`. Después de cambiarlos en el repo, regenera los archivos del agente:

```bash
node scripts/exportar-agente.mjs
```

Para incluir lo que el equipo editó en la plataforma, usa el botón **"Exportar para el agente"** (panel Conocimiento de marca) y sube el archivo como `datos/equipo.json`. El generador lo aplica solo. Si usas el nivel 1, vuelve a ejecutar la exportación y sube los archivos nuevos.

## Límites

- **Video:** el generador no exporta video. Las piezas de video se hacen en Upper Studio, formato Video.
- **Tipografía licenciada:** el paquete incluye la tipografía Noland, que es licenciada. Publica el servidor solo con token y no compartas el repo fuera de Upper.
