#!/usr/bin/env node
// Generador de piezas Upper por línea de comandos (para el agente de Slack y automatizaciones).
// Usa la misma index.html que la plataforma: mismas plantillas, tipografías, reglas y conocimiento.
//
//   node scripts/render.mjs pedido.json [carpeta-salida]     → PNG + SVG + revision.json
//   node scripts/render.mjs --catalogo                        → formatos, plantillas, visuales, elementos (JSON)
//   node scripts/render.mjs --conocimiento ec|co              → tono, conocimiento y reglas del país (texto)
//
// Si existe datos/equipo.json (botón "Exportar para el agente" en Conocimiento de marca),
// se aplican el conocimiento y las reglas que el equipo editó en la plataforma.
// Requiere Playwright con Chromium (npm i -D playwright && npx playwright install chromium).
import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { wrapPage } from "../lib/pagina.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
async function loadPlaywright() {
  try { return require("playwright"); } catch {}
  try { return await import("playwright"); } catch {}
  throw new Error("Falta Playwright: npm i -D playwright && npx playwright install chromium");
}
const exists = (p) => stat(p).then(() => true, () => false);
const MIME = { ".svg": "image/svg+xml", ".png": "image/png", ".otf": "font/otf", ".ttf": "font/ttf", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp" };

// Servidor estático mínimo: la página envuelta + assets del repositorio (las APIs responden 404 → modo local).
function serve() {
  return new Promise((res) => {
    const srv = http.createServer(async (req, rsp) => {
      const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
      try {
        if (u === "/") { rsp.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return rsp.end(wrapPage(await readFile(path.join(ROOT, "index.html"), "utf8"))); }
        const f = path.join(ROOT, path.normalize(u).replace(/^(\.\.[/\\])+/, ""));
        if (!f.startsWith(path.join(ROOT, "assets")) && !f.startsWith(path.join(ROOT, "fonts"))) throw 0;
        rsp.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rsp.end(await readFile(f));
      } catch { rsp.writeHead(404); rsp.end(); }
    }).listen(0, "127.0.0.1", () => res(srv));
  });
}

// Librerías de CDN (QR y zip): si la red las bloquea, se sirven desde node_modules cuando existen.
async function routeCdn(page) {
  const local = { "qrcode.min.js": ["qrcodejs/qrcode.min.js", "qrcode/build/qrcode.min.js"], "jszip.min.js": ["jszip/dist/jszip.min.js"] };
  await page.route(/cdnjs\.cloudflare\.com/, async (route) => {
    const name = route.request().url().split("/").pop();
    for (const cand of local[name] || []) { try { return route.fulfill({ body: await readFile(require.resolve(cand)), contentType: "text/javascript" }); } catch {} }
    try { await route.continue(); } catch { await route.abort(); }
  });
}

async function openStudio() {
  const { chromium } = await loadPlaywright();
  const srv = await serve();
  // Usa el Chromium de Playwright; si no está descargado, usa el Google Chrome instalado en el equipo.
  let browser;
  try { browser = await chromium.launch(); }
  catch (e1) { try { browser = await chromium.launch({ channel: "chrome" }); } catch { throw new Error("No hay navegador para generar: instala Google Chrome o ejecuta npx playwright install chromium. (" + String(e1.message || e1).split("\n")[0] + ")"); } }
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await routeCdn(page);
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload();
  await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 30000 });
  const eq = path.join(ROOT, "datos", "equipo.json");
  if (await exists(eq)) {
    const d = JSON.parse(await readFile(eq, "utf8"));
    await page.evaluate((d) => { if (d.conocimiento) applyKb(d.conocimiento); if (d.reglas) applyRules(d.reglas); }, d);
  }
  return { page, errores, close: async () => { await browser.close(); srv.close(); } };
}

