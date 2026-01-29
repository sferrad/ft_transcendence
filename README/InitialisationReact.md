# Frontend - React + TypeScript + Vite

## Commandes essentielles

### Initialiser le projet
```bash
npm create vite@latest
```
Lance un serveur de dev avec hot reload - le code se réaffiche instantanément quand on change quelque chose.

### Construire l'image Docker
```bash
docker build -t my-react-app .
```

### Lancer en Docker
```bash
docker run -p 5173:5173 my-react-app
```
Accès : http://localhost:5173

---

## Stack utilisée
- **React** : Framework UI
- **TypeScript** : Typage (plus de sécurité)
- **Vite** : Serveur de dev ultra-rapide
- **Docker** : Conteneurisation

---

## Structure
```
src/          → Code React + TypeScript
public/       → Assets statiques
package.json  → Dépendances
vite.config.ts → Config Vite
```

## Ressources
- [Vite](https://vitejs.dev)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs/)
