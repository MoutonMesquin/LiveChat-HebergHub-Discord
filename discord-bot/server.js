// HebergHub Chat Server
// Ce serveur gère les communications en temps réel et l'intégration avec Discord

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client, GatewayIntentBits, Partials, ChannelType, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const requestIp = require('request-ip');

// Configuration
const PORT = process.env.PORT || 3000;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // Vous devrez configurer cette variable d'environnement
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID; // Vous devrez configurer cette variable d'environnement
const DISCORD_FORUM_CHANNEL_ID = process.env.DISCORD_FORUM_CHANNEL_ID; // Vous devrez configurer cette variable d'environnement
const DISCORD_SUPPORT_ROLE_ID = process.env.DISCORD_SUPPORT_ROLE_ID || 'VOTRE_ID_ROLE_SUPPORT';

// Vérification des variables d'environnement
if (!DISCORD_TOKEN || !DISCORD_GUILD_ID || !DISCORD_FORUM_CHANNEL_ID) {
    console.error('Erreur: Variables d\'environnement manquantes. Veuillez configurer DISCORD_TOKEN, DISCORD_GUILD_ID et DISCORD_FORUM_CHANNEL_ID.');
    process.exit(1);
}

// Variable pour stocker l'état de disponibilité du support
let supportAvailable = false;

// Fonction pour vérifier si des membres avec le rôle de support sont en ligne
async function checkSupportAvailability() {
    try {
        if (!discord.isReady()) return false;
        
        const guild = await discord.guilds.fetch(DISCORD_GUILD_ID);
        if (!guild) return false;
        
        // Récupérer les membres avec le rôle de support
        const role = await guild.roles.fetch(DISCORD_SUPPORT_ROLE_ID);
        if (!role) return false;
        
        // Récupérer tous les membres du serveur avec leurs présences
        await guild.members.fetch({ withPresences: true });
        
        // Récupérer les membres avec ce rôle qui sont en ligne
        const members = role.members.filter(member => 
            member.presence?.status === 'online' || 
            member.presence?.status === 'idle' || 
            member.presence?.status === 'dnd'
        );
        
        console.log(`Membres du support en ligne: ${members.size}`);
        
        return members.size > 0;
    } catch (error) {
        console.error('Erreur lors de la vérification de la disponibilité du support:', error);
        return false;
    }
}

// Initialisation de l'application Express
const app = express();

// Ajouter des middlewares CORS pour Express
app.use((req, res, next) => {
    // Autoriser à la fois le domaine sécurisé et le site principal
    const allowedOrigins = ['https://votre-domaine.com', 'https://www.votre-domaine.com'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        // En développement, on peut garder * mais en production c'est plus sécurisé de le limiter
        res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Gérer les requêtes OPTIONS (pre-flight)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Créer le dossier public s'il n'existe pas
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["https://votre-domaine.com", "https://www.votre-domaine.com"],
        methods: ["GET", "POST", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept"]
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware pour récupérer l'IP des clients
app.use(requestIp.mw({
    attributeName: 'clientIp',
    headerName: ['x-forwarded-for', 'x-real-ip']
}));

// Création du dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Fonction pour logger les événements
function logEvent(event, data) {
    const timestamp = new Date().toISOString();
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    const logMessage = `[${timestamp}] [${event}] ${JSON.stringify(data)}\n`;
    
    fs.appendFile(logFile, logMessage, (err) => {
        if (err) console.error('Erreur lors de l\'écriture du log:', err);
    });
    
    console.log(`[${timestamp}] [${event}]`, data);
}

// Initialisation du client Discord
const discord = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

// Map pour stocker les associations entre les sockets et les threads Discord
const socketToThread = new Map();

// Connexion à Discord
discord.once('ready', async () => {
    logEvent('DISCORD_READY', { username: discord.user.tag });
    console.log(`Bot Discord connecté en tant que ${discord.user.tag}`);
    
    // Vérifier la disponibilité du support dès le démarrage
    supportAvailable = await checkSupportAvailability();
    console.log(`Support disponible: ${supportAvailable}`);
    
    // Vérifier périodiquement la disponibilité du support (toutes les 60 secondes)
    setInterval(async () => {
        const newAvailability = await checkSupportAvailability();
        if (newAvailability !== supportAvailable) {
            supportAvailable = newAvailability;
            console.log(`Changement de disponibilité du support: ${supportAvailable}`);
        }
    }, 60000);
});

discord.login(DISCORD_TOKEN).catch(error => {
    logEvent('ERROR', {
        action: 'discord_login',
        error: error.message
    });
    console.error('Erreur de connexion à Discord:', error);
});

// API pour vérifier l'état du serveur
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        discord: discord.isReady() ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        socketConnections: io.sockets.sockets.size,
        timestamp: new Date().toISOString()
    });
});

