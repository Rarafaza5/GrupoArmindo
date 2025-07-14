const firebaseConfig = {
  apiKey: "AIzaSyBmaIc7aA25g5WVP_DTGHOCEtnW1ZXuyNc",
  authDomain: "aawards.firebaseapp.com",
  databaseURL: "https://aawards-default-rtdb.firebaseio.com",
  projectId: "aawards",
  storageBucket: "aawards.firebasestorage.app",
  messagingSenderId: "839334918366",
  appId: "1:839334918366:web:81f2bbfc78fd85f046ea4f",
  measurementId: "G-Z9YLSTGHST"
};

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- Configuração do Player ---
// SUBSTITUA PELO ID DA SUA LIVE DO YOUTUBE
const YOUTUBE_LIVE_ID = "BkAxRj9g5MY"; // Exemplo: "jfKfPfyDRFI"

// --- Referências do Database ---
const messagesRef = database.ref('chat_messages');
const notificationsRef = database.ref('notifications');
const agendaRef = database.ref('agenda');
const playerTextsRef = database.ref('player_texts');
const liveStatusRef = database.ref('live_status'); // Referência para o estado da live
const forbiddenWordsRef = database.ref('forbidden_words'); // Referência para palavras proibidas
const reactionsRef = database.ref('reactions'); // REFERÊNCIA PARA REAÇÕES (ainda usada para contagem)

// --- Variáveis Globais ---
let forbiddenWords = []; // Array para armazenar as palavras proibidas
let currentAgendaItemId = null; // Para guardar o ID do segmento atual
const messageCache = new Map(); // NOVO: Cache para armazenar dados das mensagens

// Não precisamos mais manter as contagens no frontend se não as exibimos,
// mas as referências aos spans são mantidas caso o painel de admin precise delas.
// Os objetos reactionCounts e reactionIcons também são mantidos para a lógica de contagem no Firebase.
const reactionCounts = {
    like: 0,
    heart: 0,
    laugh: 0,
    sad: 0,
    clap: 0
};
const reactionIcons = { // Mapeamento de reações para ícones e cores (ainda útil para a lógica)
    like: { icon: 'far fa-thumbs-up', color: '#007bff' },
    heart: { icon: 'far fa-heart', color: '#dc3545' },
    laugh: { icon: 'far fa-laugh-squint', color: '#ffc107' },
    sad: { icon: 'far fa-sad-tear', color: '#6c757d' },
    clap: { icon: 'far fa-hand-clap', color: '#28a745' }
};


// --- Elementos HTML ---
const chatMessagesDiv = document.getElementById('chat-messages');
const chatUsernameInput = document.getElementById('chat-username');
const chatMessageInput = document.getElementById('chat-message-input');
const sendChatMessageBtn = document.getElementById('send-chat-message');
const notificationOverlay = document.getElementById('notification-overlay');
const notificationText = document.getElementById('notification-text');
const notificationTypeIcon = notificationOverlay.querySelector('.notification-type-icon');
const agendaListDiv = document.getElementById('agenda-list');
const playerOverlayTextsContainer = document.getElementById('player-overlay-texts');
const videoPlayerDiv = document.getElementById('video-player');
const liveOfflineMessage = document.getElementById('live-offline-message');

// Elementos das Reações (mantidos para lógica, mas não para exibição direta)
// Estes IDs são necessários para os listeners e atualizações de contagem.
const reactionButtons = document.querySelectorAll('.reaction-button');
const likeCountSpan = document.getElementById('like-count');
const heartCountSpan = document.getElementById('heart-count');
const laughCountSpan = document.getElementById('laugh-count');
const sadCountSpan = document.getElementById('sad-count');
const clapCountSpan = document.getElementById('clap-count');
// O container de explosão de reações também será movido para fora da tela
const reactionBurstContainer = document.getElementById('reaction-burst-container');


// --- Funções de Ajuda ---
function getRandomColor() {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98FB98', '#DA70D6', '#FFD700', '#ADD8E6', '#FFC0CB', '#8A2BE2'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateString = date.toLocaleDateString('pt-BR', optionsDate);
    const timeString = date.toLocaleTimeString('pt-BR', optionsTime);
    return { dateString, timeString };
}

