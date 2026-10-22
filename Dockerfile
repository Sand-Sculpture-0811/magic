FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json server.mjs index.html style.css app.js ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8765
USER node
EXPOSE 8765
CMD ["node", "server.mjs"]
