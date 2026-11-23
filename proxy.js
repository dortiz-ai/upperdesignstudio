// Vercel: pide usuario y contraseña antes de servir cualquier ruta (página, recursos y /api).
// Usuarios en la variable STUDIO_USERS="nombre:clave,otra:clave". Sin usuarios, el sitio queda abierto.
import { next } from "@vercel/functions";

function users() {
  return new Map((process.env.STUDIO_USERS || "").split(",").map((s) => s.trim()).filter(Boolean)
    .map((s) => { const i = s.indexOf(":"); return [s.slice(0, i), s.slice(i + 1)]; }));
}

export default function proxy(request) {
  const list = users();
  if (!list.size) return next();
  const [type, value] = (request.headers.get("authorization") || "").split(" ");
  if (type === "Basic" && value) {
    const [u, ...rest] = atob(value).split(":");
    if (list.has(u) && list.get(u) === rest.join(":")) return next();
  }
  return new Response("Upper Studio: inicia sesión con tu usuario del equipo.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Upper Studio", charset="UTF-8"', "content-type": "text/plain; charset=utf-8" },
  });
}
