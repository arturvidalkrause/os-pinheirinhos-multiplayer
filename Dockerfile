# Use uma imagem Node.js como base
FROM node:14

# Define o diretório de trabalho como /app/server
WORKDIR /app

# Copie o conteúdo da pasta server para o diretório de trabalho
COPY server /app

# Instala as dependências
RUN npm install

# Expõe a porta que a Railway usará
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