// Lee una imagen local como data URL para pasarla a la página.
async function dataUrl(p, base) {
  const f = path.resolve(base, p);
  const ext = path.extname(f).toLowerCase().slice(1);
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : ext === "svg" ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${(await readFile(f)).toString("base64")}`;
}
async function resolveImages(brief, base) {
  const one = async (x) => (typeof x === "string" ? { img: await dataUrl(x, base) } : x && x.archivo ? { ...x, img: await dataUrl(x.archivo, base) } : x);
  const fix = async (b) => {
    if (b.productos) b.productos = await Promise.all(b.productos.map(one));
    if (b.producto) b.producto = (await one(b.producto)).img;
    if (b.fondo) b.fondo = (await one(b.fondo)).img;
    if (b.aliados) b.aliados = await Promise.all(b.aliados.map(async (a) => ({ ...(typeof a === "string" ? { archivo: a } : a), img: await dataUrl(typeof a === "string" ? a : a.archivo, base) })));
  };
  await fix(brief);
  for (const l of brief.laminas || []) await fix(l);
  return brief;
}

// ---------- Dentro de la página ----------
function pageCatalog() {
  const f = Object.fromEntries(Object.entries(FORMATS).map(([k, v]) => [k, { nombre: v.label, canal: v.canal, plantillas: v.templates.map((t) => ({ id: t.id, nombre: t.name, tamano: `${t.w}x${t.h}`, composicion: t.layout, descripcion: t.desc })) }]));
  return {
    paises: Object.fromEntries(Object.entries(PAISES).map(([k, v]) => [k, v.nombre])),
    formatos: f,
    combinaciones: Object.fromEntries(Object.entries(SCHEMES).map(([k, v]) => [k, v.name])),
    visuales: Object.fromEntries(VISUALS),
    elementos_por_composicion: EL_SETS,
    bordes: STROKES.map((x) => x[0]), colores_borde: STROKE_COL.map((x) => x[0]), siluetas: SILS.map((x) => x[0]),
    campos_copy: [...FIELDS, ...EXTRA_FIELDS].map(([k, l]) => ({ campo: k, nombre: l, limite: LIMITS[k] })),
    marcas_de_texto: { "*texto*": "resaltado", "^texto^": "más grande", "~texto~": "más pequeño", "|": "salto de línea" },
    carrusel: { min: CAR_MIN, max: CAR_MAX, solo_formato: "social" },
  };
}
function pageKnowledge(pais) {
  S.req.pais = pais;
  const reglas = activeRules().filter((r) => r.enabled).map((r) => `- [${SEV[r.sev].label}] ${r.kind === "do" ? "HACER" : "NO HACER"}: ${r.text}`).join("\n");
  return `# TONO DE UPPER\n${VOICE}\n\n# ${knowledgeBlock()}\n\n# REGLAS DE MARCA Y NEGOCIO (${PAISES[pais].nombre})\n${reglas}\n\n# LÍMITES DE CARACTERES\n${Object.entries(LIMITS).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`;
}
async function pageRender(brief) {
  const img = (src) => (src ? new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("imagen")); i.src = src; }) : Promise.resolve(null));
  const prods = async (list) => Promise.all((list || []).slice(0, 4).map(async (p) => ({ img: p.img ? await img(p.img) : null, name: p.nombre || "producto", nombre: p.nombre || "", precio: p.precio || "", antes: p.antes || "", desc: p.descuento || p.desc || "", sil: p.silueta || "none", silc: p.color_silueta || "green", rot: p.giro ?? undefined })));
  if (!PAISES[brief.pais || "ec"]) throw new Error(`País desconocido: ${brief.pais}`);
  S.req.pais = brief.pais || "ec";
  const fmt = brief.formato || "social";
  if (!FORMATS[fmt]) throw new Error(`Formato desconocido: ${fmt}`);
  const tpl = FORMATS[fmt].templates.find((t) => t.id === (brief.plantilla || FORMATS[fmt].templates[0].id));
  if (!tpl) throw new Error(`Plantilla desconocida: ${brief.plantilla}`);
  if (tpl.layout === "video") throw new Error("El video se exporta desde la plataforma (el generador por comando no codifica MP4 todavía).");
  S.formato = fmt; S.tpl = tpl.id;
  const schemes = brief.combinacion === "ambas" || !brief.combinacion ? Object.keys(SCHEMES) : [brief.combinacion];
  for (const k of schemes) if (!SCHEMES[k]) throw new Error(`Combinación desconocida: ${k}`);
  // Disposición libre: { elemento: {x, y, tamano, ocultar, borde, color} } (x, y en fracción del lienzo, tamano 0.4–2.2)
  const L2 = LAY(); L2.pos = {}; L2.sty = {}; L2.hide = {};
  for (const [id, v] of Object.entries(brief.disposicion || {})) {
    const k = tpl.layout + "." + id;
    if (v.x || v.y || v.tamano) L2.pos[k] = { dx: v.x || 0, dy: v.y || 0, s: v.tamano || 1 };
    if (v.ocultar) L2.hide[k] = true;
    if (v.borde) L2.sty[k] = { t: v.borde, c: v.color || "green" };
  }
  S.extras.qr = brief.qr || ""; S.waMsg = brief.mensaje || "";
  S.extras.icono = brief.icono === "tiktok" ? "tiktok" : "none";
  S.extras.textos = (brief.textos || []).slice(0, 3).map((t) => (typeof t === "string" ? { texto: t } : t)).map((t) => ({
    texto: t.texto || "", fuente: t.tipografia === "noland" ? "d" : "t", caso: t.caso || "normal", color: t.color || "auto",
    bloque: t.bloque || "none", borde: t.borde || "none", bordeColor: t.color_borde || "green" }));
  S.extras.aliados = await Promise.all((brief.aliados || []).slice(0, 3).map(async (a) => ({ img: await img(a.img), name: a.nombre || "aliado", white: a.monocromo !== false })));
  const setPiece = async (b) => {
    const c = emptyCopy(); Object.assign(c, Object.fromEntries(Object.entries(b.copy || {}).filter(([k]) => k in c)));
    S.copy = c;
    S.extras.visual = b.visual && VISUALS.some((v) => v[0] === b.visual) ? b.visual : (b.visual ? (() => { throw new Error(`Visual desconocido: ${b.visual}`); })() : DEFAULTS.visual);
    S.extras.productos = await prods(b.productos);
    S.extras.producto = await img(b.producto);
    S.extras.fondo = await img(b.fondo); S.extras.fondoY = b.encuadre ?? 0.5;
  };
  const piezas = [];
  const out = async (label, k) => {
    const c = document.createElement("canvas"); const rv = render(c, tpl, k, 1);
    return {
      pieza: label, combinacion: k, png: c.toDataURL("image/png"), svg: renderSvg(tpl, k),
      revision: rv.filter((r) => r.enabled !== false).map((r) => ({ id: r.id, regla: r.text, severidad: SEV[r.sev].label, estado: r.state, detalle: r.detail || "" })),
    };
  };
  if (brief.laminas && brief.laminas.length) {
    if (fmt !== "social") throw new Error("El carrusel solo está disponible en Redes sociales.");
    if (tpl.h / tpl.w > 1.5) throw new Error("Las historias no van en carrusel: usa feed, sq o foto.");
    const n = Math.min(CAR_MAX, Math.max(CAR_MIN, brief.laminas.length));
    setCarousel(false); S.car.n = n; setCarousel(true); setSlides(n);
    for (let i = 0; i < n; i++) { selectSlide(i); await setPiece(brief.laminas[i]); syncSlide(); }
    for (let i = 0; i < n; i++) { selectSlide(i); for (const k of schemes) piezas.push(await out(`lamina-${String(i + 1).padStart(2, "0")}`, k)); }
  } else {
    setCarousel(false); await setPiece(brief);
    for (const k of schemes) piezas.push(await out("pieza", k));
  }
  return { plantilla: `${FORMATS[fmt].label} · ${tpl.name}`, tamano: `${tpl.w}x${tpl.h}`, piezas };
}

