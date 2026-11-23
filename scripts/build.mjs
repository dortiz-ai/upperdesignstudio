// Genera public/ para Vercel: la página con su esqueleto HTML, el logo, las ilustraciones y las tipografías.
// Vercel sirve public/ desde su CDN; server.js solo atiende /api.
import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { wrapPage } from "../lib/pagina.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public");
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await writeFile(path.join(OUT, "index.html"), wrapPage(await readFile(path.join(ROOT, "index.html"), "utf8")));
await cp(path.join(ROOT, "assets"), path.join(OUT, "assets"), { recursive: true });
await cp(path.join(ROOT, "fonts"), path.join(OUT, "fonts"), { recursive: true, filter: (f) => !f.endsWith(".txt") });
console.log("public/ listo");