// Função para filtrar mensagens do chat
function filterMessage(message) {
    let filteredMessage = message;
    forbiddenWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        filteredMessage = filteredMessage.replace(regex, '***');
    });
    return filteredMessage;
}


// --- Lógica do Player de Vídeo (ATUALIZADA para controles padrão do YouTube) ---
function initializePlayer() {
    if (YOUTUBE_LIVE_ID && YOUTUBE_LIVE_ID !== "YOUR_LIVE_ID") {
        videoPlayerDiv.innerHTML = `
            <iframe width="100%" height="100%"
                    src="https://www.youtube.com/embed/${YOUTUBE_LIVE_ID}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&showinfo=0&disablekb=1"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
            </iframe>
        `;
        // Explicação dos parâmetros da URL:
        // autoplay=1: Inicia o vídeo automaticamente.
        // mute=0: Não inicia o vídeo mudo. (mude para 1 se quiser iniciar mudo)
        // controls=0: Remove todos os controles do player.
        // modestbranding=1: Exibe um logo menor do YouTube.
        // rel=0: Não mostra vídeos relacionados ao final.
        // showinfo=0: (Deprecado, mas adicionado por segurança) Esconde o título e uploader.
        // disablekb=1: Desabilita os controles de teclado (ex: barra de espaço para pausar/play).

    } else {
        videoPlayerDiv.innerHTML = `<p style="text-align: center; color: var(--color-text-muted); padding-top: 50px;">ID do vídeo da live não configurado. Por favor, edite 'script.js'.</p>`;
    }
}
// Inicializa o player ao carregar a página
initializePlayer();


// --- Lógica de Chat ---
// Carregar username salvo no localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedUsername = localStorage.getItem('chatUsername');
    if (savedUsername) {
        chatUsernameInput.value = savedUsername;
    }
});

sendChatMessageBtn.addEventListener('click', () => {
    sendMessage();
});

chatMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function sendMessage() {
    const username = chatUsernameInput.value.trim();
    const messageText = chatMessageInput.value.trim();

    if (!username) {
        alert('Por favor, digite seu nome.');
        return;
    }
    if (!messageText) {
        alert('Por favor, digite uma mensagem.');
        return;
    }

    localStorage.setItem('chatUsername', username);

    messagesRef.push({
        user: username,
        text: messageText,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        userColor: localStorage.getItem('chatUserColor') || (function() {
            const color = getRandomColor();
            localStorage.setItem('chatUserColor', color);
            return color;
        })()
    }).then(() => {
        chatMessageInput.value = '';
    }).catch(error => {
        console.error("Erro ao enviar mensagem:", error);
        alert("Erro ao enviar mensagem. Tente novamente.");
    });
}

messagesRef.orderByChild('timestamp').limitToLast(50).on('child_added', (snapshot) => {
    const message = snapshot.val();
    const messageId = snapshot.key; // Obtenha o ID da mensagem
    messageCache.set(messageId, message); // NOVO: Armazena a mensagem no cache

    const { dateString, timeString } = formatTimestamp(message.timestamp);

    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.dataset.messageId = messageId; // Armazena o ID da mensagem no elemento HTML

    const filteredMessageText = filterMessage(message.text);

    messageElement.innerHTML = `
        <span class="message-user" style="color: ${message.userColor || '#FFD700'};">${message.user}</span>
        <span class="message-time">(${dateString} ${timeString})</span>
        <p class="message-text">${filteredMessageText}</p>
    `;
    chatMessagesDiv.prepend(messageElement);
});

