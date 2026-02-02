// ============================================
// © 2026 Grupo Armindo. Todos os direitos reservados.
// ============================================
// FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyA8azNy6GEgD190y_fW91ahUbKa1w5veik",
    authDomain: "aawards.firebaseapp.com",
    databaseURL: "https://aawards-default-rtdb.firebaseio.com",
    projectId: "aawards",
    storageBucket: "aawards.firebasestorage.app",
    messagingSenderId: "839334918366",
    appId: "1:839334918366:web:454a259fa3e2665b46ea4f",
    measurementId: "G-NLLMB9THVX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentAdmin = null;
let allPlayers = [];
let statsListener = null;
let gameSettings = { timeSpeed: 1 };
let settingsListener = null;
let serverTimeOffset = 0;
let playersListener = null;

// ============================================
// CONSTANTS (Shared with game.js)
// ============================================
const EDUCATION = {
    none: { label: 'Nenhuma' },
    elementary: { label: 'Ensino Básico (1º-9º)' },
    middle: { label: 'Ensino Preparatório' },
    high: { label: 'Ensino Secundário' },
    bachelor: { label: 'Licenciatura' },
    master: { label: 'Mestrado' },
    phd: { label: 'Doutoramento' }
};

const CAREERS = {
    unemployed: { label: 'Desempregado' },
    cashier: { label: 'Operador de Caixa' },
    waiter: { label: 'Empregado de Mesa' },
    delivery: { label: 'Estafeta (TVDE/Food)' },
    receptionist: { label: 'Rececionista' },
    salesperson: { label: 'Vendedor' },
    mechanic: { label: 'Mecânico Auto' },
    electrician: { label: 'Eletricista' },
    freelancer: { label: 'Freelancer Digital' },
    content_creator: { label: 'Criador de Conteúdo' },
    teacher: { label: 'Professor QP' },
    nurse: { label: 'Enfermeiro' },
    programmer: { label: 'Programador Júnior' },
    accountant: { label: 'Contabilista' },
    engineer: { label: 'Engenheiro Civil' },
    architect: { label: 'Arquiteto' },
    lawyer: { label: 'Advogado Especialista' },
    doctor: { label: 'Médico Especialista' },
    scientist: { label: 'Investigador PhD' },
    executive: { label: 'Gestor de Topo' },
    ceo: { label: 'Diretor Geral' },
    entrepreneur: { label: 'Proprietário de PME' },
    artist: { label: 'Artista Freelance' },
    musician: { label: 'Músico Profissional' },
    athlete: { label: 'Atleta de Elite' }
};

const UNIVERSITY_COURSES = {
    medicine: { label: 'Medicina', duration: 6 },
    engineering: { label: 'Engenharia', duration: 5 },
    it: { label: 'Informática', duration: 3 },
    architecture: { label: 'Arquitetura', duration: 5 },
    design: { label: 'Design', duration: 3 },
    law: { label: 'Direito', duration: 5 },
    teaching: { label: 'Ensino', duration: 4 },
    business: { label: 'Gestão/Economia', duration: 3 },
    accounting: { label: 'Contabilidade', duration: 3 }
};

const ACHIEVEMENTS = {
    first_job: { label: 'Primeiro Emprego' },
    millionaire: { label: 'Milionário' },
    billionaire: { label: 'Bilionário' },
    graduated: { label: 'Licenciado' },
    doctorate: { label: 'Doutorado' },
    homeowner: { label: 'Proprietário' },
    skill_master: { label: 'Mestre de Habilidade' }
};

// ============================================
// AUTHENTICATION
// ============================================
auth.onAuthStateChanged(async user => {
    if (user) {
        currentAdmin = user;
        showAdminPanel();
        loadDashboard();
        await loadGameSettings();
        syncServerTime();
    } else {
        showLoginScreen();
    }
});

function showLoginScreen() {
    document.getElementById('adminLogin').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('adminUser').textContent = currentAdmin.email;
}

async function adminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }

    showLoading('Autenticando...');
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showNotification('Bem-vindo, Admin!', 'success');
    } catch (error) {
        hideLoading();
        showNotification('Credenciais inválidas', 'error');
    }
}

async function adminLogout() {
    if (confirm('Sair do painel de administração?')) {
        await auth.signOut();
    }
}

// ============================================
// DASHBOARD & STATS
// ============================================
async function loadDashboard() {
    if (playersListener) playersListener();

    playersListener = db.collection('characters')
        .onSnapshot(snapshot => {
            allPlayers = [];
            snapshot.forEach(doc => {
                allPlayers.push({ id: doc.id, ...doc.data() });
            });

            // Update UI components if they are visible
            updateOverviewStats();
            loadRecentActivity();

            // If we are in the players section, refresh it
            const dashboardContent = document.getElementById('dashboardContent');
            if (dashboardContent && dashboardContent.contains(document.getElementById('playersTable'))) {
                loadPlayersSection();
            }
        }, error => {
            console.error('Error loading players:', error);
            showNotification('Erro ao sincronizar dados', 'error');
        });
}

function updateOverviewStats() {
    const alive = allPlayers.filter(p => p.alive).length;
    const dead = allPlayers.filter(p => !p.alive).length;
    const totalMoney = allPlayers.reduce((sum, p) => sum + (p.money || 0), 0);
    const couples = allPlayers.filter(p => p.maritalStatus === 'married').length / 2;

    // Count families (players with parents or children)
    const families = new Set();
    allPlayers.forEach(p => {
        if (p.family) {
            if (p.family.parents?.length > 0) {
                families.add(p.family.parents.sort().join('-'));
            }
            if (p.family.children?.length > 0) {
                families.add([p.id, p.family.spouse].sort().join('-'));
            }
        }
    });

    document.getElementById('totalPlayers').textContent = allPlayers.length;
    document.getElementById('alivePlayers').textContent = alive;
    document.getElementById('deadPlayers').textContent = dead;
    document.getElementById('totalMoney').textContent = `€${totalMoney.toLocaleString()}`;
    document.getElementById('totalFamilies').textContent = families.size;
    document.getElementById('totalCouples').textContent = Math.floor(couples);
}