// API pour vérifier la disponibilité du support
app.get('/api/support-availability', async (req, res) => {
    try {
        supportAvailable = await checkSupportAvailability();
        
        res.status(200).json({
            available: supportAvailable,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Erreur lors de la vérification de la disponibilité du support:', error);
        res.status(500).json({
            error: 'Erreur lors de la vérification de la disponibilité du support',
            available: false,
            timestamp: new Date().toISOString()
        });
    }
});

// Route de test simple
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>HebergHub Chat Server</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #0066CC; }
                    .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
                    .ok { background-color: #d4edda; color: #155724; }
                    .error { background-color: #f8d7da; color: #721c24; }
                </style>
            </head>
            <body>
                <h1>HebergHub Chat Server</h1>
                <div class="status ${discord.isReady() ? 'ok' : 'error'}">
                    Discord: ${discord.isReady() ? 'Connecté' : 'Déconnecté'}
                </div>
                <div class="status ok">
                    Uptime: ${Math.floor(process.uptime() / 60)} minutes
                </div>
                <div class="status ok">
                    Connexions Socket.IO actives: ${io.sockets.sockets.size}
                </div>
                <p>Serveur démarré le ${new Date().toLocaleString('fr-FR')}</p>
            </body>
        </html>
    `);
});

// Événements Socket.IO au niveau du serveur
io.engine.on("connection_error", (err) => {
    logEvent('SOCKET_SERVER_ERROR', {
        code: err.code,
        message: err.message,
        context: err.context
    });
    console.error('Erreur de connexion Socket.IO:', err);
});

// Gestion des connexions Socket.IO
io.on('connection', (socket) => {
    // Récupérer l'IP du client
    let clientIp = 'IP inconnue';
    
    // Essayer de récupérer l'IP à partir des en-têtes X-Forwarded-For ou X-Real-IP
    if (socket.handshake.headers['x-forwarded-for']) {
        // X-Forwarded-For peut contenir plusieurs IPs séparées par des virgules, prendre la première
        clientIp = socket.handshake.headers['x-forwarded-for'].split(',')[0].trim();
    } else if (socket.handshake.headers['x-real-ip']) {
        clientIp = socket.handshake.headers['x-real-ip'];
    } else if (socket.request.clientIp) {
        clientIp = socket.request.clientIp;
    } else if (socket.handshake.address) {
        clientIp = socket.handshake.address;
    }
    
    // Stocker l'IP dans l'objet socket pour une utilisation ultérieure
    socket.clientIp = clientIp;
    
    logEvent('SOCKET_CONNECTED', {
        socketId: socket.id,
        clientIp,
        userAgent: socket.request.headers ? socket.request.headers['user-agent'] : socket.handshake.headers['user-agent'],
        transport: socket.conn.transport.name
    });
    
    console.log(`Nouvelle connexion Socket.IO: ${socket.id} depuis ${clientIp}`);
    
    // Envoyer un message de confirmation de connexion
    socket.emit('connection_status', {
        status: 'connected',
        socketId: socket.id,
        serverTime: new Date().toISOString()
    });
    
    // Envoyer un message de bienvenue sans créer de thread Discord
    socket.emit('chat message', {
        message: 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
        timestamp: new Date().toISOString()
    });
    
    // Vérifier que le socket est bien connecté
    if (!socket.connected) {
        logEvent('WARNING', {
            action: 'socket_check',
            socketId: socket.id,
            message: 'Socket marqué comme connecté mais socket.connected est false'
        });
    }
    
    // Événement pour tester la connexion
    socket.on('ping', (callback) => {
        logEvent('PING', {
            socketId: socket.id,
            timestamp: new Date().toISOString()
        });
        
        // Si un callback est fourni, l'appeler avec un pong
        if (typeof callback === 'function') {
            callback({
                status: 'pong',
                time: new Date().toISOString(),
                socketId: socket.id
            });
        } else {
            // Sinon, émettre un événement pong
            socket.emit('pong', {
                time: new Date().toISOString(),
                socketId: socket.id
            });
        }
    });
    
    // Réception d'un message du client
    socket.on('chat message', async (data) => {
        try {
            logEvent('MESSAGE_RECEIVED', {
                socketId: socket.id,
                message: data.message,
                page: data.page,
                timestamp: new Date().toISOString()
            });
            
            console.log(`Message reçu du client ${socket.id}: ${data.message}`);
            
            // Confirmer la réception du message au client
            socket.emit('message_received', {
                status: 'received',
                messageId: Date.now().toString(),
                timestamp: new Date().toISOString()
            });
        
            // Récupérer le thread associé à ce socket ou en créer un nouveau
            let thread = socketToThread.get(socket.id);
            
            // Si aucun thread n'existe, en créer un nouveau pour le premier message
            if (!thread) {
                try {
                    // Créer un nouveau thread pour ce socket
                    // Utiliser l'IP stockée dans l'objet socket
                    thread = await createDiscordThread(socket.id, socket.clientIp || 'IP inconnue');
                    socketToThread.set(socket.id, thread);
                    
                    logEvent('THREAD_CREATED_ON_FIRST_MESSAGE', {
                        socketId: socket.id,
                        threadId: thread.id
                    });
                } catch (error) {
                    logEvent('ERROR', {
                        action: 'create_thread_on_first_message',
                        socketId: socket.id,
                        error: error.message
                    });
                    console.error('Erreur lors de la création du thread Discord:', error);
                    return; // Sortir de la fonction si on ne peut pas créer de thread
                }
            }
            
            // Maintenant que nous avons un thread (nouveau ou existant), envoyer le message
            try {
                const sentMessage = await thread.send({
                    content: `<@&${DISCORD_SUPPORT_ROLE_ID}> Nouveau message du visiteur`,
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#FF9900') // Couleur orange HebergHub
                            .setTitle('Message du visiteur')
                            .setDescription(data.message)
                            .addFields(
                                { name: 'Page', value: data.page || 'Non spécifiée' }
                            )
                            .setTimestamp()
                    ]
                });
                
                logEvent('MESSAGE_SENT_TO_DISCORD', {
                    socketId: socket.id,
                    threadId: thread.id,
                    messageId: sentMessage.id
                });
                
                console.log(`Message envoyé à Discord dans le thread ${thread.id}`);
            } catch (error) {
                logEvent('ERROR', {
                    action: 'send_to_discord',
                    socketId: socket.id,
                    threadId: thread ? thread.id : 'undefined',
                    error: error.message
                });
                console.error('Erreur lors de l\'envoi du message à Discord:', error);
                
                // Tenter de récupérer ou recréer le thread en cas d'erreur
                try {
                    let refreshedThread;
                    
                    if (thread) {
                        // Tenter de récupérer le thread existant
                        refreshedThread = await discord.channels.fetch(thread.id);
                    } 
                    
                    if (!refreshedThread) {
                        // Si on ne peut pas récupérer le thread, en créer un nouveau
                        // Utiliser l'IP stockée dans l'objet socket
                        refreshedThread = await createDiscordThread(socket.id, socket.clientIp || 'IP inconnue');
                        logEvent('THREAD_RECREATED', {
                            socketId: socket.id,
                            threadId: refreshedThread.id
                        });
                    }
                    
                    socketToThread.set(socket.id, refreshedThread);
                    
                    // Envoyer le message au thread récupéré/recréé
                    await refreshedThread.send({
                        content: `<@&${DISCORD_SUPPORT_ROLE_ID}> Nouveau message du visiteur`,
                        embeds: [
                            new EmbedBuilder()
                                .setColor('#FF9900')
                                .setTitle('Message du visiteur')
                                .setDescription(data.message)
                                .addFields(
                                    { name: 'Page', value: data.page || 'Non spécifiée' }
                                )
                                .setTimestamp()
                        ]
                    });
                    
                    logEvent('MESSAGE_RECOVERY_SUCCESS', {
                        socketId: socket.id,
                        threadId: refreshedThread.id
                    });
                } catch (recoveryError) {
                    logEvent('ERROR', {
                        action: 'message_recovery',
                        socketId: socket.id,
                        error: recoveryError.message
                    });
                }
            }
        } catch (error) {
            logEvent('ERROR', {
                action: 'process_chat_message',
                socketId: socket.id,
                error: error.message,
                stack: error.stack
            });
            console.error('Erreur lors du traitement du message:', error);
        }
    });
    
    // Déconnexion du client
    socket.on('disconnect', () => {
        logEvent('SOCKET_DISCONNECTED', {
            socketId: socket.id
        });
        
        // Informer le thread Discord que le client s'est déconnecté
        const thread = socketToThread.get(socket.id);
        if (thread) {
            thread.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Client déconnecté')
                        .setDescription('Le visiteur a quitté la conversation.')
                        .setTimestamp()
                ]
            }).catch(error => {
                logEvent('ERROR', {
                    action: 'send_disconnect_message',
                    socketId: socket.id,
                    threadId: thread.id,
                    error: error.message
                });
            });
            
            // Supprimer l'association
            socketToThread.delete(socket.id);
        }
    });
});

// Écouter les messages Discord pour les renvoyer au client
discord.on('messageCreate', async (message) => {
    // Ignorer les messages du bot lui-même
    if (message.author.bot) return;
    
    // Vérifier si le message provient d'un thread que nous suivons
    for (const [socketId, thread] of socketToThread.entries()) {
        if (message.channel.id === thread.id) {
            logEvent('DISCORD_MESSAGE', {
                author: message.author.tag,
                threadId: thread.id,
                socketId: socketId,
                content: message.content
            });
            
            // Récupérer le socket correspondant
            const socket = io.sockets.sockets.get(socketId);
            
            if (socket) {
                // Envoyer le message au client
                socket.emit('chat message', {
                    message: message.content,
                    timestamp: message.createdAt.toISOString()
                });
            }
            
            break;
        }
    }
});

// Fonction pour créer un nouveau thread Discord
async function createDiscordThread(socketId, clientIp) {
    try {
        // Vérifier que le bot Discord est prêt
        if (!discord.isReady()) {
            logEvent('WARNING', {
                action: 'createDiscordThread',
                message: 'Le bot Discord n\'est pas encore prêt, attente de 2 secondes'
            });
            
            // Attendre que le bot soit prêt
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!discord.isReady()) {
                throw new Error('Le bot Discord n\'est pas prêt après l\'attente');
            }
        }
        
        // Récupérer le salon forum
        logEvent('DEBUG', {
            action: 'createDiscordThread',
            step: 'fetching_guild',
            guildId: DISCORD_GUILD_ID
        });
        
        const guild = await discord.guilds.fetch(DISCORD_GUILD_ID);
        
        logEvent('DEBUG', {
            action: 'createDiscordThread',
            step: 'fetching_channel',
            channelId: DISCORD_FORUM_CHANNEL_ID
        });
        
        const forumChannel = await guild.channels.fetch(DISCORD_FORUM_CHANNEL_ID);
        
        if (!forumChannel) {
            throw new Error(`Salon ${DISCORD_FORUM_CHANNEL_ID} non trouvé`);
        }
        
        if (forumChannel.type !== ChannelType.GuildForum) {
            throw new Error(`Le salon ${DISCORD_FORUM_CHANNEL_ID} n'est pas un salon forum (type: ${forumChannel.type})`);
        }
        
        // Créer un nouveau thread avec la date
        const date = new Date().toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        logEvent('DEBUG', {
            action: 'createDiscordThread',
            step: 'creating_thread',
            threadName: `Chat du ${date}`
        });
        
        const thread = await forumChannel.threads.create({
            name: `Chat du ${date}`,
            message: {
                content: `<@&${DISCORD_SUPPORT_ROLE_ID}> Nouveau visiteur`,
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0066CC') // Couleur bleue HebergHub
                        .setTitle('Nouveau message reçu')
                        .setDescription('Un visiteur a envoyé un message et attend une réponse.')
                        .addFields(
                            { name: 'Socket ID', value: socketId },
                            { name: 'IP', value: clientIp },
                            { name: 'Date', value: date }
                        )
                        .setTimestamp()
                ]
            },
            autoArchiveDuration: 1440 // Archive après 24h d'inactivité
        });
        
        logEvent('THREAD_CREATED', {
            socketId: socketId,
            threadId: thread.id,
            threadName: thread.name
        });
        
        // Pas de message de test, le thread est créé uniquement quand un message est envoyé
        
        return thread;
    } catch (error) {
        logEvent('ERROR', {
            action: 'createDiscordThread',
            socketId: socketId,
            error: error.message,
            stack: error.stack
        });
        
        console.error('Erreur détaillée lors de la création du thread Discord:', error);
        
        // Tenter de créer un thread de secours en cas d'erreur
        try {
            // Attendre un peu avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const guild = await discord.guilds.fetch(DISCORD_GUILD_ID);
            const forumChannel = await guild.channels.fetch(DISCORD_FORUM_CHANNEL_ID);
            
            if (forumChannel && forumChannel.type === ChannelType.GuildForum) {
                const fallbackThread = await forumChannel.threads.create({
                    name: `SECOURS - Chat - IP: ${clientIp}`,
                    message: {
                        content: `Erreur lors de la création du thread initial: ${error.message}\nSocket ID: ${socketId}`
                    },
                    autoArchiveDuration: 1440
                });
                
                logEvent('FALLBACK_THREAD_CREATED', {
                    socketId: socketId,
                    threadId: fallbackThread.id
                });
                
                return fallbackThread;
            }
        } catch (fallbackError) {
            logEvent('ERROR', {
                action: 'create_fallback_thread',
                error: fallbackError.message
            });
        }
        
        throw error;
    }
}

// Démarrer le serveur
server.listen(PORT, () => {
    logEvent('SERVER_STARTED', {
        port: PORT
    });
    console.log(`Serveur démarré sur le port ${PORT}`);
});

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    logEvent('UNCAUGHT_EXCEPTION', {
        error: error.message,
        stack: error.stack
    });
    console.error('Exception non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    logEvent('UNHANDLED_REJECTION', {
        reason: reason.toString()
    });
    console.error('Promesse rejetée non gérée:', reason);
});