// NOVO: Lógica para lidar com mensagens removidas
messagesRef.on('child_removed', (snapshot) => {
    const removedMessageId = snapshot.key;
    const removedMessageData = messageCache.get(removedMessageId); // Tenta obter os dados do cache
    const messageElement = chatMessagesDiv.querySelector(`[data-message-id="${removedMessageId}"]`);

    if (messageElement && removedMessageData) { // Verifica se encontrou o elemento e os dados no cache
        // Altera o conteúdo da mensagem para "Mensagem apagada pelo host"
        messageElement.innerHTML = `
            <span class="message-user" style="color: ${removedMessageData.userColor || '#FFD700'};">${removedMessageData.user}</span>
            <p class="message-text deleted-message-text"><i>*mensagem apagada pelo host*</i></p>
        `;
        messageElement.classList.add('deleted-message'); // Adiciona uma classe para estilização
        // Remove informações do timestamp se existirem, pois não são relevantes para mensagem apagada
        const timeSpan = messageElement.querySelector('.message-time');
        if (timeSpan) timeSpan.remove();

        messageCache.delete(removedMessageId); // Remove a mensagem do cache após o processamento
    } else if (messageElement) {
        // Fallback caso a mensagem não esteja no cache (menos provável se o cache estiver funcionando)
        messageElement.innerHTML = `
            <p class="message-text deleted-message-text"><i>*mensagem apagada pelo host*</i></p>
        `;
        messageElement.classList.add('deleted-message');
        const userSpan = messageElement.querySelector('.message-user');
        const timeSpan = messageElement.querySelector('.message-time');
        if (userSpan) userSpan.remove();
        if (timeSpan) timeSpan.remove();
    }
});


// --- Lógica de Notificações ---
notificationsRef.limitToLast(1).on('child_added', (snapshot) => {
    const notification = snapshot.val();
    notificationText.textContent = notification.message;

    notificationOverlay.className = 'notification-overlay';
    notificationOverlay.classList.add(notification.type || 'info');

    notificationOverlay.classList.add('show');

    const duration = notification.duration || 8000;
    setTimeout(() => {
        notificationOverlay.classList.remove('show');
    }, duration);
});


// --- Lógica da Agenda (Atualizada com destaque) ---
let allAgendaItems = [];
agendaRef.orderByChild('order').on('value', (snapshot) => {
    allAgendaItems = [];
    if (!snapshot.exists()) {
        agendaListDiv.innerHTML = '<p class="loading-message">Nenhum segmento de agenda definido.</p>';
        return;
    }

    snapshot.forEach((childSnapshot) => {
        const item = { id: childSnapshot.key, ...childSnapshot.val() };
        allAgendaItems.push(item);
    });

    allAgendaItems.sort((a, b) => a.order - b.order);

    renderAgendaList();
});

agendaRef.child('current_segment_id').on('value', (snapshot) => {
    currentAgendaItemId = snapshot.val();
    renderAgendaList();
});


function renderAgendaList() {
    agendaListDiv.innerHTML = '';
    if (allAgendaItems.length === 0) {
        agendaListDiv.innerHTML = '<p class="loading-message">Nenhum segmento de agenda definido.</p>';
        return;
    }

    allAgendaItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.classList.add('agenda-item');

        if (currentAgendaItemId && item.id === currentAgendaItemId) {
            itemElement.classList.add('current');
            itemElement.innerHTML = `
                <strong><i class="fas fa-play-circle"></i> AGORA: ${item.time} - ${item.title}</strong>
                <p>${item.description}</p>
            `;
        } else {
            itemElement.innerHTML = `
                <strong>${item.time} - ${item.title}</strong>
                <p>${item.description}</p>
            `;
        }
        agendaListDiv.appendChild(itemElement);
    });
}


// --- Lógica de Textos no Player ---
playerTextsRef.orderByChild('order').on('value', (snapshot) => {
    playerOverlayTextsContainer.innerHTML = '';
    if (!snapshot.exists()) {
        playerOverlayTextsContainer.innerHTML = '';
        return;
    }

    const activeTexts = [];
    snapshot.forEach((childSnapshot) => {
        const textData = childSnapshot.val();
        if (textData.active) {
            activeTexts.push(textData);
        }
    });

    activeTexts.sort((a, b) => a.order - b.order);

    activeTexts.forEach(textData => {
        const textElement = document.createElement('div');
        textElement.classList.add('player-text-item');

        if (textData.link && textData.link.trim() !== '') {
            const linkElement = document.createElement('a');
            linkElement.href = textData.link;
            linkElement.textContent = textData.content;
            linkElement.target = "_blank";
            linkElement.rel = "noopener noreferrer";
            linkElement.classList.add('player-text-link');
            textElement.appendChild(linkElement);
        } else {
            textElement.textContent = textData.content;
        }

        if (textData.color) {
            textElement.style.color = textData.color;
        }
        playerOverlayTextsContainer.appendChild(textElement);
    });
});


