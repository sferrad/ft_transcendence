FROM docker.io/node:20-alpine

WORKDIR /app

#Copie des fichiers obtenue grace a Vite
COPY package*.json ./

#Installation de Dependance
RUN npm install

#Copie de tous les fichier
COPY . .

#Port de Lecture
EXPOSE 3000

#Permets de lancer Vite a l'exterieur du container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
