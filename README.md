# HebergHub Live Chat System

Un système de chat en direct complet avec intégration Discord pour les sites web. Ce système permet aux visiteurs de votre site de communiquer directement avec votre équipe de support via une interface de chat élégante, tandis que votre équipe répond depuis Discord.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Architecture du système](#-architecture-du-système)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
  - [Configuration du bot Discord](#configuration-du-bot-discord)
  - [Configuration du serveur](#configuration-du-serveur)
  - [Intégration au site web](#intégration-au-site-web)
- [Déploiement](#-déploiement)
  - [Avec Docker](#avec-docker)
  - [Sans Docker](#sans-docker)
- [Personnalisation](#-personnalisation)
- [Fonctionnement détaillé](#-fonctionnement-détaillé)
- [Sécurité](#-sécurité)
- [Dépannage](#-dépannage)
- [Licence](#-licence)

## 🚀 Fonctionnalités

- **Interface utilisateur élégante** - Widget de chat responsive qui s'intègre facilement à n'importe quel site web
- **Intégration Discord** - Les messages des visiteurs sont envoyés à un salon Discord dédié
- **Threads Discord** - Chaque conversation crée un thread Discord séparé pour une organisation optimale
- **Détection de présence** - Le chat n'apparaît que lorsque des membres du support sont en ligne
- **Notifications** - Notification visuelle lorsqu'un nouveau message arrive
- **Journalisation** - Enregistrement détaillé des événements pour le débogage
- **Sécurité** - Protection CORS et validation des entrées
- **Déploiement facile** - Configuration Docker prête à l'emploi

## 🏗 Architecture du système

Le système se compose de trois parties principales :

1. **Client JavaScript** (`live-chat.js`) - S'exécute dans le navigateur du visiteur et fournit l'interface utilisateur du chat
2. **Serveur Node.js** (`server.js`) - Gère les connexions WebSocket et fait le pont entre le client et Discord
3. **Bot Discord** - Intégré au serveur, il gère les communications avec Discord

### Flux de données

```
Visiteur du site → Widget de chat → Socket.IO → Serveur Node.js → API Discord → Thread Discord → Équipe de support
                                       ↑                                      ↓
                                       └──────────────────────────────────────┘
                                                Communication bidirectionnelle
```

## 📋 Prérequis

- Node.js 16+ et npm
- Un serveur Discord avec les permissions administrateur
- Un compte développeur Discord pour créer un bot
- Un domaine avec SSL pour le déploiement en production

## 🔧 Installation

### Configuration du bot Discord

1. Créez une application Discord sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Dans l'onglet "Bot", créez un bot et copiez son token
3. Activez les "Privileged Gateway Intents" suivants :
   - SERVER MEMBERS INTENT
   - MESSAGE CONTENT INTENT
   - PRESENCE INTENT
4. Dans l'onglet "OAuth2 > URL Generator", sélectionnez les scopes `bot` et `applications.commands`
5. Sélectionnez les permissions suivantes :
   - Read Messages/View Channels
   - Send Messages
   - Create Public Threads
   - Send Messages in Threads
   - Manage Threads
   - Read Message History
   - Use Slash Commands
6. Utilisez l'URL générée pour inviter le bot sur votre serveur Discord

### Configuration du serveur

1. Clonez ce dépôt :
```bash
git clone https://github.com/votre-utilisateur/heberghub-live-chat.git
cd heberghub-live-chat/discord-bot
```

2. Installez les dépendances :
```bash
npm install
```

3. Créez un fichier `.env` à la racine du dossier `discord-bot` avec les variables suivantes :
```
PORT=3000
DISCORD_TOKEN=votre_token_discord
DISCORD_GUILD_ID=id_de_votre_serveur_discord
DISCORD_FORUM_CHANNEL_ID=id_du_salon_forum
DISCORD_SUPPORT_ROLE_ID=id_du_role_support
```

Pour obtenir les IDs Discord :
- Activez le mode développeur dans Discord (Paramètres > Avancés > Mode développeur)
- Pour l'ID du serveur : clic droit sur le nom du serveur > "Copier l'identifiant"
- Pour l'ID du salon : clic droit sur le salon > "Copier l'identifiant"
- Pour l'ID du rôle : allez dans les paramètres du serveur > Rôles > clic droit sur le rôle > "Copier l'identifiant"

4. Créez un salon de type "Forum" dans votre serveur Discord pour recevoir les conversations

5. Créez un rôle "Support" et attribuez-le aux membres de votre équipe de support

### Intégration au site web

1. Ajoutez le script Socket.IO à votre site :
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

2. Ajoutez le script `live-chat.js` à votre site :
```html
<script src="/assets/js/live-chat.js"></script>
```

3. Modifiez le fichier `live-chat.js` pour remplacer `https://votre-domaine.com` par l'URL de votre serveur de chat

## 🚢 Déploiement

### Avec Docker

1. Assurez-vous que Docker et Docker Compose sont installés sur votre serveur

2. Modifiez le fichier `docker-compose.yml` pour configurer les variables d'environnement

3. Démarrez le conteneur :
```bash
docker-compose up -d
```

### Sans Docker

1. Installez Node.js et npm sur votre serveur

2. Configurez un processus de gestion comme PM2 :
```bash
npm install -g pm2
pm2 start server.js --name "heberghub-chat"
pm2 save
pm2 startup
```

3. Configurez un proxy inverse (Nginx, Apache) pour exposer le serveur sur le port 443 avec SSL

Exemple de configuration Nginx :
```nginx
server {
    listen 443 ssl;
    server_name chat.votre-domaine.com;

    ssl_certificate /chemin/vers/certificat.pem;
    ssl_certificate_key /chemin/vers/cle.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 🎨 Personnalisation

### Couleurs et style

Le widget de chat utilise des classes CSS qui peuvent être facilement personnalisées. Les principales classes sont :

- `bg-hub-blue` : Couleur principale du chat (en-tête)
- `bg-hub-light-blue` : Couleur secondaire (boutons au survol)
- `bg-hub-orange` : Couleur d'accent (notifications, messages utilisateur)

Vous pouvez modifier ces couleurs en ajoutant des classes CSS personnalisées à votre site.

### Textes et messages

Vous pouvez modifier les textes dans le fichier `live-chat.js`, notamment :

- Message de bienvenue
- Titre du chat
- Placeholder du champ de saisie

### Comportement

Plusieurs aspects du comportement peuvent être ajustés :

- Fréquence de vérification de la disponibilité du support (ligne 28)
- Délai de reconnexion (ligne 118)
- Fréquence des tests de connexion (ligne 236)

## 🔍 Fonctionnement détaillé

### Détection de présence

Le système vérifie périodiquement si des membres avec le rôle de support sont en ligne sur Discord. Si aucun membre n'est disponible, le widget de chat ne s'affiche pas aux visiteurs.

### Création de threads

Lorsqu'un visiteur envoie son premier message, le système crée automatiquement un nouveau thread dans le salon forum Discord. Tous les messages suivants de ce visiteur seront envoyés dans ce même thread.

### Gestion des déconnexions

Si un visiteur se déconnecte (ferme l'onglet ou quitte le site), le système envoie une notification dans le thread Discord correspondant. Si le visiteur revient plus tard, un nouveau thread sera créé.

### Journalisation

Le système enregistre tous les événements importants dans des fichiers de log quotidiens, ce qui facilite le débogage et l'analyse des problèmes.

## 🔒 Sécurité

### CORS

Le serveur est configuré avec des restrictions CORS pour n'accepter que les connexions provenant de domaines autorisés. En production, vous devriez limiter ces domaines à vos sites web officiels.

### Validation des entrées

Toutes les entrées utilisateur sont validées et nettoyées avant d'être traitées.

### Protection contre les abus

Le système inclut des mécanismes pour limiter les tentatives de connexion et prévenir les abus.

## 🔧 Dépannage

### Le widget ne s'affiche pas

- Vérifiez que le script est correctement chargé dans votre page
- Vérifiez que des membres avec le rôle de support sont en ligne sur Discord
- Vérifiez les erreurs dans la console du navigateur

### Les messages ne sont pas envoyés à Discord

- Vérifiez que le bot est connecté (endpoint `/health`)
- Vérifiez que le bot a les permissions nécessaires dans le salon forum
- Vérifiez les logs du serveur pour identifier les erreurs

### Les réponses de Discord n'arrivent pas au client

- Vérifiez que le bot a accès au thread Discord
- Vérifiez que la connexion WebSocket est active
- Vérifiez les logs du serveur pour identifier les erreurs de communication

## 📄 Licence

Ce projet est distribué sous licence MIT. Voir le fichier `LICENSE` pour plus d'informations.

---

Développé avec ❤️ par HebergHub