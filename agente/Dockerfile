# Servidor MCP del agente de diseño Upper (modo HTTP).
# Construir desde la raíz del repo:  docker build -f agente/Dockerfile -t upper-agente .
# Ejecutar:                          docker run -p 8787:8787 -e AGENTE_TOKEN=un-token-largo upper-agente
FROM node:22-bookworm-slim
WORKDIR /app
RUN npm init -y >/dev/null && npm pkg set type=module && npm install playwright@1.63.0 && npx playwright install --with-deps chromium && rm -rf /root/.npm
COPY index.html ./
COPY assets ./assets
COPY lib ./lib
COPY scripts/render.mjs ./scripts/render.mjs
COPY agente ./agente
ENV PORT=8787
EXPOSE 8787
CMD ["node", "agente/mcp-server.mjs", "--http", "8787"]
