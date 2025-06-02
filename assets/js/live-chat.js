// HebergHub Live Chat
// Ce script gère l'interface utilisateur du chat en direct

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier d'abord si le support est disponible
    checkSupportAvailability();
    
    // Fonction pour vérifier la disponibilité du support
    function checkSupportAvailability() {
        fetch('https://votre-domaine.com/api/support-availability')
            .then(response => response.json())
            .then(data => {
                if (data.available) {
                    initializeChat();
                } else {
                    // Si le support n'est pas disponible, ne pas afficher le chat
                    console.log('Support non disponible, chat masqué');
                }
            })
            .catch(error => {
                // En cas d'erreur, afficher le chat par défaut
                console.error('Erreur lors de la vérification de la disponibilité du support:', error);
                initializeChat();
            });
    }
    
    // Vérifier périodiquement la disponibilité du support (toutes les 5 minutes)
    setInterval(checkSupportAvailability, 300000);
    
    // Fonction pour initialiser le chat
    function initializeChat() {
        // Si le chat existe déjà, ne pas le recréer
        if (document.getElementById('hh-chat-container')) {
            return;
        }
        
        // Création de l'élément de chat
        const chatContainer = document.createElement('div');
        chatContainer.id = 'hh-chat-container';
        chatContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col';
        chatContainer.innerHTML = `
        <div id="hh-chat-button" class="bg-hub-blue hover:bg-hub-light-blue text-white rounded-full p-3 shadow-lg cursor-pointer self-end transition-all duration-300 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span id="hh-chat-notification" class="hidden absolute -top-1 -right-1 bg-hub-orange text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">1</span>
        </div>
        <div id="hh-chat-box" class="hidden bg-white rounded-lg shadow-xl overflow-hidden flex flex-col w-80 h-96 mb-2 border border-gray-200">
            <div class="bg-hub-blue text-white p-3 flex justify-between items-center">
                <div class="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span class="font-medium">Support HebergHub</span>
                </div>
                <button id="hh-chat-close" class="text-white hover:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div id="hh-chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3">
                <div class="flex items-start">
                    <div class="bg-hub-blue bg-opacity-10 rounded-lg p-3 max-w-[80%]">
                        <p class="text-sm text-gray-800">Bonjour ! Comment puis-je vous aider aujourd'hui ?</p>
                        <span class="text-xs text-gray-500 mt-1 block">Support HebergHub</span>
                    </div>
                </div>
            </div>
            <div id="hh-chat-input-container" class="p-3 border-t border-gray-200">
                <form id="hh-chat-form" class="flex">
                    <input 
                        type="text" 
                        id="hh-chat-input" 
                        class="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-hub-blue focus:border-transparent"
                        placeholder="Écrivez votre message..."
                        autocomplete="off"
                    >
                    <button 
                        type="submit" 
                        class="bg-hub-blue hover:bg-hub-light-blue text-white rounded-r-lg px-4 py-2 transition-colors duration-300"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatContainer);
    
    // Gestion des événements
    const chatButton = document.getElementById('hh-chat-button');
    const chatBox = document.getElementById('hh-chat-box');
    const chatClose = document.getElementById('hh-chat-close');
    const chatForm = document.getElementById('hh-chat-form');
    const chatInput = document.getElementById('hh-chat-input');
    const chatMessages = document.getElementById('hh-chat-messages');
    const chatNotification = document.getElementById('hh-chat-notification');
    
    // Ouvrir/fermer le chat
    chatButton.addEventListener('click', function() {
        chatBox.classList.toggle('hidden');
        chatNotification.classList.add('hidden');
        chatInput.focus();
    });
    
    chatClose.addEventListener('click', function() {
        chatBox.classList.add('hidden');
    });
    
    // Connexion Socket.IO
    const socket = io('https://votre-domaine.com', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });
    
    // Ajouter un gestionnaire d'événements pour les erreurs de transport
    socket.io.on("error", (error) => {
        addMessage('Erreur de connexion au serveur. Veuillez réessayer plus tard.', 'system');
    });
    
    // Envoi de message
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = chatInput.value.trim();
        
        if (message) {
            // Ajouter le message à l'interface
            addMessage(message, 'user');
            
            // Envoyer le message au serveur
            const messageData = {
                message: message,
                timestamp: new Date().toISOString(),
                page: window.location.href
            };
            
            socket.emit('chat message', messageData);
            
            // Vérifier si le message a été envoyé
            if (!socket.connected) {
                socket.connect();
                
                // Réessayer après un court délai
                setTimeout(() => {
                    if (socket.connected) {
                        socket.emit('chat message', messageData);
                    } else {
                        addMessage('Votre message n\'a pas pu être envoyé. Veuillez réessayer plus tard.', 'system');
                    }
                }, 1000);
            }
            
            // Vider l'input
            chatInput.value = '';
        }
    });
    
    // Réception de message
    socket.on('chat message', function(data) {
        addMessage(data.message, 'support');
        
        // Si le chat est fermé, afficher une notification
        if (chatBox.classList.contains('hidden')) {
            chatNotification.classList.remove('hidden');
        }
    });
    
    // Fonction pour ajouter un message à l'interface
    function addMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.className = 'flex items-start ' + (sender === 'user' ? 'justify-end' : '');
        
        const messageContent = document.createElement('div');
        
        // Définir la classe en fonction du type d'expéditeur
        if (sender === 'user') {
            messageContent.className = 'bg-hub-orange bg-opacity-10 rounded-lg p-3 max-w-[80%]';
        } else if (sender === 'system') {
            messageContent.className = 'bg-gray-200 rounded-lg p-3 max-w-[80%] mx-auto';
        } else {
            messageContent.className = 'bg-hub-blue bg-opacity-10 rounded-lg p-3 max-w-[80%]';
        }
        
        const messageText = document.createElement('p');
        messageText.className = 'text-sm text-gray-800';
        messageText.textContent = message;
        
        const messageTime = document.createElement('span');
        messageTime.className = 'text-xs text-gray-500 mt-1 block';
        
        if (sender === 'user') {
            messageTime.textContent = 'Vous';
        } else if (sender === 'system') {
            messageTime.textContent = 'Système';
        } else {
            messageTime.textContent = 'Support HebergHub';
        }
        
        messageContent.appendChild(messageText);
        messageContent.appendChild(messageTime);
        messageElement.appendChild(messageContent);
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Ajouter des événements de connexion/déconnexion Socket.IO
    socket.on('connect', function() {
        // Envoyer un ping pour tester la connexion
        socket.emit('ping');
    });
    
    socket.on('disconnect', function() {
        addMessage('La connexion au serveur a été perdue. Tentative de reconnexion...', 'system');
    });
    
    socket.on('connect_error', function() {
        addMessage('Impossible de se connecter au serveur de chat.', 'system');
    });
    
    // Fonction pour tester la connexion
    function testConnection() {
        if (!socket.connected) {
            socket.connect();
        }
    }
    
    // Tester la connexion toutes les 30 secondes
    setInterval(testConnection, 30000);
    }
});