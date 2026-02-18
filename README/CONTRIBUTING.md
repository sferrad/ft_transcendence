# Guide de Contribution pour le Projet ft_transcendence

Bienvenue dans le projet ft_transcendence !

Ce guide vous fournira les informations nécessaires pour contribuer efficacement.
Ce guide couvre le workflow Git complet (pull, branch, commit, push, PR), les tests, le style de code, et la résolution des conflits pour éviter les problèmes fréquents.

## Organisation du dépôt

Le dépôt est structuré de manière à faciliter la collaboration et la gestion des contributions :

```
ft_transcendence/
├── srcs/               # Code source du serveur web
└── README.md           # Documentation principale
```

## Stratégie de branches

- `main` → code stable
- `dev/` → intégration (ex: frontend, backend, etc.)
- `feature/...` → nouvelle fonctionnalité
- `fix/...` → correction de bug

## Workflow Git

1. Clonez le dépôt :

```bash
git clone <URL-du-depot>
cd ft_transcendence
git status
```

2. Se placer sur dev et se mettre à jour : 

```bash
git checkout dev
git pull origin dev
```

2. Créez une branche pour votre fonctionnalité ou correction de bug :

```bash
git checkout -b feature/nom-de-la-fonctionnalite
# ou
git checkout -b fix/description-du-bug
```
Puis poussez la branche créée vers le dépôt distant :

```bash
git push -u origin feature/nom-de-la-fonctionnalite
# ou
git push -u origin fix/description-du-bug
```

3. Faites vos modifications dans la branche créée.

4. Ajoutez et commitez vos changements avec des messages clairs :

```bash
git add .
git commit -m "feat: Description claire de la modification"
```
5. Avant de pousser vos modifications, assurez-vous que votre branche est à jour avec
la branche de destination (dev) :

```bash
# Mettre à jour la branche de developpement
git checkout dev
git pull origin dev

# Revenir à votre branche de fonctionnalité
git checkout feature/nom-de-la-fonctionnalite

# Fusionner les dernières modifications de dev dans votre branche
git merge dev
```

6. Résolvez les conflits s'il y en a, puis poussez votre branche :

```bash
git push origin feature/nom-de-la-fonctionnalite
```

7. Option1 : Ouvrez une Pull Request (PR) sur GitHub pour que vos modifications soient examinées et fusionnées
dans la branche principale.

Option2 : Fusionnez directement votre branche dans dev après revue de code.

```bash
# Se placer sur dev
git checkout dev

# Fusionner la branche de fonctionnalité
git merge feature/nom-de-la-fonctionnalite

# Pousser les modifications fusionnées
git push origin dev
```

8. Supprimez la branche locale et distante après la fusion :

```bash
git branch -d feature/nom-de-la-fonctionnalite
git push origin --delete feature/nom-de-la-fonctionnalite
```

Resolution des conflits : voir la section "Résolution des conflits" ci-dessous.

- 1.Identifiez les fichiers en conflit.

- 2.Ouvrez les fichiers et recherchez les sections marquées par Git.
  (<<<<<, =====, >>>>>)

- 3.Modifiez le code pour résoudre les conflits.

- 4.Ajoutez les fichiers résolus :
```bash
git add <fichier_conflit>
```

- 5.Continuez la fusion :
```bash
git commit
```

- 6.Poussez les modifications résolues :
```bash
git push origin feature/nom-de-la-fonctionnalite
```

### Convention de commit

Utilisez des messages de commit clairs et descriptifs. Voici quelques exemples de préfixes courants :

  - `feat:` pour une nouvelle fonctionnalité
  - `fix:` pour une correction de bug
  - `refactor:` pour des modifications de code qui n'ajoutent pas de fonctionnalité ni ne corrigent de bug
  - `style:` pour des modifications de style (formatage, espaces, etc.)
  - `test:` pour l'ajout ou la modification de tests
  - `docs:` pour des modifications de documentation

- Exemple : `feat: ajouter la gestion des requêtes POST`

## Tests

Avant de soumettre une Pull Request, assurez-vous que tous les tests passent. Utilisez le Makefile pour
compiler et exécuter les tests :

```bash
make -f Makefile.tests run
ou
make -f Makefile.tests
./runTests
```

Puis effacer les fichiers compilés des tests :

```bash
make -f Makefile.tests clean
```

## Issues

Utilisez les issues pour signaler des bugs ou proposer des améliorations. Assurez-vous de fournir
des descriptions claires et des étapes pour reproduire les problèmes.

1. Créez une nouvelle issue sur GitHub (onglet "New Issue").
2. Remplissez le titre et la description avec des informations détaillées.
3. Assignez des labels appropriés (bug, enhancement, question, etc.).
4. Assignez l'issue à vous-même ou à un autre contributeur si nécessaire.
5. Cliquez sur "Submit new issue".

## Bonnes pratiques

- Ne jamais pousser directement sur les branches `main` ou `dev`.
- Faites des commits fréquents avec des messages clairs.
- Documentez vos modifications dans le code et dans la documentation si nécessaire.
- Tirez régulièrement les dernières modifications de la branche principale pour éviter les conflits majeurs.
- Revoyez le code des autres contributeurs et fournissez des commentaires constructifs.
- Faire des issues pour signaler les bugs ou proposer des améliorations.

## Style de code

Respectez les conventions de style de code C++98.

Merci pour votre travail sur le projet Webserv !