// ---------- CLI ----------
const args = process.argv.slice(2);
if (!args.length || args[0] === "-h" || args[0] === "--help") {
  console.log("Uso:\n  node scripts/render.mjs pedido.json [salida]\n  node scripts/render.mjs --catalogo\n  node scripts/render.mjs --conocimiento ec|co\nFormato del pedido: agente/pedido-ejemplo.json");
  process.exit(args.length ? 0 : 1);
}
const st = await openStudio();
try {
  if (args[0] === "--catalogo") {
    console.log(JSON.stringify(await st.page.evaluate(pageCatalog), null, 2));
  } else if (args[0] === "--conocimiento") {
    console.log(await st.page.evaluate(pageKnowledge, args[1] || "ec"));
  } else {
    const file = path.resolve(args[0]);
    const brief = await resolveImages(JSON.parse(await readFile(file, "utf8")), path.dirname(file));
    const outDir = path.resolve(args[1] || path.join(ROOT, "salidas", path.basename(file, ".json")));
    const res = await st.page.evaluate(pageRender, brief);
    await mkdir(outDir, { recursive: true });
    const base = (brief.nombre || "upper").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
    const archivos = [];
    for (const p of res.piezas) {
      const stem = `${base}_${p.pieza}_${p.combinacion}`;
      await writeFile(path.join(outDir, stem + ".png"), Buffer.from(p.png.split(",")[1], "base64"));
      await writeFile(path.join(outDir, stem + ".svg"), p.svg);
      archivos.push(stem + ".png", stem + ".svg");
    }
    const revision = res.piezas.map((p) => ({
      pieza: p.pieza, combinacion: p.combinacion,
      bloqueantes: p.revision.filter((r) => r.estado === "fail" && r.severidad === "Bloqueante"),
      alertas: p.revision.filter((r) => r.estado === "fail" && r.severidad === "Alerta"),
      recomendaciones: p.revision.filter((r) => r.estado === "fail" && r.severidad === "Recomendación"),
      pendientes_de_criterio: p.revision.filter((r) => r.estado === "pending").map((r) => r.regla),
    }));
    await writeFile(path.join(outDir, "revision.json"), JSON.stringify({ plantilla: res.plantilla, tamano: res.tamano, archivos, revision, errores: st.errores }, null, 2));
    const nb = revision.reduce((a, r) => a + r.bloqueantes.length, 0), na = revision.reduce((a, r) => a + r.alertas.length, 0);
    console.log(JSON.stringify({ ok: true, carpeta: outDir, plantilla: res.plantilla, archivos, bloqueantes: nb, alertas: na, errores: st.errores }, null, 2));
  }
} catch (e) {
  console.error(JSON.stringify({ ok: false, error: e.message || String(e) }));
  process.exitCode = 1;
} finally {
  await st.close();
}
