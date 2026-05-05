FROM node:18-alpine

WORKDIR /app

# Instalar git (necessário para dependências do Baileys)
RUN apk add --no-cache git

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
