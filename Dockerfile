# Use uma imagem Node.js como base
FROM node:14

# Define o diretório de trabalho como /app
WORKDIR /app

# Copie o conteúdo da pasta server para o diretório de trabalho
COPY server/package.json /app/package.json
COPY server/package-lock.json /app/package-lock.json
COPY server /app

# Instala as dependências
RUN npm install

# Expõe a porta que a Railway usará
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "server.js"]
