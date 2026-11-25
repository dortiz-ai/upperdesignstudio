#!/usr/bin/env node
// Genera los archivos de conocimiento del agente desde la plataforma (siempre sincronizados con index.html):
//   agente/conocimiento/ecuador.md, colombia.md, catalogo.json
// Uso: node scripts/exportar-agente.mjs   (requiere Playwright con Chromium)
import { spawnSync } from "node:child_process";
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "agente", "conocimiento");
const run = (...a) => { const r = spawnSync(process.execPath, [path.join(ROOT, "scripts", "render.mjs"), ...a], { cwd: ROOT, encoding: "utf8", maxBuffer: 20e6 }); if (r.status) throw new Error(r.stderr); return r.stdout; };
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "ecuador.md"), `# Upper Ecuador: tono, conocimiento y reglas\n\n${run("--conocimiento", "ec")}`);
await writeFile(path.join(OUT, "colombia.md"), `# Upper Colombia: tono, conocimiento y reglas\n\n${run("--conocimiento", "co")}`);
await writeFile(path.join(OUT, "catalogo.json"), run("--catalogo"));
await copyFile(path.join(ROOT, "agente", "pedido-ejemplo.json"), path.join(OUT, "pedido-ejemplo.json"));
console.log("Listo: agente/conocimiento/ (ecuador.md, colombia.md, catalogo.json, pedido-ejemplo.json)");
