FROM node:20-alpine

WORKDIR /app

#Copie des fichiers obtenue grace a Vite
COPY package*.json ./

#Installation de Dependance
RUN npm install

#Copie de tous les fichier
COPY . .

#Port de Lecture
EXPOSE 5173

#Permets de lancer Vite a l'exterieur du container
CMD ["npm", "run", "dev", "--", "--host"]
