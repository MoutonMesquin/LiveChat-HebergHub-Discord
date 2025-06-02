# HebergHub Chat Server

Ce serveur gère les communications en temps réel entre les visiteurs de votre site web et votre équipe de support via Discord.

## Fonctionnalités

- Serveur WebSocket avec Socket.IO pour les communications en temps réel
- Intégration avec Discord pour gérer les conversations
- Création automatique de threads Discord pour chaque conversation
- Détection de présence des membres du support
- API pour vérifier la disponibilité du support
- Journalisation détaillée des événements

## Prérequis

- Node.js 16+ et npm
- Un serveur Discord avec les permissions administrateur
- Un bot Discord avec les intents appropriés

## Installation

1. Installez les dépendances :
```bash
npm install
```

2. Copiez le fichier `.env.example` en `.env` et configurez les variables d'environnement :
```bash
cp .env.example .env
```

3. Modifiez le fichier `.env` avec vos propres valeurs :
```
PORT=3000
DISCORD_TOKEN=votre_token_discord
DISCORD_GUILD_ID=id_de_votre_serveur_discord
DISCORD_FORUM_CHANNEL_ID=id_du_salon_forum
DISCORD_SUPPORT_ROLE_ID=id_du_role_support
```

## Démarrage

### En développement

```bash
npm run dev
```

### En production

```bash
npm start
```

### Avec Docker

```bash
docker-compose up -d
```

## Structure du projet

- `server.js` - Point d'entrée principal du serveur
- `public/` - Fichiers statiques servis par le serveur
- `logs/` - Journaux générés par le serveur

## API

### GET /health

Vérifie l'état du serveur et retourne des informations de diagnostic.

### GET /api/support-availability

Vérifie si des membres du support sont en ligne sur Discord.

## Événements Socket.IO

### Événements client → serveur

- `chat message` - Envoie un message du client au serveur
- `ping` - Teste la connexion au serveur

### Événements serveur → client

- `chat message` - Envoie un message du serveur au client
- `connection_status` - Informe le client de l'état de sa connexion
- `message_received` - Confirme la réception d'un message
- `pong` - Répond à un ping du client

## Dépannage

### Le bot ne se connecte pas à Discord

Vérifiez que :
- Le token Discord est correct
- Le bot a les intents nécessaires activés dans le portail développeur Discord
- Le bot a été invité sur le serveur avec les bonnes permissions

### Les messages ne sont pas envoyés à Discord

Vérifiez que :
- Le bot a accès au salon forum spécifié
- L'ID du salon forum est correct
- Le bot a les permissions pour créer des threads et envoyer des messages

### Les clients ne peuvent pas se connecter

Vérifiez que :
- Le serveur est accessible depuis l'extérieur
- Les paramètres CORS sont correctement configurés
- Le port est ouvert et accessible

## Licence

Ce projet est distribué sous licence MIT.