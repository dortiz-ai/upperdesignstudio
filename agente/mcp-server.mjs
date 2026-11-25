#!/usr/bin/env node
// Servidor MCP del agente de diseño Upper: expone el motor de Upper Studio como herramientas.
//
//   node agente/mcp-server.mjs                 → MCP por stdio (Claude Desktop, Claude Code, clientes locales)
//   node agente/mcp-server.mjs --http 8787     → MCP por HTTP (POST /mcp, JSON-RPC sin estado) para plataformas en la nube
//
// En modo HTTP, si existe AGENTE_TOKEN, cada pedido debe traer "Authorization: Bearer <AGENTE_TOKEN>".
// Herramientas: catalogo, conocimiento, generar_pieza. Requiere Node 20+ y Playwright con Chromium.
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RENDER = path.join(ROOT, "scripts", "render.mjs");
const PROTOCOL = "2025-06-18";

function run(args) {
  return new Promise((res) => {
    const p = spawn(process.execPath, [RENDER, ...args], { cwd: ROOT });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => res({ code, out, err }));
  });
}

// Las imágenes pueden llegar como data URL, base64 o URL https; se guardan en la carpeta temporal del pedido.
async function saveAsset(dir, val, i) {
  if (!val || typeof val !== "string") return val;
  let buf, ext = "png";
  if (val.startsWith("data:")) { const m = val.match(/^data:image\/(\w+);base64,(.*)$/s); if (!m) throw new Error("Imagen en data URL inválida"); ext = m[1] === "jpeg" ? "jpg" : m[1]; buf = Buffer.from(m[2], "base64"); }
  else if (/^https?:\/\//.test(val)) { const r = await fetch(val); if (!r.ok) throw new Error(`No se pudo descargar ${val}`); buf = Buffer.from(await r.arrayBuffer()); ext = (r.headers.get("content-type") || "").includes("jpeg") ? "jpg" : (r.headers.get("content-type") || "").includes("webp") ? "webp" : "png"; }
  else if (/^[A-Za-z0-9+/=\s]{200,}$/.test(val)) buf = Buffer.from(val, "base64");
  else return val; // ruta local
  const name = `recurso-${i}.${ext}`; await writeFile(path.join(dir, name), buf); return name;
}
async function prepareBrief(dir, brief) {
  let n = 0;
  const fixItem = async (x) => (typeof x === "string" ? saveAsset(dir, x, n++) : x && x.archivo ? { ...x, archivo: await saveAsset(dir, x.archivo, n++) } : x);
  const fix = async (b) => {
    if (b.productos) b.productos = await Promise.all(b.productos.map(fixItem));
    if (b.producto) b.producto = await saveAsset(dir, b.producto, n++);
    if (b.fondo) b.fondo = await saveAsset(dir, b.fondo, n++);
    if (b.aliados) b.aliados = await Promise.all(b.aliados.map(fixItem));
  };
  await fix(brief); for (const l of brief.laminas || []) await fix(l);
  return brief;
}

const TOOLS = [
  { name: "catalogo", description: "Lista formatos, plantillas (con tamaño), combinaciones de color, visuales, elementos que se pueden mover por composición, bordes, siluetas, campos de copy con límites y marcas de texto. Úsala antes de armar un pedido.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false } },
  { name: "conocimiento", description: "Devuelve el tono de Upper, el conocimiento de negocio del país (tarifas, tiempos, impuestos, servicios) y las reglas de marca y negocio con su severidad. Léelo antes de escribir cualquier copy: no afirmes datos que no estén aquí.",
    inputSchema: { type: "object", properties: { pais: { type: "string", enum: ["ec", "co"], description: "ec = Ecuador, co = Colombia" } }, required: ["pais"], additionalProperties: false } },
  { name: "generar_pieza", description: "Genera la pieza con el motor de Upper Studio (mismas plantillas, tipografías y reglas) y devuelve las imágenes PNG, los SVG editables y la revisión de marca (bloqueantes, alertas, recomendaciones). El pedido sigue el formato de agente/pedido-ejemplo.json. Las imágenes (productos, foto de fondo, aliados) pueden ir como URL https o data URL base64.",
    inputSchema: { type: "object", properties: {
      pedido: { type: "object", description: "Pedido: nombre, pais, formato, plantilla, combinacion (ambas|oscuro|claro), copy {eyebrow,titular,subtitulo,destacado,cta}, visual, productos, producto, fondo, encuadre, textos, qr, aliados, mensaje, disposicion, laminas (carrusel)." },
      incluir_svg: { type: "boolean", description: "Devuelve también el texto de los SVG editables (pesado). Por defecto false." } },
      required: ["pedido"], additionalProperties: false } },
];

async function callTool(name, args = {}) {
  if (name === "catalogo") { const r = await run(["--catalogo"]); if (r.code) throw new Error(r.err || "Error en el catálogo"); return [{ type: "text", text: r.out }]; }
  if (name === "conocimiento") { const r = await run(["--conocimiento", args.pais === "co" ? "co" : "ec"]); if (r.code) throw new Error(r.err || "Error en el conocimiento"); return [{ type: "text", text: r.out }]; }
  if (name === "generar_pieza") {
    const dir = await mkdtemp(path.join(tmpdir(), "upper-pedido-"));
    try {
      const brief = await prepareBrief(dir, JSON.parse(JSON.stringify(args.pedido || {})));
      const file = path.join(dir, "pedido.json"); await writeFile(file, JSON.stringify(brief));
      const out = path.join(dir, "salida");
      const r = await run([file, out]);
      if (r.code) { let msg = r.err; try { msg = JSON.parse(r.err).error; } catch {} throw new Error(msg || "No se pudo generar la pieza"); }
      const rev = JSON.parse(await readFile(path.join(out, "revision.json"), "utf8"));
      const content = [{ type: "text", text: JSON.stringify({ plantilla: rev.plantilla, tamano: rev.tamano, archivos: rev.archivos, revision: rev.revision }, null, 2) }];
      for (const f of (await readdir(out)).sort()) {
        if (f.endsWith(".png")) content.push({ type: "image", mimeType: "image/png", data: (await readFile(path.join(out, f))).toString("base64") }, { type: "text", text: `↑ ${f}` });
        else if (f.endsWith(".svg") && args.incluir_svg) content.push({ type: "text", text: `${f}\n${await readFile(path.join(out, f), "utf8")}` });
      }
      return content;
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  throw new Error(`Herramienta desconocida: ${name}`);
}

async function handle(msg) {
  const { id, method, params } = msg;
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  try {
    if (method === "initialize") return ok({ protocolVersion: params?.protocolVersion || PROTOCOL, capabilities: { tools: {} }, serverInfo: { name: "upper-studio", version: "1.0.0" },
      instructions: "Agente de diseño Upper: lee 'conocimiento' antes de escribir copy y 'catalogo' antes de armar un pedido; genera con 'generar_pieza' y revisa la revisión de marca antes de entregar." });
    if (method === "ping") return ok({});
    if (method === "tools/list") return ok({ tools: TOOLS });
    if (method === "tools/call") {
      try { return ok({ content: await callTool(params?.name, params?.arguments) }); }
      catch (e) { return ok({ content: [{ type: "text", text: `Error: ${e.message || e}` }], isError: true }); }
    }
    if (id === undefined) return null; // notificaciones
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Método no soportado: ${method}` } };
  } catch (e) { return { jsonrpc: "2.0", id, error: { code: -32603, message: e.message || String(e) } }; }
}

const httpIdx = process.argv.indexOf("--http");
if (httpIdx > -1) {
  const port = Number(process.argv[httpIdx + 1] || process.env.PORT || 8787), token = process.env.AGENTE_TOKEN;
  http.createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/salud") { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true}'); }
    if (req.method !== "POST" || !req.url.startsWith("/mcp")) { res.writeHead(404); return res.end(); }
    if (token && req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); return res.end(); }
    let body = ""; for await (const c of req) { body += c; if (body.length > 40e6) { res.writeHead(413); return res.end(); } }
    let msg; try { msg = JSON.parse(body); } catch { res.writeHead(400); return res.end(); }
    const out = Array.isArray(msg) ? (await Promise.all(msg.map(handle))).filter(Boolean) : await handle(msg);
    if (!out || (Array.isArray(out) && !out.length)) { res.writeHead(202); return res.end(); }
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(out));
  }).listen(port, () => console.error(`MCP de Upper Studio en http://localhost:${port}/mcp${token ? " (con token)" : " (SIN token)"}`));
} else {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on("line", async (line) => { if (!line.trim()) return; let msg; try { msg = JSON.parse(line); } catch { return; } const out = await handle(msg); if (out) process.stdout.write(JSON.stringify(out) + "\n"); });
}
