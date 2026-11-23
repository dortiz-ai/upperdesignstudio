// Upper Studio — servidor mínimo para hosting propio.
// Sirve la app estática y hace de proxy hacia la API de Claude, así la API key nunca llega al navegador.
//   ANTHROPIC_API_KEY  (obligatoria)  clave de la API de Anthropic
//   STUDIO_USERS (recomendado) usuarios del equipo: "ana:clave1,luis:clave2". Cada cambio de reglas y cada excepción queda con su nombre.
//   STUDIO_USER / STUDIO_PASS  alternativa con un solo usuario
//   DATA_DIR (opcional, ./data) dónde se guardan reglas, historial y excepciones
//   PORT (opcional, 8080) · UPPER_MODEL (opcional) · UPPER_EFFORT (opcional: low|medium|high)
import http from "node:http";
import { readFile, writeFile, appendFile, mkdir, rename, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { timingSafeEqual } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8080);
const MODEL = process.env.UPPER_MODEL || "claude-opus-5-5";
const EFFORT = process.env.UPPER_EFFORT || "medium";
const USERS = new Map((process.env.STUDIO_USERS || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)]; }));
if (process.env.STUDIO_USER && process.env.STUDIO_PASS) USERS.set(process.env.STUDIO_USER, process.env.STUDIO_PASS);
const DATA = path.resolve(process.env.DATA_DIR || path.join(ROOT, "data"));
const client = new Anthropic(); // lee ANTHROPIC_API_KEY

const SYSTEM =
  "Eres el copywriter y director de arte de Upper, courier internacional de Ecuador. " +
  "Sigues al pie de la letra las reglas de marca del pedido y respondes únicamente con un objeto JSON válido, sin texto antes ni después.";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".woff": "font/woff", ".otf": "font/otf", ".ttf": "font/ttf", ".json": "application/json", ".ico": "image/x-icon" };
const PUBLIC = new Set(["index.html", "assets", "fonts"]);

// Límite simple por IP: 40 consultas cada 10 minutos.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > 40;
}