async function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    container.innerHTML = '';

    try {
        const snapshot = await db.collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.5)">Nenhuma atividade recente</p>';
            return;
        }

        snapshot.forEach(doc => {
            const activity = doc.data();
            const item = document.createElement('div');
            item.style.cssText = 'padding: 1rem; border-left: 3px solid var(--gold); background: rgba(255,255,255,0.02); margin-bottom: 0.5rem;';

            const time = activity.timestamp?.toDate();
            const timeStr = time ? time.toLocaleString('pt-PT') : 'Agora';

            item.innerHTML = `
                <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5); margin-bottom: 0.3rem;">${timeStr}</div>
                <div>${activity.text}</div>
            `;

            container.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading activities:', error);
        container.innerHTML = '<p style="color: var(--danger)">Erro ao carregar atividades</p>';
    }
}

// ============================================
// PLAYERS MANAGEMENT
// ============================================
async function loadPlayersSection() {
    const table = document.getElementById('playersTable');
    table.innerHTML = '';

    if (allPlayers.length === 0) {
        await loadDashboard();
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Idade</th>
                    <th>Status</th>
                    <th>Dinheiro</th>
                    <th>Ocupação</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${allPlayers.map(player => `
                    <tr>
                        <td>${player.name}</td>
                        <td>${player.age || 0} anos</td>
                        <td>${player.alive ? '💚 Vivo' : '💀 Morto'}</td>
                        <td>€${(player.money || 0).toLocaleString()}</td>
                        <td>${player.occupation || 'Nenhuma'}</td>
                        <td>
                            <button class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="editPlayer('${player.id}')">Editar</button>
                            <button class="btn btn-danger" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="deletePlayerConfirm('${player.id}')">Deletar</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    table.innerHTML = tableHTML;
}

async function editPlayer(playerId) {
    showLoading('Buscando dados...');
    try {
        const doc = await db.collection('characters').doc(playerId).get();
        if (!doc.exists) {
            hideLoading();
            showNotification('Jogador não encontrado', 'error');
            return;
        }

        const player = { id: doc.id, ...doc.data() };
        // Update local cache
        const idx = allPlayers.findIndex(p => p.id === playerId);
        if (idx !== -1) allPlayers[idx] = player;
        else allPlayers.push(player);

        hideLoading();

        openModal('Editar Jogador: ' + player.name, `
        <div class="form-group">
            <label class="form-label">Nome</label>
            <input type="text" class="form-input" id="editName" value="${player.name}">
        </div>
        <div class="form-group">
            <label class="form-label">Idade</label>
            <input type="number" class="form-input" id="editAge" value="${player.age || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Dinheiro (€)</label>
            <input type="number" class="form-input" id="editMoney" value="${player.money || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Saúde (0-100)</label>
            <input type="number" class="form-input" id="editHealth" min="0" max="100" value="${player.health || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Felicidade (0-100)</label>
            <input type="number" class="form-input" id="editHappiness" min="0" max="100" value="${player.happiness || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Inteligência (0-100)</label>
            <input type="number" class="form-input" id="editIntelligence" min="0" max="100" value="${player.intelligence || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Gênero</label>
            <select class="form-input" id="editGender">
                <option value="male" ${player.gender === 'male' ? 'selected' : ''}>Masculino</option>
                <option value="female" ${player.gender === 'female' ? 'selected' : ''}>Feminino</option>
                <option value="non-binary" ${player.gender === 'non-binary' ? 'selected' : ''}>Não-binário</option>
                <option value="other" ${player.gender === 'other' ? 'selected' : ''}>Outro</option>
            </select>
        </div>
        <div class="form-group" style="grid-column: span 2;">
            <label class="form-label">Ocupação</label>
            <select class="form-input" id="editOccupation">
                ${Object.keys(CAREERS).map(k => `<option value="${k}" ${player.occupation === k ? 'selected' : ''}>${CAREERS[k].label}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Fitness (0-100)</label>
            <input type="number" class="form-input" id="editFitness" min="0" max="100" value="${player.fitness || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Social (0-100)</label>
            <input type="number" class="form-input" id="editSocial" min="0" max="100" value="${player.social || 0}">
        </div>
        <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-input" id="editAlive">
                <option value="true" ${player.alive ? 'selected' : ''}>Vivo</option>
                <option value="false" ${!player.alive ? 'selected' : ''}>Morto</option>
            </select>
        </div>
    `, [
            { text: 'Salvar', class: 'btn btn-primary', onclick: `savePlayerEdit('${playerId}')` },
            { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
        ]);
    } catch (e) {
        hideLoading();
        console.error(e);
        showNotification('Erro ao carregar dados', 'error');
    }
}

async function savePlayerEdit(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    const name = document.getElementById('editName').value;
    const age = parseInt(document.getElementById('editAge').value);
    const money = parseInt(document.getElementById('editMoney').value);
    const health = parseInt(document.getElementById('editHealth').value);
    const happiness = parseInt(document.getElementById('editHappiness').value);
    const intelligence = parseInt(document.getElementById('editIntelligence').value);
    const alive = document.getElementById('editAlive').value === 'true';

    const fitness = parseInt(document.getElementById('editFitness').value);
    const social = parseInt(document.getElementById('editSocial').value);
    const gender = document.getElementById('editGender').value;
    const occupation = document.getElementById('editOccupation').value;

    showLoading('Salvando...');

    try {
        const updates = {
            name,
            age,
            money,
            health,
            happiness,
            intelligence,
            fitness,
            social,
            gender,
            occupation,
            alive,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Ajustar birthDate se a idade mudou
        if (age !== player.age) {
            const now = new Date(Date.now() + serverTimeOffset);
            const yearInMs = (1000 * 60 * 60 * 24) / (gameSettings.timeSpeed || 1);
            // Buffer de 5% do ano para garantir que o Math.floor resulte na idade correta
            const offsetMs = (age * yearInMs) + (yearInMs * 0.05);
            const newBirthDate = new Date(now.getTime() - offsetMs);
            updates.birthDate = newBirthDate.toISOString();
        }

        await db.collection('characters').doc(playerId).update(updates);

        closeModal();
        hideLoading();
        showNotification('Jogador atualizado!', 'success');
        await loadDashboard();
        loadPlayersSection();
    } catch (error) {
        hideLoading();
        console.error('Error saving:', error);
        showNotification('Erro ao salvar', 'error');
    }
}

async function deletePlayerConfirm(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    if (confirm(`ATENÇÃO: Deletar permanentemente ${player.name}? Esta ação não pode ser desfeita!`)) {
        showLoading('Deletando...');

        try {
            // Delete character
            await db.collection('characters').doc(playerId).delete();

            // Delete activities
            const activities = await db.collection('activities')
                .where('characterId', '==', playerId)
                .get();

            const batch = db.batch();
            activities.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            hideLoading();
            showNotification('Jogador deletado', 'success');
            await loadDashboard();
            loadPlayersSection();
        } catch (error) {
            hideLoading();
            console.error('Error deleting:', error);
            showNotification('Erro ao deletar', 'error');
        }
    }
}

// ============================================
// FAMILIES MANAGEMENT
// ============================================
function loadFamiliesSection() {
    const container = document.getElementById('familiesList');
    container.innerHTML = '';

    // Group players by families
    const families = new Map();

    allPlayers.forEach(player => {
        if (!player.family) return;

        // Check if player has parents
        if (player.family.parents && player.family.parents.length > 0) {
            const familyKey = player.family.parents.sort().join('-');
            if (!families.has(familyKey)) {
                families.set(familyKey, {
                    parents: player.family.parents,
                    children: []
                });
            }
            families.get(familyKey).children.push(player.id);
        }
    });

    if (families.size === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center;">Nenhuma família registrada</p>';
        return;
    }

    families.forEach((family, key) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: rgba(255,255,255,0.03); border: 2px solid var(--border); padding: 1.5rem; margin-bottom: 1rem;';

        const parents = family.parents.map(id => {
            const p = allPlayers.find(pl => pl.id === id);
            return p ? p.name : 'Desconhecido';
        }).join(' & ');

        const children = family.children.map(id => {
            const c = allPlayers.find(pl => pl.id === id);
            return c ? c.name : 'Desconhecido';
        }).join(', ');

        card.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: var(--gold);">Família ${parents}</h3>
            <p><strong>Pais:</strong> ${parents}</p>
            <p><strong>Filhos:</strong> ${children}</p>
            <button class="btn btn-danger" style="margin-top: 1rem; padding: 0.5rem 1rem;" onclick="unlinkFamily('${key}')">Desvincular Família</button>
        `;

        container.appendChild(card);
    });
}

async function createFamily() {
    const alivePlayers = allPlayers.filter(p => p.alive);

    if (alivePlayers.length < 2) {
        showNotification('Precisa de pelo menos 2 jogadores vivos', 'error');
        return;
    }

    openModal('Criar Nova Família', `
        <div class="form-group">
            <label class="form-label">Pai/Mãe 1</label>
            <select class="form-input" id="parent1">
                <option value="">Selecione...</option>
                ${alivePlayers.map(p => `<option value="${p.id}">${p.name} (${p.age} anos)</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Pai/Mãe 2 (opcional)</label>
            <select class="form-input" id="parent2">
                <option value="">Selecione...</option>
                ${alivePlayers.map(p => `<option value="${p.id}">${p.name} (${p.age} anos)</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Filhos</label>
            <select class="form-input" id="children" multiple size="5">
                ${alivePlayers.map(p => `<option value="${p.id}">${p.name} (${p.age} anos)</option>`).join('')}
            </select>
            <small style="color: rgba(255,255,255,0.6);">Segure Ctrl para selecionar múltiplos</small>
        </div>
    `, [
        { text: 'Criar Família', class: 'btn btn-primary', onclick: 'saveFamilyCreation()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function saveFamilyCreation() {
    const parent1 = document.getElementById('parent1').value;
    const parent2 = document.getElementById('parent2').value;
    const childrenSelect = document.getElementById('children');
    const children = Array.from(childrenSelect.selectedOptions).map(opt => opt.value);

    if (!parent1) {
        showNotification('Selecione pelo menos 1 pai/mãe', 'error');
        return;
    }

    if (children.length === 0) {
        showNotification('Selecione pelo menos 1 filho', 'error');
        return;
    }

    showLoading('Criando família...');

    try {
        const parents = [parent1, parent2].filter(Boolean);

        // Update parents
        for (const parentId of parents) {
            await db.collection('characters').doc(parentId).update({
                'family.children': firebase.firestore.FieldValue.arrayUnion(...children)
            });
        }

        // Update children
        for (const childId of children) {
            await db.collection('characters').doc(childId).update({
                'family.parents': parents
            });
        }

        closeModal();
        hideLoading();
        showNotification('Família criada!', 'success');
        await loadDashboard();
        loadFamiliesSection();
    } catch (error) {
        hideLoading();
        console.error('Error creating family:', error);
        showNotification('Erro ao criar família', 'error');
    }
}

async function linkPlayers() {
    const alivePlayers = allPlayers.filter(p => p.alive);

    openModal('Linkar Jogadores', `
        <div class="form-group">
            <label class="form-label">Tipo de Relacionamento</label>
            <select class="form-input" id="linkType">
                <option value="parent-child">Pai/Mãe - Filho</option>
                <option value="siblings">Irmãos</option>
                <option value="spouse">Casal (Casamento)</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Jogador 1</label>
            <select class="form-input" id="linkPlayer1">
                <option value="">Selecione...</option>
                ${alivePlayers.map(p => `<option value="${p.id}">${p.name} (${p.age} anos)</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Jogador 2</label>
            <select class="form-input" id="linkPlayer2">
                <option value="">Selecione...</option>
                ${alivePlayers.map(p => `<option value="${p.id}">${p.name} (${p.age} anos)</option>`).join('')}
            </select>
        </div>
    `, [
        { text: 'Linkar', class: 'btn btn-primary', onclick: 'saveLinkPlayers()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function saveLinkPlayers() {
    const type = document.getElementById('linkType').value;
    const player1Id = document.getElementById('linkPlayer1').value;
    const player2Id = document.getElementById('linkPlayer2').value;

    if (!player1Id || !player2Id) {
        showNotification('Selecione ambos os jogadores', 'error');
        return;
    }

    if (player1Id === player2Id) {
        showNotification('Selecione jogadores diferentes', 'error');
        return;
    }

    showLoading('Linkando...');

    try {
        if (type === 'parent-child') {
            await db.collection('characters').doc(player1Id).update({
                'family.children': firebase.firestore.FieldValue.arrayUnion(player2Id)
            });
            await db.collection('characters').doc(player2Id).update({
                'family.parents': firebase.firestore.FieldValue.arrayUnion(player1Id)
            });
        } else if (type === 'siblings') {
            await db.collection('characters').doc(player1Id).update({
                'family.siblings': firebase.firestore.FieldValue.arrayUnion(player2Id)
            });
            await db.collection('characters').doc(player2Id).update({
                'family.siblings': firebase.firestore.FieldValue.arrayUnion(player1Id)
            });
        } else if (type === 'spouse') {
            await db.collection('characters').doc(player1Id).update({
                'family.spouse': player2Id,
                maritalStatus: 'married'
            });
            await db.collection('characters').doc(player2Id).update({
                'family.spouse': player1Id,
                maritalStatus: 'married'
            });
        }

        closeModal();
        hideLoading();
        showNotification('Jogadores linkados!', 'success');
        await loadDashboard();
        loadFamiliesSection();
    } catch (error) {
        hideLoading();
        console.error('Error linking:', error);
        showNotification('Erro ao linkar', 'error');
    }
}

async function unlinkFamily(familyKey) {
    if (!confirm('Desvincular esta família?')) return;

    showLoading('Desvinculando...');

    try {
        const family = Array.from(families.values()).find(f =>
            f.parents.sort().join('-') === familyKey
        );

        if (!family) return;

        // Update parents
        for (const parentId of family.parents) {
            await db.collection('characters').doc(parentId).update({
                'family.children': []
            });
        }

        // Update children
        for (const childId of family.children) {
            await db.collection('characters').doc(childId).update({
                'family.parents': []
            });
        }

        hideLoading();
        showNotification('Família desvinculada', 'success');
        await loadDashboard();
        loadFamiliesSection();
    } catch (error) {
        hideLoading();
        console.error('Error unlinking:', error);
        showNotification('Erro ao desvincular', 'error');
    }
}

// ============================================
// ECONOMY MANAGEMENT
// ============================================
async function globalMoneyAdjust() {
    openModal('Ajuste Global de Dinheiro', `
        <div class="form-group">
            <label class="form-label">Tipo de Ajuste</label>
            <select class="form-input" id="adjustType">
                <option value="add">Adicionar Dinheiro</option>
                <option value="multiply">Multiplicar Dinheiro</option>
                <option value="set">Definir Valor Fixo</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Valor</label>
            <input type="number" class="form-input" id="adjustValue" value="0">
        </div>
    `, [
        { text: 'Aplicar', class: 'btn btn-primary', onclick: 'applyGlobalMoneyAdjust()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyGlobalMoneyAdjust() {
    const type = document.getElementById('adjustType').value;
    const value = parseFloat(document.getElementById('adjustValue').value);

    if (!confirm(`Aplicar ajuste de dinheiro a TODOS os ${allPlayers.length} jogadores?`)) {
        return;
    }

    showLoading('Aplicando ajuste...');
    closeModal();

    try {
        const batch = db.batch();

        for (const player of allPlayers) {
            const playerRef = db.collection('characters').doc(player.id);
            let newMoney = player.money || 0;

            if (type === 'add') {
                newMoney += value;
            } else if (type === 'multiply') {
                newMoney *= value;
            } else if (type === 'set') {
                newMoney = value;
            }

            batch.update(playerRef, { money: Math.max(0, newMoney) });
        }

        await batch.commit();

        hideLoading();
        showNotification('Ajuste aplicado a todos os jogadores!', 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro ao aplicar ajuste', 'error');
    }
}

async function giveMoneyToPlayer() {
    openModal('Dar Dinheiro a Jogador', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="moneyPlayer">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name} - €${(p.money || 0).toLocaleString()}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Valor (€)</label>
            <input type="number" class="form-input" id="moneyAmount" value="0">
        </div>
    `, [
        { text: 'Dar Dinheiro', class: 'btn btn-primary', onclick: 'applyGiveMoney()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyGiveMoney() {
    const playerId = document.getElementById('moneyPlayer').value;
    const amount = parseFloat(document.getElementById('moneyAmount').value);

    if (!playerId) {
        showNotification('Selecione um jogador', 'error');
        return;
    }

    showLoading('Transferindo...');
    closeModal();

    try {
        await db.collection('characters').doc(playerId).update({
            money: firebase.firestore.FieldValue.increment(amount)
        });

        hideLoading();
        showNotification(`€${amount} dado ao jogador!`, 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro ao dar dinheiro', 'error');
    }
}

async function resetEconomy() {
    if (!confirm('ATENÇÃO: Resetar a economia de TODOS os jogadores para €500?')) {
        return;
    }

    showLoading('Resetando economia...');

    try {
        const batch = db.batch();

        allPlayers.forEach(player => {
            const ref = db.collection('characters').doc(player.id);
            batch.update(ref, { money: 500 });
        });

        await batch.commit();

        hideLoading();
        showNotification('Economia resetada!', 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro ao resetar economia', 'error');
    }
}

// ============================================
// EVENTS MANAGEMENT
// ============================================
async function triggerGlobalEvent() {
    const type = document.getElementById('eventType').value;
    const desc = document.getElementById('eventDesc').value;
    const impact = parseInt(document.getElementById('eventImpact').value);

    if (!desc) {
        showNotification('Digite uma descrição para o evento', 'error');
        return;
    }

    if (!confirm(`Lançar evento "${desc}" para todos os jogadores?`)) {
        return;
    }

    showLoading('Lançando evento...');

    try {
        const batch = db.batch();

        allPlayers.forEach(player => {
            if (!player.alive) return;

            const ref = db.collection('characters').doc(player.id);
            const updates = {};

            switch (type) {
                case 'positive':
                    updates.happiness = Math.min(100, (player.happiness || 50) + Math.abs(impact));
                    break;
                case 'negative':
                    updates.health = Math.max(0, (player.health || 100) - Math.abs(impact));
                    updates.happiness = Math.max(0, (player.happiness || 50) - Math.abs(impact));
                    break;
                case 'critical':
                    updates.health = Math.max(0, (player.health || 100) - Math.abs(impact) * 2);
                    break;
                case 'economic':
                    updates.money = Math.max(0, (player.money || 0) + impact);
                    break;
                case 'health':
                    updates.health = Math.min(100, (player.health || 100) + impact);
                    break;
            }

            batch.update(ref, updates);

            // Add activity
            db.collection('activities').add({
                characterId: player.id,
                text: `⚡ Evento Global: ${desc}`,
                type: 'critical',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        hideLoading();
        showNotification(`Evento "${desc}" lançado!`, 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro ao lançar evento', 'error');
    }
}

// ============================================
// GOD TOOLS
// ============================================
async function lifeDeathControl() {
    openModal('Controle de Vida/Morte', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="lifDeathPlayer">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name} - ${p.alive ? '💚 Vivo' : '💀 Morto'}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Ação</label>
            <select class="form-input" id="lifeDeathAction">
                <option value="kill">💀 Matar</option>
                <option value="revive">💚 Reviver</option>
            </select>
        </div>
    `, [
        { text: 'Executar', class: 'btn btn-danger', onclick: 'applyLifeDeath()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyLifeDeath() {
    const playerId = document.getElementById('lifeDeathPlayer').value;
    const action = document.getElementById('lifeDeathAction').value;

    if (!playerId) {
        showNotification('Selecione um jogador', 'error');
        return;
    }

    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    if (!confirm(`${action === 'kill' ? 'Matar' : 'Reviver'} ${player.name}?`)) {
        return;
    }

    showLoading('Executando...');
    closeModal();

    try {
        const updates = {
            alive: action === 'revive'
        };

        if (action === 'kill') {
            updates.deathDate = new Date().toISOString();
            updates.health = 0;
        } else {
            updates.health = 100;
            updates.deathDate = null;
        }

        await db.collection('characters').doc(playerId).update(updates);

        await db.collection('activities').add({
            characterId: playerId,
            text: action === 'kill' ? '💀 Foi eliminado pelos deuses' : '💚 Foi ressuscitado pelos deuses!',
            type: 'critical',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        hideLoading();
        showNotification(`${player.name} ${action === 'kill' ? 'eliminado' : 'ressuscitado'}!`, 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro', 'error');
    }
}

async function modifyStats() {
    openModal('Modificar Estatísticas', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="statsPlayer" onchange="loadPlayerStats()">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div id="statsFields"></div>
    `, [
        { text: 'Salvar', class: 'btn btn-primary', onclick: 'applyModifyStats()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function loadPlayerStats() {
    const playerId = document.getElementById('statsPlayer').value;
    if (!playerId) return;

    showLoading('Buscando dados atualizados...');
    try {
        const doc = await db.collection('characters').doc(playerId).get();
        if (!doc.exists) return;

        const player = { id: doc.id, ...doc.data() };
        // Update local cache
        const idx = allPlayers.findIndex(p => p.id === playerId);
        if (idx !== -1) allPlayers[idx] = player;
        else allPlayers.push(player);

        document.getElementById('statsFields').innerHTML = `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.5rem 1rem;" onclick="setQuickStat('max')">✨ Super Humano</button>
                <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.5rem 1rem;" onclick="setQuickStat('min')">📉 Miserável</button>
                <button class="btn btn-secondary" style="font-size: 0.8rem; padding: 0.5rem 1rem;" onclick="setQuickStat('adult')">👨 Adulto Padrão</button>
            </div>
            <div class="form-group">
                <label class="form-label">Saúde (0-100)</label>
                <input type="number" class="form-input" id="statHealth" min="0" max="100" value="${player.health || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Felicidade (0-100)</label>
                <input type="number" class="form-input" id="statHappiness" min="0" max="100" value="${player.happiness || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Inteligência (0-100)</label>
                <input type="number" class="form-input" id="statIntelligence" min="0" max="100" value="${player.intelligence || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Social (0-100)</label>
                <input type="number" class="form-input" id="statSocial" min="0" max="100" value="${player.social || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Fitness (0-100)</label>
                <input type="number" class="form-input" id="statFitness" min="0" max="100" value="${player.fitness || 0}">
            </div>
            <div class="form-group">
                <label class="form-label">Idade (Anos)</label>
                <input type="number" class="form-input" id="statAge" min="0" max="120" value="${player.age || 0}">
            </div>
        `;
        hideLoading();
    } catch (e) {
        hideLoading();
        console.error(e);
    }
}

function setQuickStat(type) {
    const fields = ['statHealth', 'statHappiness', 'statIntelligence', 'statSocial', 'statFitness'];
    if (type === 'max') {
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = 100;
        });
    } else if (type === 'min') {
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = 10;
        });
    } else if (type === 'adult') {
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = 50;
        });
        const ageEl = document.getElementById('statAge');
        if (ageEl) ageEl.value = 25;
    }
}

async function loadGameSettings() {
    if (settingsListener) settingsListener();
    return new Promise((resolve) => {
        settingsListener = db.collection('config').doc('gameSettings')
            .onSnapshot(doc => {
                if (doc.exists) {
                    gameSettings = doc.data();
                }
                resolve();
            }, (error) => {
                console.error("Error loading settings:", error);
                resolve();
            });
    });
}

async function applyModifyStats() {
    const playerId = document.getElementById('statsPlayer').value;
    if (!playerId) {
        showNotification('Selecione um jogador', 'error');
        return;
    }

    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    const newAge = parseInt(document.getElementById('statAge').value);
    const stats = {
        health: parseInt(document.getElementById('statHealth').value),
        happiness: parseInt(document.getElementById('statHappiness').value),
        intelligence: parseInt(document.getElementById('statIntelligence').value),
        social: parseInt(document.getElementById('statSocial').value),
        fitness: parseInt(document.getElementById('statFitness').value),
        age: newAge
    };

    // Ajustar birthDate se a idade mudou manualmente
    if (newAge !== player.age) {
        const now = new Date(Date.now() + serverTimeOffset);
        const yearInMs = (1000 * 60 * 60 * 24) / (gameSettings.timeSpeed || 1);
        const offsetMs = (newAge * yearInMs) + (yearInMs * 0.05);
        const newBirthDate = new Date(now.getTime() - offsetMs);
        stats.birthDate = newBirthDate.toISOString();
    }

    showLoading('Salvando...');
    closeModal();

    try {
        await db.collection('characters').doc(playerId).update(stats);

        hideLoading();
        showNotification('Stats modificados!', 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro', 'error');
    }
}

async function broadcastMessage() {
    openModal('Mensagem Global', `
        <div class="form-group">
            <label class="form-label">Mensagem</label>
            <textarea class="form-input" id="broadcastMsg" rows="4" placeholder="Digite a mensagem para todos os jogadores"></textarea>
        </div>
    `, [
        { text: 'Enviar', class: 'btn btn-primary', onclick: 'sendBroadcast()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function sendBroadcast() {
    const message = document.getElementById('broadcastMsg').value;

    if (!message) {
        showNotification('Digite uma mensagem', 'error');
        return;
    }

    showLoading('Enviando...');
    closeModal();

    try {
        const batch = db.batch();

        allPlayers.forEach(player => {
            const ref = db.collection('activities').doc();
            batch.set(ref, {
                characterId: player.id,
                text: `📢 Mensagem dos Deuses: ${message}`,
                type: 'important',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        hideLoading();
        showNotification('Mensagem enviada a todos!', 'success');
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro ao enviar', 'error');
    }
}

async function resetGame() {
    if (!confirm('⚠️ ATENÇÃO: Resetar TODO O JOGO? Todos os dados serão perdidos!')) {
        return;
    }

    if (!confirm('Tem CERTEZA ABSOLUTA? Esta ação é IRREVERSÍVEL!')) {
        return;
    }

    showLoading('Resetando universo...');

    try {
        // Delete all characters
        const charSnapshot = await db.collection('characters').get();
        const batch1 = db.batch();
        charSnapshot.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();

        // Delete all activities
        const actSnapshot = await db.collection('activities').get();
        const batch2 = db.batch();
        actSnapshot.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();

        // Delete all requests
        const reqSnapshot = await db.collection('requests').get();
        const batch3 = db.batch();
        reqSnapshot.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();

        hideLoading();
        showNotification('Universo resetado!', 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error('Error:', error);
        showNotification('Erro ao resetar', 'error');
    }
}

// ============================================
// SIDEBAR NAVIGATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;

            // Update buttons
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update sections
            document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');

            // Load specific content
            switch (section) {
                case 'players':
                    loadPlayersSection();
                    break;
                case 'families':
                    loadFamiliesSection();
                    break;
            }
        });
    });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================
function openModal(title, body, buttons = []) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;

    const buttonsContainer = document.getElementById('modalButtons');
    buttonsContainer.innerHTML = '';

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = btn.class || 'btn';
        button.textContent = btn.text;
        button.onclick = () => eval(btn.onclick);
        buttonsContainer.appendChild(button);
    });

    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function showLoading(text = 'Carregando...') {
    document.querySelector('.loading-text').textContent = text;
    document.getElementById('loading').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading').classList.remove('active');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 2rem;
        background: rgba(10, 10, 10, 0.98);
        border: 3px solid ${type === 'success' ? 'var(--emerald)' : 'var(--danger)'};
        border-left-width: 6px;
        padding: 1.5rem 2rem;
        min-width: 300px;
        z-index: 9999;
        animation: slideInRight 0.5s ease;
    `;
    notification.innerHTML = `
        <div style="font-family: 'Syne', sans-serif; font-weight: 800; margin-bottom: 0.5rem;">${type === 'success' ? 'Sucesso' : 'Erro'}</div>
        <div>${message}</div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
        closeModal();
    }
});

// ============================================
// MISSING GOD MODE FUNCTIONS
// ============================================

async function adjustTimeSpeed() {
    openModal('Ajustar Velocidade do Tempo', `
        <div class="form-group">
            <label class="form-label">Velocidade (1x = 1 Ano/Dia Real)</label>
            <input type="range" class="form-range" id="timeSpeed" min="0.1" max="50" step="0.1" value="${gameSettings.timeSpeed || 1}" oninput="document.getElementById('speedValue').textContent = this.value + 'x'">
            <div style="text-align: center; margin-top: 0.5rem; font-weight: bold;" id="speedValue">${gameSettings.timeSpeed || 1}x</div>
            <p style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-top: 1rem; text-align: center;">
                0.1x = 1 ano a cada 10 dias<br>
                1x = 1 ano por dia<br>
                10x = 1 ano a cada 2.4 horas
            </p>
        </div>
    `, [
        { text: 'Aplicar', class: 'btn btn-primary', onclick: 'applyTimeSpeed()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyTimeSpeed() {
    const speed = parseFloat(document.getElementById('timeSpeed').value);
    // In a real implementation, this would update a server-side setting or a public config doc
    // For now, let's simulate updating a global config
    showLoading('Ajustando tempo...');
    closeModal();

    try {
        await db.collection('config').doc('gameSettings').set({
            timeSpeed: speed,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        hideLoading();
        showNotification(`Velocidade de tempo ajustada para ${speed}x`, 'success');
    } catch (error) {
        hideLoading();
        // Create config if not exists
        await db.collection('config').doc('gameSettings').set({ timeSpeed: speed });
        hideLoading();
        showNotification(`Velocidade de tempo ajustada para ${speed}x`, 'success');
    }
}

async function changeCareer() {
    openModal('Alterar Carreira/Educação', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="careerPlayer">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Nova Ocupação</label>
            <select class="form-input" id="newOccupation">
                <option value="">Selecione...</option>
                ${Object.keys(CAREERS).map(key => `<option value="${key}">${CAREERS[key].label}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Nova Educação</label>
            <select class="form-input" id="newEducation">
                <option value="">Selecione...</option>
                ${Object.keys(EDUCATION).map(key => `<option value="${key}">${EDUCATION[key].label}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Curso Universitário (Apenas se Graus Univ.)</label>
            <select class="form-input" id="newCourse" onchange="updateUniversityYearField()">
                <option value="">Nenhum</option>
                ${Object.keys(UNIVERSITY_COURSES).map(key => `<option value="${key}">${UNIVERSITY_COURSES[key].label}</option>`).join('')}
            </select>
        </div>
        <div class="form-group" id="uniYearGroup" style="display:none;">
            <label class="form-label">Ano Atual da Faculdade</label>
            <select class="form-input" id="uniYear">
            </select>
        </div>
    `, [
        { text: 'Aplicar', class: 'btn btn-primary', onclick: 'applyChangeCareer()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

function updateUniversityYearField() {
    const courseKey = document.getElementById('newCourse').value;
    const yearGroup = document.getElementById('uniYearGroup');
    const yearSelect = document.getElementById('uniYear');

    if (courseKey && UNIVERSITY_COURSES[courseKey]) {
        yearGroup.style.display = 'block';
        const duration = UNIVERSITY_COURSES[courseKey].duration;
        let options = '';
        for (let i = 1; i <= duration; i++) {
            options += `<option value="${i}">${i}º Ano</option>`;
        }
        yearSelect.innerHTML = options;
    } else {
        yearGroup.style.display = 'none';
        yearSelect.innerHTML = '';
    }
}

async function applyChangeCareer() {
    const playerId = document.getElementById('careerPlayer').value;
    const occupation = document.getElementById('newOccupation').value;
    const education = document.getElementById('newEducation').value;

    if (!playerId) {
        showNotification('Selecione um jogador', 'error');
        return;
    }

    showLoading('Atualizando...');
    closeModal();

    try {
        const updates = {};
        if (occupation) updates.occupation = occupation;
        if (education) updates.education = education;

        const course = document.getElementById('newCourse').value;
        const year = parseInt(document.getElementById('uniYear').value) || 1;
        const player = allPlayers.find(p => p.id === playerId);

        if (course && player) {
            updates.currentCourse = course;
            const duration = UNIVERSITY_COURSES[course].duration;
            const yearsLeft = duration - (year - 1);
            updates.graduationAge = (player.age || 18) + yearsLeft;
            await addActivity(playerId, `Foi matriculado divinamente no ${year}º ano de ${UNIVERSITY_COURSES[course].label}! 🏛️`, 'important');
        } else if (player) {
            // Se remover o curso
            updates.currentCourse = null;
            updates.graduationAge = null;
        }

        await db.collection('characters').doc(playerId).update(updates);

        if (occupation) {
            const jobLabel = CAREERS[occupation] ? CAREERS[occupation].label : occupation;
            await addActivity(playerId, `Foi contratado como ${jobLabel} por intervenção divina! 💼`, 'important');
        }
        if (education) {
            const eduLabel = EDUCATION[education] ? EDUCATION[education].label : education;
            await addActivity(playerId, `Concedido diploma de ${eduLabel} por intervenção divina! 🎓`, 'important');
        }

        hideLoading();
        showNotification('Carreira/Educação atualizada!', 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao atualizar', 'error');
    }
}

async function forceRelationship() {
    // Already partly implemented via linkPlayers(), but this adds more options
    linkPlayers();
}

async function createChild() {
    // Already implemented as createFamily() logic, or we can reuse `createFamily` 
    // but specifically for adding a child to existing parents.
    // Let's reuse createFamily for now as it covers "create family" which includes children.
    createFamily();
}

async function deletePlayer() {
    openModal('Deletar Jogador', `
        <div class="form-group">
            <label class="form-label">Jogador para Deletar</label>
            <select class="form-input" id="deletePlayerSelect">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="warning-box">⚠️ Esta ação é irreversível!</div>
    `, [
        { text: 'Deletar Permanentemente', class: 'btn btn-danger', onclick: 'applyDeletePlayer()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyDeletePlayer() {
    const playerId = document.getElementById('deletePlayerSelect').value;
    if (!playerId) return;
    deletePlayerConfirm(playerId);
    closeModal();
}

async function giveAchievement() {
    openModal('Dar Conquista/Item', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="achievePlayer">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Conquista/Prémio</label>
            <select class="form-input" id="achieveId">
                <option value="">Selecione...</option>
                ${Object.keys(ACHIEVEMENTS).map(key => `<option value="${key}">${ACHIEVEMENTS[key].label}</option>`).join('')}
            </select>
        </div>
    `, [
        { text: 'Conceder', class: 'btn btn-primary', onclick: 'applyGiveAchievement()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyGiveAchievement() {
    const playerId = document.getElementById('achievePlayer').value;
    const achievementId = document.getElementById('achieveId').value;

    if (!playerId || !achievementId) return;

    showLoading('Concedendo...');
    closeModal();

    try {
        await db.collection('characters').doc(playerId).update({
            achievements: firebase.firestore.FieldValue.arrayUnion(achievementId)
        });

        const achieveLabel = ACHIEVEMENTS[achievementId] ? ACHIEVEMENTS[achievementId].label : achievementId;
        await addActivity(playerId, `Recebeu a conquista "${achieveLabel}" dos deuses! 🏆`, 'important');

        hideLoading();
        showNotification('Conquista concedida!', 'success');
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao conceder', 'error');
    }
}

async function teleportPlayer() {
    openModal('Teletransportar Jogador', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="teleportPlayerId">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => `<option value="${p.id}">${p.name} (${p.location || 'Desconhecido'})</option>`).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Nova Localização</label>
            <select class="form-input" id="newLocation">
                <option value="">Selecione...</option>
                <option value="Lisboa">Lisboa</option>
                <option value="Porto">Porto</option>
                <option value="Braga">Braga</option>
                <option value="Coimbra">Coimbra</option>
                <option value="Funchal">Funchal</option>
                <option value="Faro">Faro</option>
                <option value="Évora">Évora</option>
                <option value="Aveiro">Aveiro</option>
                <option value="Viseu">Viseu</option>
                <option value="Setúbal">Setúbal</option>
                <option value="Marte">Marte (Divertido)</option>
            </select>
        </div>
    `, [
        { text: 'Teleportar', class: 'btn btn-primary', onclick: 'applyTeleport()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applyTeleport() {
    const playerId = document.getElementById('teleportPlayerId').value;
    const location = document.getElementById('newLocation').value;

    if (!playerId || !location) return;

    showLoading('Teletransportando...');
    closeModal();

    try {
        await db.collection('characters').doc(playerId).update({
            location: location
        });

        await addActivity(playerId, `Foi teletransportado magicamente para ${location}! 🌍`, 'important');

        hideLoading();
        showNotification(`Jogador teleportado para ${location}!`, 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        showNotification('Erro ao teleportar', 'error');
    }
}

async function skipEducation() {
    openModal('Avançar Educação (Skip)', `
        <div class="form-group">
            <label class="form-label">Jogador</label>
            <select class="form-input" id="skipPlayerId">
                <option value="">Selecione...</option>
                ${allPlayers.map(p => {
        const edu = EDUCATION[p.education] || { label: 'Nenhuma' };
        const area = p.educationArea ? ` (${getAreaName(p.educationArea)})` : '';
        return `<option value="${p.id}">${p.name} - Atual: ${edu.label}${area}</option>`;
    }).join('')}
            </select>
        </div>
        <div class="warning-box">⚠️ Avança o jogador instantaneamente para a próxima etapa escolar ou completa o curso atual.</div>
    `, [
        { text: 'Avançar Etapa', class: 'btn btn-primary', onclick: 'applySkipEducation()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function applySkipEducation() {
    const playerId = document.getElementById('skipPlayerId').value;
    if (!playerId) return;

    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    showLoading('Processando milagre...');
    closeModal();

    try {
        const updates = {};
        const currentEdu = player.education || 'none';

        // Se estiver num curso universitário, completa-o
        if (player.currentCourse) {
            updates.education = 'bachelor';
            updates.major = player.currentCourse;
            updates.currentCourse = null;
            updates.intelligence = firebase.firestore.FieldValue.increment(20);
            await addActivity(playerId, `Obteve o diploma divino de Licenciatura! 🎓`, 'critical');
        } else {
            // Avança na ordem: none -> elementary -> middle -> high -> (bachelor handled above)
            const order = ['none', 'elementary', 'middle', 'high'];
            const currentIndex = order.indexOf(currentEdu);

            if (currentIndex < order.length - 1) {
                const nextEdu = order[currentIndex + 1];
                updates.education = nextEdu;
                updates.intelligence = firebase.firestore.FieldValue.increment(10);

                // Se o próximo for secundário, escolhe CT por padrão no skip
                if (nextEdu === 'high') updates.educationArea = 'ct';

                const nextLabel = EDUCATION[nextEdu] ? EDUCATION[nextEdu].label : nextEdu;
                await addActivity(playerId, `Avançou magicamente para ${nextLabel}! ✨`, 'critical');
            } else {
                showNotification('Jogador já atingiu o Secundário ou está na Universidade.', 'warning');
                hideLoading();
                return;
            }
        }

        await db.collection('characters').doc(playerId).update(updates);
        hideLoading();
        showNotification('Educação avançada com sucesso!', 'success');
        await loadDashboard();
    } catch (error) {
        hideLoading();
        console.error(error);
        showNotification('Erro ao avançar educação', 'error');
    }
}

function getAreaName(areaId) {
    const names = { 'ct': 'Ciências', 'av': 'Artes', 'lh': 'Humanidades', 'se': 'Economia' };
    return names[areaId] || areaId;
}

async function viewLogs() {
    // Simple implementation showing recent activity modal
    const logs = document.getElementById('recentActivity').innerHTML;
    openModal('Logs do Sistema', `
        <div style="max-height: 400px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 1rem;">
            ${logs}
        </div>
    `, [
        { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

// Helper to add activity since admin.js doesn't have it defined locally usually, 
// but we used it in other functions.
// If addActivity is NOT defined in admin.js, we need to add it.
async function addActivity(characterId, text, type = 'normal') {
    try {
        await db.collection('activities').add({
            characterId,
            text,
            type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("Error adding activity", e);
    }
}
// Sincronizar relógio com servidor Firebase
function syncServerTime() {
    if (typeof firebase.database === 'function') {
        const offsetRef = firebase.database().ref(".info/serverTimeOffset");
        offsetRef.on("value", (snap) => {
            serverTimeOffset = snap.val();
            console.log("Server time offset synchronized (Admin):", serverTimeOffset, "ms");
        });
    }
}
