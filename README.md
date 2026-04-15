# Integrix - Precision in every integral

Integrix est une application web avancée pour l'intégration numérique, offrant une visualisation en temps réel et une analyse comparative de différentes méthodes mathématiques.

## 🚀 Fonctionnalités

- **Calcul Symbolique** : Utilise Nerdamer pour fournir des valeurs exactes analytiques.
- **Méthodes Numériques** : Rectangle (Gauche/Droite), Point Milieu, Trapèze, Simpson, Romberg et Runge-Kutta 4.
- **Visualisation Dynamique** : Graphiques interactifs avec D3.js.
- **Mode Points** : Intégration à partir de données discrètes.
- **Analyse Comparative** : Tableau des erreurs et temps d'exécution.

## 🛠️ Prérequis

Pour faire tourner l'application localement, vous avez besoin de :

- **Node.js** (Version 18 ou supérieure recommandée)
- **npm** (inclus avec Node.js)

## 📦 Installation

1. **Téléchargez le code source** (ou clonez le dépôt).
2. Ouvrez un terminal dans le dossier du projet.
3. Installez les dépendances :
   ```bash
   npm install
   ```

## 🏃 Lancement

Pour lancer l'application en mode développement :

```bash
npm run dev
```

Une fois lancé, ouvrez votre navigateur à l'adresse : [http://localhost:3000](http://localhost:3000)

## 🏗️ Construction pour la Production

Pour générer les fichiers optimisés pour le déploiement :

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`.

## 📚 Technologies utilisées

- **React 18** + **TypeScript**
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **D3.js** (Visualisation)
- **Mathjs** & **Nerdamer** (Calculs mathématiques)
- **Lucide React** (Icônes)