function safeEq(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
// Devuelve el nombre del usuario autenticado, "equipo" si no hay usuarios configurados, o null si falla.
function authUser(req) {
  if (!USERS.size) return "equipo";
  const [type, value] = (req.headers.authorization || "").split(" ");
  if (type !== "Basic" || !value) return null;
  const [u, ...rest] = Buffer.from(value, "base64").toString().split(":");
  const pass = USERS.get(u);
  return pass !== undefined && safeEq(rest.join(":"), pass) ? u : null;
}

// ---- Reglas de marca compartidas, historial de cambios y excepciones (archivos JSON en DATA_DIR) ----
const EMPTY_RULES = { overrides: {}, custom: [], updatedAt: 0 };
const SEVS = new Set(["block", "warn", "info"]);
const clip = (v, n) => String(v ?? "").slice(0, n);
async function readRules() { try { return JSON.parse(await readFile(path.join(DATA, "reglas.json"), "utf8")); } catch { return EMPTY_RULES; } }
function cleanRules(c) {
  const overrides = {};
  for (const [id, o] of Object.entries(c?.overrides || {}).slice(0, 200)) {
    if (!/^[a-z0-9_]{1,40}$/i.test(id) || typeof o !== "object") continue;
    overrides[id] = { sev: SEVS.has(o.sev) ? o.sev : "warn", enabled: o.enabled !== false, reason: clip(o.reason, 300), at: Number(o.at) || Date.now() };
  }
  const custom = (Array.isArray(c?.custom) ? c.custom : []).slice(0, 100).filter((r) => r && r.text).map((r) => ({
    id: clip(r.id, 40), kind: r.kind === "dont" ? "dont" : "do", text: clip(r.text, 160), check: r.check === "manual" ? "manual" : "ai",
    sev: SEVS.has(r.sev) ? r.sev : "warn", enabled: r.enabled !== false, pais: ["ec", "co"].includes(r.pais) ? r.pais : "all",
  }));
  return { overrides, custom, updatedAt: Date.now() };
}
async function readKb() { try { return JSON.parse(await readFile(path.join(DATA, "conocimiento.json"), "utf8")); } catch { return { updatedAt: 0 }; } }
function cleanKb(c) {
  const out = { updatedAt: Date.now() };
  for (const p of ["ec", "co"]) {
    out[p] = Array.isArray(c?.[p]) ? c[p].slice(0, 60).filter((s) => s && s.titulo).map((s) => ({ id: clip(s.id, 40), titulo: clip(s.titulo, 80), texto: clip(s.texto, 6000) })) : null;
  }
  return out;
}
async function writeJson(name, data) { await mkdir(DATA, { recursive: true }); const tmp = path.join(DATA, name + ".tmp"); await writeFile(tmp, JSON.stringify(data, null, 2)); await rename(tmp, path.join(DATA, name)); }
async function appendLog(name, entry) { await mkdir(DATA, { recursive: true }); await appendFile(path.join(DATA, name + ".jsonl"), JSON.stringify(entry) + "\n"); }
async function readLog(name, n) {
  try { const lines = (await readFile(path.join(DATA, name + ".jsonl"), "utf8")).trim().split("\n"); return lines.slice(-n).reverse().map((l) => JSON.parse(l)); }
  catch { return []; }
}
function cleanException(e, by) {
  return {
    at: Date.now(), by, pais: clip(e.pais, 40), campana: clip(e.campana, 120), objetivo: clip(e.objetivo, 60), esquema: clip(e.esquema, 60), comentario: clip(e.comentario, 300),
    piezas: (Array.isArray(e.piezas) ? e.piezas : []).slice(0, 20).map((x) => clip(x, 80)),
    reglas: (Array.isArray(e.reglas) ? e.reglas : []).slice(0, 60).map((r) => ({ id: clip(r.id, 40), texto: clip(r.texto, 200), sev: SEVS.has(r.sev) ? r.sev : "warn", detalle: clip(r.detalle, 400), motivo: clip(r.motivo, 300) })),
  };
}
async function handleData(req, res, user, url) {
  const n = Math.min(100, Math.max(1, Number(url.searchParams.get("n")) || 40));
  try {
    if (url.pathname === "/api/reglas" && req.method === "GET") return send(res, 200, { config: await readRules(), me: user });
    if (url.pathname === "/api/reglas" && req.method === "PUT") {
      const body = await readBody(req, 256 * 1024);
      const cfg = cleanRules(body.config);
      await mkdir(DATA, { recursive: true });
      const tmp = path.join(DATA, "reglas.json.tmp");
      await writeFile(tmp, JSON.stringify(cfg, null, 2)); await rename(tmp, path.join(DATA, "reglas.json"));
      const ch = body.change || {};
      await appendLog("cambios", { at: Date.now(), by: user, accion: clip(ch.accion, 80), regla: clip(ch.regla, 200), motivo: clip(ch.motivo, 300) });
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/conocimiento" && req.method === "GET") return send(res, 200, { config: await readKb() });
    if (url.pathname === "/api/conocimiento" && req.method === "PUT") {
      const body = await readBody(req, 512 * 1024);
      await writeJson("conocimiento.json", cleanKb(body.config));
      const ch = body.change || {};
      await appendLog("cambios", { at: Date.now(), by: user, accion: clip(ch.accion, 80), regla: clip(ch.regla, 200), motivo: clip(ch.motivo, 300) });
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/api/cambios" && req.method === "GET") return send(res, 200, { items: await readLog("cambios", n) });
    if (url.pathname === "/api/excepciones" && req.method === "GET") return send(res, 200, { items: await readLog("excepciones", n) });
    if (url.pathname === "/api/excepciones" && req.method === "POST") { await appendLog("excepciones", cleanException(await readBody(req), user)); return send(res, 200, { ok: true }); }
  } catch (e) { console.error(e); return send(res, 400, { code: "bad_request" }); }
  return send(res, 405, { code: "method_not_allowed" });
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function parseJson(text) {
  const clean = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(clean.slice(a, b + 1));
  throw new Error("invalid_json");
}

async function readBody(req, max = 64 * 1024) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > max) throw new Error("too_large"); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

async function handleClaude(req, res) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress;
  if (limited(ip)) return send(res, 429, { code: "rate_limited" });
  let prompt;
  try { ({ prompt } = await readBody(req)); } catch { return send(res, 400, { code: "bad_request" }); }
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20000) return send(res, 400, { code: "bad_request" });
  try {
    const msg = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: EFFORT },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [{ role: "user", content: prompt }],
    });
    if (msg.stop_reason === "refusal") return send(res, 422, { code: "refusal" });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    try { return send(res, 200, { data: parseJson(text) }); }
    catch { return send(res, 502, { code: "invalid_json" }); }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return send(res, 429, { code: "rate_limited" });
    if (e instanceof Anthropic.AuthenticationError) return send(res, 500, { code: "auth" });
    if (e instanceof Anthropic.APIError) { console.error("Claude API", e.status, e.message); return send(res, 502, { code: "server" }); }
    console.error(e); return send(res, 500, { code: "server" });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://x");
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT + path.sep) || !PUBLIC.has(rel.split("/")[0])) return send(res, 404, "No encontrado", "text/plain");
  try {
    if (!(await stat(file)).isFile()) throw 0;
    let body = await readFile(file);
    if (rel === "index.html") body = wrapPage(body.toString());
    send(res, 200, body, TYPES[path.extname(file)] || "application/octet-stream");
  } catch { send(res, 404, "No encontrado", "text/plain"); }
}

// index.html está escrito como fragmento (formato de claude.ai); aquí se le pone el esqueleto HTML completo.
function wrapPage(html) {
  if (/^\s*<!doctype/i.test(html)) return html;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="assets/Logo_Upper.svg"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
}

http.createServer(async (req, res) => {
  const user = authUser(req);
  if (!user) { res.writeHead(401, { "www-authenticate": 'Basic realm="Upper Studio"' }); return res.end(); }
  const url = new URL(req.url, "http://x");
  if (["/api/reglas", "/api/conocimiento", "/api/cambios", "/api/excepciones"].includes(url.pathname)) return handleData(req, res, user, url);
  if (req.url === "/api/health") return send(res, 200, { ok: !!process.env.ANTHROPIC_API_KEY, model: MODEL });
  if (req.url === "/api/claude" && req.method === "POST") return handleClaude(req, res);
  if (req.method === "GET") return serveStatic(req, res);
  send(res, 405, { code: "method_not_allowed" });
}).listen(PORT, () => console.log(`Upper Studio en http://localhost:${PORT} · modelo ${MODEL}${USERS.size ? ` · ${USERS.size} usuario(s)` : " · SIN contraseña"}`));
