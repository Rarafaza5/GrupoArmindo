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

// --- Referências do Database ---
const notificationsRef = database.ref('notifications');
const agendaRef = database.ref('agenda');
const playerTextsRef = database.ref('player_texts');
const liveStatusRef = database.ref('live_status');
const forbiddenWordsRef = database.ref('forbidden_words'); // NOVA REFERÊNCIA
const chatMessagesRef = database.ref('chat_messages'); // NOVA REFERÊNCIA PARA CHAT ADMIN

// --- Elementos HTML para Notificações ---
const notificationMessageInput = document.getElementById('notification-message');
const notificationTypeSelect = document.getElementById('notification-type');
const notificationDurationInput = document.getElementById('notification-duration');
const sendNotificationBtn = document.getElementById('send-notification-btn');

// --- Elementos HTML para Agenda ---
const agendaTitleInput = document.getElementById('agenda-title');
const agendaDescriptionInput = document.getElementById('agenda-description');
const addAgendaBtn = document.getElementById('add-agenda-btn');
const agendaList = document.getElementById('agenda-list');

// --- Elementos HTML para Textos do Player ---
const playerTextContentInput = document.getElementById('player-text-content');
const playerTextLinkInput = document.getElementById('player-text-link');
const addPlayerTextBtn = document.getElementById('add-player-text-btn');
const playerTextList = document.getElementById('player-text-list');

// --- Elementos HTML para Palavras Proibidas ---
const forbiddenWordsTextarea = document.getElementById('forbidden-words');
const saveForbiddenWordsBtn = document.getElementById('save-forbidden-words-btn');

// --- Elementos HTML para Status da Live ---
const liveStatusToggle = document.getElementById('live-status-toggle');

// --- Elementos HTML para o Chat Admin (NOVOS) ---
const adminChatMessagesDiv = document.getElementById('admin-chat-messages');


// --- Funções de Notificações ---
sendNotificationBtn.addEventListener('click', () => {
    const message = notificationMessageInput.value.trim();
    const type = notificationTypeSelect.value;
    const duration = parseInt(notificationDurationInput.value, 10);

    if (message && duration > 0) {
        notificationsRef.push({
            message: message,
            type: type,
            duration: duration,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            alert('Notificação enviada com sucesso!');
            notificationMessageInput.value = '';
            notificationDurationInput.value = '5';
        }).catch(error => {
            console.error('Erro ao enviar notificação:', error);
            alert('Erro ao enviar notificação.');
        });
    } else {
        alert('Por favor, preencha a mensagem e defina uma duração válida.');
    }
});

// --- Funções de Agenda ---
addAgendaBtn.addEventListener('click', () => {
    const title = agendaTitleInput.value.trim();
    const description = agendaDescriptionInput.value.trim();

    if (title) {
        agendaRef.push({
            title: title,
            description: description,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            alert('Item da agenda adicionado com sucesso!');
            agendaTitleInput.value = '';
            agendaDescriptionInput.value = '';
        }).catch(error => {
            console.error('Erro ao adicionar item da agenda:', error);
            alert('Erro ao adicionar item da agenda.');
        });
    } else {
        alert('Por favor, preencha o título do item da agenda.');
    }
});

// Carrega e exibe a agenda
agendaRef.on('value', (snapshot) => {
    agendaList.innerHTML = ''; // Limpa a lista existente
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            const itemId = childSnapshot.key;
            const li = document.createElement('li');
            li.innerHTML = `
                <span><strong>${item.title}</strong> - ${item.description}</span>
                <button class="remove-btn" data-id="${itemId}"><i class="fas fa-trash-alt"></i> Remover</button>
            `;
            agendaList.appendChild(li);

            // Adiciona evento de clique para remover
            li.querySelector('.remove-btn').addEventListener('click', (e) => {
                const idToRemove = e.currentTarget.dataset.id;
                if (confirm('Tem certeza que deseja remover este item da agenda?')) {
                    agendaRef.child(idToRemove).remove()
                        .then(() => {
                            console.log('Item da agenda removido com sucesso!');
                        })
                        .catch(error => {
                            console.error('Erro ao remover item da agenda:', error);
                            alert('Erro ao remover item da agenda.');
                        });
                }
            });
        });
    } else {
        agendaList.innerHTML = '<li class="loading-message">Nenhum item na agenda.</li>';
    }
});

// --- Funções de Textos do Player ---
addPlayerTextBtn.addEventListener('click', () => {
    const content = playerTextContentInput.value.trim();
    const link = playerTextLinkInput.value.trim();

    if (content) {
        playerTextsRef.push({
            content: content,
            link: link || null, // Armazena null se o link estiver vazio
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            alert('Texto do player adicionado com sucesso!');
            playerTextContentInput.value = '';
            playerTextLinkInput.value = '';
        }).catch(error => {
            console.error('Erro ao adicionar texto do player:', error);
            alert('Erro ao adicionar texto do player.');
        });
    } else {
        alert('Por favor, preencha o conteúdo do texto do player.');
    }
});