// --- Lógica de Estado da Live ---
liveStatusRef.on('value', (snapshot) => {
    const isLive = snapshot.val();
    if (isLive) {
        liveOfflineMessage.classList.add('hidden');
        videoPlayerDiv.classList.remove('hidden');
    } else {
        liveOfflineMessage.classList.remove('hidden');
        videoPlayerDiv.classList.add('hidden');
    }
});


// --- Lógica de Filtragem de Chat ---
forbiddenWordsRef.on('value', (snapshot) => {
    forbiddenWords = snapshot.val() || [];
    console.log("Palavras proibidas atualizadas:", forbiddenWords);
});


// --- Lógica das Reações (Mantida para contagem, mas invisível) ---

// Ouve as mudanças nas contagens de reações no Firebase
reactionsRef.on('value', (snapshot) => {
    const reactionsData = snapshot.val() || {};
    reactionCounts.like = reactionsData.like || 0;
    reactionCounts.heart = reactionsData.heart || 0;
    reactionCounts.laugh = reactionsData.laugh || 0;
    reactionCounts.sad = reactionsData.sad || 0;
    reactionCounts.clap = reactionsData.clap || 0;

    // Embora os spans não estejam visíveis, podemos atualizá-los para fins de depuração
    // ou se forem consumidos por outra parte do sistema.
    if (likeCountSpan) likeCountSpan.textContent = reactionCounts.like;
    if (heartCountSpan) heartCountSpan.textContent = reactionCounts.heart;
    if (laughCountSpan) laughCountSpan.textContent = reactionCounts.laugh;
    if (sadCountSpan) sadCountSpan.textContent = reactionCounts.sad;
    if (clapCountSpan) clapCountSpan.textContent = reactionCounts.clap;
});

// Adiciona event listeners para os botões de reação (ainda funcionarão para incrementar no Firebase)
reactionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const reactionType = e.currentTarget.dataset.reaction;
        if (reactionType) {
            reactionsRef.child(reactionType).transaction((currentCount) => {
                return (currentCount || 0) + 1;
            }, (error, committed, snapshot) => {
                if (error) {
                    console.error(`Erro ao adicionar reação ${reactionType}:`, error);
                } else if (committed) {
                    console.log(`Reação '${reactionType}' registrada (invisivelmente)!`);
                    // Não chamamos createFloatingReaction aqui, pois o efeito é invisível.
                }
            });
        }
    });
});

// A função createFloatingReaction é mantida, mas não será chamada em nenhum lugar
// visível, a menos que você a reative.
function createFloatingReaction(type, buttonElement) {
    const iconData = reactionIcons[type];
    if (!iconData) return;

    const floatingReaction = document.createElement('i');
    floatingReaction.className = `${iconData.icon} floating-reaction`;
    floatingReaction.style.color = iconData.color;

    // Estes cálculos ainda funcionam, mas o elemento está fora da tela
    const buttonRect = buttonElement.getBoundingClientRect();
    const containerRect = reactionBurstContainer.getBoundingClientRect();

    floatingReaction.style.left = `${buttonRect.left - containerRect.left + buttonRect.width / 2}px`;
    floatingReaction.style.top = `${buttonRect.top - containerRect.top + buttonRect.height / 2}px`;

    const randX = (Math.random() - 0.5) * 60;
    floatingReaction.style.setProperty('--rand-x', randX);

    reactionBurstContainer.appendChild(floatingReaction);

    floatingReaction.addEventListener('animationend', () => {
        floatingReaction.remove();
    });
}