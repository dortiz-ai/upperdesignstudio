// index.html está escrito como fragmento (formato de los artifacts de claude.ai).
// Esta función le agrega el esqueleto HTML completo para servirlo fuera de claude.ai.
export function wrapPage(html) {
  if (/^\s*<!doctype/i.test(html)) return html;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="assets/Logo_Upper.svg"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${html}</body></html>`;
}