// Carrega e exibe os textos do player
playerTextsRef.on('value', (snapshot) => {
    playerTextList.innerHTML = ''; // Limpa a lista existente
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const item = childSnapshot.val();
            const itemId = childSnapshot.key;
            const li = document.createElement('li');
            const linkText = item.link ? `<a href="${item.link}" target="_blank" style="color: var(--color-gold-light); text-decoration: underline;">(Link)</a>` : '';
            li.innerHTML = `
                <span><strong>${item.content}</strong> ${linkText}</span>
                <button class="remove-btn" data-id="${itemId}"><i class="fas fa-trash-alt"></i> Remover</button>
            `;
            playerTextList.appendChild(li);

            // Adiciona evento de clique para remover
            li.querySelector('.remove-btn').addEventListener('click', (e) => {
                const idToRemove = e.currentTarget.dataset.id;
                if (confirm('Tem certeza que deseja remover este texto do player?')) {
                    playerTextsRef.child(idToRemove).remove()
                        .then(() => {
                            console.log('Texto do player removido com sucesso!');
                        })
                        .catch(error => {
                            console.error('Erro ao remover texto do player:', error);
                            alert('Erro ao remover texto do player.');
                        });
                }
            });
        });
    } else {
        playerTextList.innerHTML = '<li class="loading-message">Nenhum texto no player.</li>';
    }
});


// --- Funções de Status da Live ---
// Carrega o estado inicial da live do Firebase
liveStatusRef.on('value', (snapshot) => {
    const isLive = snapshot.val();
    liveStatusToggle.checked = isLive;
});

// Atualiza o estado da live no Firebase quando o toggle é alterado
liveStatusToggle.addEventListener('change', () => {
    liveStatusRef.set(liveStatusToggle.checked)
        .then(() => {
            alert(`Status da live atualizado para: ${liveStatusToggle.checked ? 'Online' : 'Offline'}`);
        })
        .catch(error => {
            console.error('Erro ao atualizar status da live:', error);
            alert('Erro ao atualizar status da live.');
        });
});

// --- Funções de Filtragem de Chat (Palavras Proibidas) ---
// Carrega as palavras proibidas do Firebase ao iniciar a página
forbiddenWordsRef.on('value', (snapshot) => {
    const words = snapshot.val();
    if (words) {
        forbiddenWordsTextarea.value = words.join(', ');
    } else {
        forbiddenWordsTextarea.value = '';
    }
});

// Salva as palavras proibidas no Firebase
saveForbiddenWordsBtn.addEventListener('click', () => {
    const wordsInput = forbiddenWordsTextarea.value.trim();
    // Divide por vírgula, remove espaços extras e filtra strings vazias
    const wordsArray = wordsInput.split(',').map(word => word.trim()).filter(word => word.length > 0);

    forbiddenWordsRef.set(wordsArray)
        .then(() => {
            alert('Lista de palavras proibidas salva com sucesso!');
        })
        .catch(error => {
            console.error('Erro ao salvar lista de palavras proibidas:', error);
            alert('Erro ao salvar lista de palavras proibidas.');
        });
});

// --- NOVO: Funções do Chat de Moderação ---

// Função para formatar o timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Carrega e exibe mensagens do chat para moderação
chatMessagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    const messageId = snapshot.key;

    const messageElement = document.createElement('div');
    messageElement.classList.add('admin-chat-message');
    messageElement.dataset.id = messageId; // Guarda o ID para remoção

    messageElement.innerHTML = `
        <div class="admin-message-content">
            <span class="admin-message-user" style="color: ${stringToHslColor(message.user)};">${message.user}:</span>
            <span class="admin-message-text">${message.text}</span>
            <span class="admin-message-time">${formatTimestamp(message.timestamp)}</span>
        </div>
        <button class="admin-message-remove-btn" data-id="${messageId}">
            <i class="fas fa-times"></i> Remover
        </button>
    `;

    // Adiciona evento para remover mensagem
    messageElement.querySelector('.admin-message-remove-btn').addEventListener('click', (e) => {
        const idToRemove = e.currentTarget.dataset.id;
        if (confirm('Tem certeza que deseja remover esta mensagem?')) {
            chatMessagesRef.child(idToRemove).remove()
                .then(() => {
                    console.log('Mensagem removida com sucesso:', idToRemove);
                })
                .catch(error => {
                    console.error('Erro ao remover mensagem:', error);
                    alert('Erro ao remover mensagem.');
                });
        }
    });

    // Insere a nova mensagem no topo da lista (devido a column-reverse no CSS)
    adminChatMessagesDiv.prepend(messageElement);

    // Remove a mensagem de carregamento se presente
    const loadingMessage = adminChatMessagesDiv.querySelector('.loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }
});

// Monitora mensagens que são removidas (para atualizar a UI do admin)
chatMessagesRef.on('child_removed', (snapshot) => {
    const removedMessageId = snapshot.key;
    const messageElement = adminChatMessagesDiv.querySelector(`[data-id="${removedMessageId}"]`);
    if (messageElement) {
        messageElement.remove();
        console.log('Mensagem removida da UI do admin:', removedMessageId);
    }
    // Se não houver mais mensagens, exibe a mensagem de carregamento novamente
    if (adminChatMessagesDiv.children.length === 0) {
        adminChatMessagesDiv.innerHTML = '<p class="loading-message">Nenhuma mensagem no chat.</p>';
    }
});

// Helper para gerar uma cor HSL a partir de uma string (para nomes de usuário)
function stringToHslColor(str, s = 50, l = 70) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Adicional: Funções para melhorar a experiência do streamer (Sugestões futuras)
// - Mute/Unmute de usuários (requer Firebase Security Rules mais complexas e estrutura de usuários)
// - Notificações mais interativas (com links clicáveis no player, já implementado basicamente com player_texts)
// - Sistema de alertas de doação/bits (integração com plataformas como Twitch/YouTube APIs, fora do escopo do Firebase apenas)