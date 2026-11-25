#!/usr/bin/env node
// Genera el snapshot del agente para Buzz (formato "buzz-agent-snapshot" v1):
//   agente/upper-disenador.agent.json  → en Buzz: Import an agent → Import snapshot
// Instrucciones = agente/PROMPT_SISTEMA.md; memoria = agente/conocimiento/* (ejecuta antes scripts/exportar-agente.mjs).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const A = (f) => readFile(path.join(ROOT, "agente", f), "utf8");
const prompt = await A("PROMPT_SISTEMA.md");
const entries = [
  { slug: "upper-ecuador", body: await A("conocimiento/ecuador.md") },
  { slug: "upper-colombia", body: await A("conocimiento/colombia.md") },
  { slug: "upper-catalogo", body: "Catálogo de Upper Studio (formatos, plantillas, visuales, elementos, bordes, siluetas, campos de copy con límites y marcas de texto):\n\n```json\n" + (await A("conocimiento/catalogo.json")).trim() + "\n```" },
  { slug: "upper-pedido-ejemplo", body: "Ejemplo de pedido para generar_pieza:\n\n```json\n" + (await A("conocimiento/pedido-ejemplo.json")).trim() + "\n```" },
];
const snapshot = {
  format: "buzz-agent-snapshot",
  version: 1,
  definition: { name: "Diseñador Upper", systemPrompt: prompt },
  profile: { displayName: "Diseñador Upper", about: "Crea piezas gráficas de Upper (Ecuador y Colombia) fieles al Brandbook 2025: pregunta lo que falta, escribe el copy con el tono de la marca, adapta referencias y genera PNG y SVG." },
  memory: { level: "core", entries },
};
// Mismas validaciones que hace Buzz al importar
if (!snapshot.definition.name.trim() || !snapshot.profile.displayName.trim()) throw new Error("Nombre vacío");
const json = JSON.stringify(snapshot, null, 2);
if (Buffer.byteLength(json) >= 5 * 1024 * 1024) throw new Error("El snapshot supera 5 MiB");
const out = path.join(ROOT, "agente", "upper-disenador.agent.json");
await writeFile(out, json + "\n");
console.log(`Listo: ${path.relative(ROOT, out)} (${Math.round(Buffer.byteLength(json) / 1024)} KB, ${entries.length} entradas de memoria)`);
