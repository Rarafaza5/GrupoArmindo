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
let currentUser = null;
let currentCharacter = null;
let gameLoop = null;
let activityListener = null;
let playersListener = null;
let settingsListener = null;
let characterListener = null;
let allPlayers = [];
let gameSettings = {
    timeSpeed: 1 // Default: 1 real day = 1 game year
};
let serverTimeOffset = 0;

// ============================================
// GAME CONSTANTS - EXPANDIDO
// ============================================
const WORLD_START_TIME = new Date('2026-02-02T00:00:00Z').getTime();
const LIFE_STAGES = {
    baby: { min: 0, max: 2, label: 'Bebê', emoji: '👶' },
    toddler: { min: 3, max: 5, label: 'Criança Pequena', emoji: '🧒' },
    child: { min: 6, max: 12, label: 'Criança', emoji: '👦' },
    teen: { min: 13, max: 17, label: 'Adolescente', emoji: '🧑' },
    youngAdult: { min: 18, max: 29, label: 'Jovem Adulto', emoji: '🧑' },
    adult: { min: 30, max: 49, label: 'Adulto', emoji: '👨' },
    middleAged: { min: 50, max: 64, label: 'Meia-Idade', emoji: '👴' },
    senior: { min: 65, max: 79, label: 'Idoso', emoji: '👵' },
    elderly: { min: 80, max: 120, label: 'Muito Idoso', emoji: '👴' }
};

const EDUCATION = {
    none: { label: 'Nenhuma', minAge: 0, cost: 0, intelligence: 0, duration: 0 },
    elementary: { label: 'Ensino Básico (1º-9º)', minAge: 6, cost: 0, intelligence: 10, duration: 9 },
    middle: { label: 'Ensino Preparatório', minAge: 10, cost: 0, intelligence: 15, duration: 2 }, // In PT, cycle transition
    high: { label: 'Ensino Secundário', minAge: 15, cost: 0, intelligence: 25, duration: 3 },
    bachelor: { label: 'Licenciatura', minAge: 18, cost: 2100, intelligence: 40, duration: 3 }, // ~700€/year public
    master: { label: 'Mestrado', minAge: 21, cost: 3000, intelligence: 60, duration: 2 },
    phd: { label: 'Doutoramento', minAge: 23, cost: 8000, intelligence: 80, duration: 4 }
};

const CAREERS = {
    unemployed: { label: 'Desempregado', salary: 0, education: 'none', intelligence: 0, social: 0 },
    cashier: { label: 'Operador de Caixa', salary: 820, education: 'none', intelligence: 10, social: 15 },
    waiter: { label: 'Empregado de Mesa', salary: 850, education: 'none', intelligence: 10, social: 25 },
    delivery: { label: 'Estafeta (TVDE/Food)', salary: 900, education: 'none', intelligence: 10, social: 20 },
    receptionist: { label: 'Rececionista', salary: 950, education: 'high', intelligence: 20, social: 30 },
    salesperson: { label: 'Vendedor', salary: 1100, education: 'high', intelligence: 25, social: 40 },
    mechanic: { label: 'Mecânico Auto', salary: 1300, education: 'high', intelligence: 35, social: 20, fitness: 40 },
    electrician: { label: 'Eletricista', salary: 1400, education: 'middle', intelligence: 40, social: 25 },
    freelancer: { label: 'Freelancer Digital', salary: 1500, education: 'high', intelligence: 45, social: 30 },
    content_creator: { label: 'Criador de Conteúdo', salary: 1800, education: 'none', intelligence: 30, social: 70 },
    teacher: { label: 'Professor QP', salary: 1500, education: 'bachelor', intelligence: 45, social: 40 },
    nurse: { label: 'Enfermeiro', salary: 1400, education: 'bachelor', intelligence: 50, social: 35 },
    programmer: { label: 'Programador Júnior', salary: 1600, education: 'bachelor', intelligence: 60, social: 20 },
    accountant: { label: 'Contabilista', salary: 1400, education: 'bachelor', intelligence: 55, social: 25 },
    engineer: { label: 'Engenheiro Civil', salary: 1800, education: 'bachelor', intelligence: 65, social: 30 },
    architect: { label: 'Arquiteto', salary: 1600, education: 'bachelor', intelligence: 65, social: 35 },
    lawyer: { label: 'Advogado Especialista', salary: 3000, education: 'master', intelligence: 70, social: 45 },
    doctor: { label: 'Médico Especialista', salary: 4500, education: 'master', intelligence: 75, social: 40 },
    scientist: { label: 'Investigador PhD', salary: 2200, education: 'phd', intelligence: 85, social: 25 },
    executive: { label: 'Gestor de Topo', salary: 5000, education: 'master', intelligence: 80, social: 60 },
    ceo: { label: 'Diretor Geral', salary: 8000, education: 'master', intelligence: 90, social: 70 },
    entrepreneur: { label: 'Proprietário de PME', salary: 4000, education: 'bachelor', intelligence: 75, social: 65 },
    artist: { label: 'Artista Freelance', salary: 1200, education: 'none', intelligence: 40, social: 50 },
    musician: { label: 'Músico Profissional', salary: 1300, education: 'none', intelligence: 45, social: 55 },
    athlete: { label: 'Atleta de Elite', salary: 3000, education: 'high', intelligence: 30, social: 60, fitness: 80 }
};

const PROPERTIES = {
    apartment_small: { label: 'T1 Periferia (Aluguel)', cost: 150000, rent: 750, happiness: 5 },
    apartment_medium: { label: 'T2 Cidade (Aluguel)', cost: 250000, rent: 1100, happiness: 10 },
    apartment_luxury: { label: 'T3 Cobertura Lisboa', cost: 1200000, rent: 3500, happiness: 25 },
    house_small: { label: 'Moradia Vilarejo', cost: 200000, rent: 900, happiness: 15 },
    house_medium: { label: 'Moradia Subúrbios', cost: 450000, rent: 1800, happiness: 30 },
    house_luxury: { label: 'Quinta no Douro/Algarve', cost: 2500000, rent: 7000, happiness: 60 },
    penthouse: { label: 'Penthouse Foz do Porto', cost: 1800000, rent: 5000, happiness: 45 }
};


const INTERVIEW_QUESTIONS = {
    programmer: [
        { q: "O que significa 'HTML'?", a: ["HyperText Markup Language", "HighTech Modern Language", "Home Tool Markup Language"], correct: 0 },
        { q: "Qual destes é uma linguagem de programação?", a: ["Python", "JSON", "Markdown"], correct: 0 },
        { q: "O que faz um 'loop'?", a: ["Repete código", "Para o programa", "Cria um erro"], correct: 0 }
    ],
    nurse: [
        { q: "Qual é a temperatura corporal normal?", a: ["36-37°C", "38-39°C", "34-35°C"], correct: 0 },
        { q: "O que significa 'Soro'?", a: ["Solução fisiológica", "Tipo de veneno", "Remédio para dormir"], correct: 0 }
    ],
    teacher: [
        { q: "Quem descobriu o caminho marítimo para a Índia?", a: ["Vasco da Gama", "Pedro Álvares Cabral", "D. Afonso Henriques"], correct: 0 },
        { q: "Qual é a capital de Portugal?", a: ["Lisboa", "Porto", "Coimbra"], correct: 0 }
    ],
    lawyer: [
        { q: "O que é o 'Diário da República'?", a: ["Jornal oficial do Estado", "Um jornal desportivo", "Livro de culinária"], correct: 0 },
        { q: "Em que ano foi aprovada a Constituição atual?", a: ["1976", "1910", "1986"], correct: 0 }
    ],
    doctor: [
        { q: "Onde fica o fémur?", a: ["Na perna", "No braço", "Na cabeça"], correct: 0 },
        { q: "O que transporta o oxigénio no sangue?", a: ["Hemoglobina", "Plaquetas", "Leucócitos"], correct: 0 }
    ],
    general: [
        { q: "Quanto é 15 + 27?", a: ["42", "32", "52"], correct: 0 },
        { q: "Qual é a cor resultante de azul + amarelo?", a: ["Verde", "Roxo", "Laranja"], correct: 0 }
    ]
};

const VEHICLES = {
    bicycle: { label: 'Bicicleta', cost: 300, happiness: 2, fitness: 5 },
    motorcycle: { label: 'Motocicleta', cost: 5000, happiness: 8 },
    car_economy: { label: 'Carro Económico', cost: 15000, happiness: 10 },
    car_sedan: { label: 'Carro Sedan', cost: 25000, happiness: 15 },
    car_suv: { label: 'SUV', cost: 40000, happiness: 20 },
    car_luxury: { label: 'Carro de Luxo', cost: 100000, happiness: 35 },
    car_sports: { label: 'Carro Desportivo', cost: 150000, happiness: 45 },
    yacht: { label: 'Iate', cost: 500000, happiness: 60 }
};

const SKILLS = {
    cooking: { label: 'Culinária', maxLevel: 10, bonus: 'happiness' },
    music: { label: 'Música', maxLevel: 10, bonus: 'social' },
    sports: { label: 'Desporto', maxLevel: 10, bonus: 'fitness' },
    art: { label: 'Arte', maxLevel: 10, bonus: 'happiness' },
    programming: { label: 'Programação', maxLevel: 10, bonus: 'intelligence' },
    business: { label: 'Negócios', maxLevel: 10, bonus: 'money' },
    charisma: { label: 'Carisma', maxLevel: 10, bonus: 'social' },
    meditation: { label: 'Meditação', maxLevel: 10, bonus: 'health' }
};

const ACHIEVEMENTS = {
    first_job: { label: 'Primeiro Emprego', desc: 'Conseguiu seu primeiro emprego', icon: '💼', reward: 500 },
    millionaire: { label: 'Milionário', desc: 'Acumulou €1,000,000', icon: '💰', reward: 5000 },
    married: { label: 'Casado', desc: 'Se casou', icon: '💑', reward: 1000 },
    parent: { label: 'Pai/Mãe', desc: 'Adotou uma criança', icon: '👶', reward: 2000 },
    graduated: { label: 'Graduado', desc: 'Completou uma Licenciatura', icon: '🎓', reward: 3000 },
    doctorate: { label: 'Doutor', desc: 'Completou um Doutoramento', icon: '👨‍🎓', reward: 10000 },
    centenarian: { label: 'Centenário', desc: 'Viveu 100 anos', icon: '🎂', reward: 50000 },
    healthy: { label: 'Vida Saudável', desc: 'Manteve 100 de saúde por 30 dias', icon: '❤️', reward: 2000 },
    social_butterfly: { label: 'Borboleta Social', desc: 'Alcançou 100 de social', icon: '🦋', reward: 1500 },
    genius: { label: 'Gênio', desc: 'Alcançou 100 de inteligência', icon: '🧠', reward: 3000 },
    athlete_pro: { label: 'Atleta Profissional', desc: 'Alcançou 100 de fitness', icon: '💪', reward: 2500 },
    property_owner: { label: 'Proprietário', desc: 'Comprou uma propriedade', icon: '🏠', reward: 5000 },
    car_owner: { label: 'Motorista', desc: 'Comprou um carro', icon: '🚗', reward: 1000 },
    world_traveler: { label: 'Viajante Mundial', desc: 'Viajou 10 vezes', icon: '✈️', reward: 5000 },
    skill_master: { label: 'Mestre de Habilidade', desc: 'Alcançou nível 10 em uma habilidade', icon: '⭐', reward: 3000 }
};

const UNIVERSITY_COURSES = {
    medicine: { label: 'Medicina', cost: 1200, duration: 6, intelligence: 75, area: 'ct' },
    engineering: { label: 'Engenharia', cost: 900, duration: 5, intelligence: 65, area: 'ct' },
    it: { label: 'Informática', cost: 800, duration: 3, intelligence: 60, area: 'ct' },
    architecture: { label: 'Arquitetura', cost: 1000, duration: 5, intelligence: 65, area: 'av' },
    design: { label: 'Design', cost: 700, duration: 3, intelligence: 50, area: 'av' },
    law: { label: 'Direito', cost: 900, duration: 5, intelligence: 70, area: 'lh' },
    teaching: { label: 'Ensino', cost: 700, duration: 4, intelligence: 45, area: 'lh' },
    business: { label: 'Gestão/Economia', cost: 950, intelligence: 60, duration: 3, area: 'se' },
    accounting: { label: 'Contabilidade', cost: 800, intelligence: 55, duration: 3, area: 'se' }
};

const COOLDOWNS = {
    study: 7200000,        // 2 hours
    work: 28800000,        // 8 hours
    gym: 3600000,          // 1 hour
    socialize: 10800000,   // 3 hours
    date: 14400000,        // 4 hours
    doctor: 86400000,      // 24 hours
    therapy: 604800000,    // 7 days
    travel: 86400000,      // 24 hours
    practice_skill: 3600000, // 1 hour
    crime: 43200000,       // 12 hours
    volunteer: 14400000,   // 4 hours
    meditate: 1800000,     // 30 minutes
    pride: 252000000       // 70 hours
};

const RANDOM_EVENTS = [
    {
        text: 'Encontrou €{amount} na rua!',
        type: 'positive',
        probability: 0.02,
        minAge: 6,
        effect: (char) => {
            const amount = Math.floor(Math.random() * 100) + 20;
            char.money = (char.money || 0) + amount;
            char.happiness = Math.min(100, (char.happiness || 50) + 5);
            return { amount };
        }
    },
    {
        text: 'Teve uma gripe forte.',
        type: 'negative',
        probability: 0.03,
        minAge: 0,
        effect: (char) => {
            char.health = Math.max(0, (char.health || 100) - 15);
            char.happiness = Math.max(0, (char.happiness || 50) - 10);
            return {};
        }
    },
    {
        text: 'Recebeu um bônus de €{amount} no trabalho!',
        type: 'positive',
        probability: 0.015,
        minAge: 18,
        requiresJob: true,
        effect: (char) => {
            const career = CAREERS[char.occupation] || CAREERS.unemployed;
            const amount = Math.floor(career.salary * 0.5);
            char.money = (char.money || 0) + amount;
            char.happiness = Math.min(100, (char.happiness || 50) + 10);
            return { amount };
        }
    },
    {
        text: 'Conheceu alguém interessante!',
        type: 'positive',
        probability: 0.025,
        minAge: 13,
        effect: (char) => {
            char.social = Math.min(100, (char.social || 50) + 8);
            char.happiness = Math.min(100, (char.happiness || 50) + 5);
            return {};
        }
    },
    {
        text: 'Teve um dia muito produtivo!',
        type: 'positive',
        probability: 0.02,
        minAge: 6,
        effect: (char) => {
            char.intelligence = Math.min(100, (char.intelligence || 50) + 3);
            char.happiness = Math.min(100, (char.happiness || 50) + 5);
            return {};
        }
    },
    {
        text: 'Perdeu dinheiro num investimento ruim.',
        type: 'negative',
        probability: 0.01,
        minAge: 18,
        effect: (char) => {
            const loss = Math.floor(char.money * 0.1);
            char.money = Math.max(0, (char.money || 0) - loss);
            char.happiness = Math.max(0, (char.happiness || 50) - 15);
            return {};
        }
    },
    {
        text: 'Teve uma discussão com alguém próximo.',
        type: 'negative',
        probability: 0.02,
        minAge: 6,
        effect: (char) => {
            char.happiness = Math.max(0, (char.happiness || 50) - 12);
            char.social = Math.max(0, (char.social || 50) - 8);
            return {};
        }
    },
    {
        text: 'Ganhou um prêmio na lotaria de €{amount}!',
        type: 'positive',
        probability: 0.005,
        minAge: 18,
        effect: (char) => {
            const amount = Math.floor(Math.random() * 5000) + 1000;
            char.money = (char.money || 0) + amount;
            char.happiness = Math.min(100, (char.happiness || 50) + 20);
            return { amount };
        }
    },
    {
        text: 'Teve uma inspiração criativa!',
        type: 'positive',
        probability: 0.02,
        minAge: 10,
        effect: (char) => {
            char.intelligence = Math.min(100, (char.intelligence || 50) + 5);
            char.happiness = Math.min(100, (char.happiness || 50) + 8);
            return {};
        }
    },
    {
        text: 'Sofreu um pequeno acidente.',
        type: 'negative',
        probability: 0.015,
        minAge: 3,
        effect: (char) => {
            char.health = Math.max(0, (char.health || 100) - 10);
            char.fitness = Math.max(0, (char.fitness || 50) - 5);
            return {};
        }
    }
];

// ============================================
// AUTHENTICATION
// ============================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadCharacter();
    } else {
        currentUser = null;
        currentCharacter = null;
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('gameScreen').style.display = 'none';
    }
});

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Preencha todos os campos', 'error');
        return;
    }

    showLoading('Entrando...');

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        hideLoading();
        showNotification('Erro: ' + getErrorMessage(error.code), 'error');
    }
}

function showRegister() {
    showModal('Criar Nova Vida', `
        <div class="form-group">
            <label class="form-label">Nome do Personagem</label>
            <input type="text" class="form-input" id="regName" placeholder="Seu nome">
        </div>
        <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="regEmail" placeholder="seu@email.com">
        </div>
        <div class="form-group">
            <label class="form-label">Senha</label>
            <input type="password" class="form-input" id="regPassword" placeholder="Mínimo 6 caracteres">
        </div>
        <div class="form-group">
            <label class="form-label">Identidade de Gênero</label>
            <div class="trait-grid">
                <div class="trait-option" onclick="selectGender('male')" id="gender-male">
                    <div class="trait-icon">👨</div>
                    <div class="trait-name">Masculino</div>
                </div>
                <div class="trait-option" onclick="selectGender('female')" id="gender-female">
                    <div class="trait-icon">👩</div>
                    <div class="trait-name">Feminino</div>
                </div>
                <div class="trait-option" onclick="selectGender('non-binary')" id="gender-non-binary">
                    <div class="trait-icon">🧑</div>
                    <div class="trait-name">Não-Binário</div>
                </div>
                <div class="trait-option" onclick="selectGender('genderfluid')" id="gender-genderfluid">
                    <div class="trait-icon">🌈</div>
                    <div class="trait-name">Gênero Fluido</div>
                </div>
                <div class="trait-option" onclick="selectGender('transgender-male')" id="gender-transgender-male">
                    <div class="trait-icon">🏳️‍⚧️</div>
                    <div class="trait-name">Homem Trans</div>
                </div>
                <div class="trait-option" onclick="selectGender('transgender-female')" id="gender-transgender-female">
                    <div class="trait-icon">🏳️‍⚧️</div>
                    <div class="trait-name">Mulher Trans</div>
                </div>
                <div class="trait-option" onclick="selectGender('agender')" id="gender-agender">
                    <div class="trait-icon">⚪</div>
                    <div class="trait-name">Agênero</div>
                </div>
                <div class="trait-option" onclick="selectGender('other')" id="gender-other">
                    <div class="trait-icon">✨</div>
                    <div class="trait-name">Outro</div>
                </div>
            </div>
        </div>
    `, [
        { text: 'Criar Personagem', class: 'btn btn-primary', onclick: 'register()' },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

let selectedGender = null;

function selectGender(gender) {
    selectedGender = gender;
    document.querySelectorAll('.trait-option').forEach(el => el.classList.remove('selected'));
    document.getElementById(`gender-${gender}`).classList.add('selected');
}

async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password || !selectedGender) {
        showNotification('Preencha todos os campos e selecione um gênero', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('A senha deve ter pelo menos 6 caracteres', 'error');
        return;
    }

    closeModal();
    showLoading('Criando sua vida...');

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await createCharacter(userCredential.user.uid, name, selectedGender);
        showNotification('Bem-vindo ao LifeVerse!', 'success');
    } catch (error) {
        hideLoading();
        showNotification('Erro: ' + getErrorMessage(error.code), 'error');
    }
}

async function logout() {
    if (confirm('Tem certeza que deseja sair?')) {
        stopGameLoop();
        await auth.signOut();
        currentCharacter = null;
        currentUser = null;
    }
}

function getErrorMessage(code) {
    const messages = {
        'auth/email-already-in-use': 'Este email já está em uso',
        'auth/invalid-email': 'Email inválido',
        'auth/weak-password': 'Senha muito fraca',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta'
    };
    return messages[code] || code;
}

// ============================================
// CHARACTER MANAGEMENT - MELHORADO
// ============================================
async function createCharacter(userId, name, gender) {
    const character = {
        userId,
        name,
        gender,
        age: 1, // Start at 1 for simplicity in 1:1 sync (or 0)
        alive: true,

        // Stats
        health: 100,
        happiness: 100,
        intelligence: 50,
        social: 50,
        fitness: 50,

        // Life info
        money: 500,
        education: 'none',
        occupation: 'unemployed',
        maritalStatus: 'single',
        location: 'Portugal',

        // NEW: Inventory system
        properties: [],
        vehicles: [],

        // NEW: Skills system
        skills: {},

        // NEW: Achievements
        achievements: [],
        unlockedAchievements: [],

        // NEW: Stats tracking
        stats: {
            jobsHad: 0,
            timesMarried: 0,
            childrenAdopted: 0,
            timesTraveled: 0,
            healthyDays: 0,
            crimesCommitted: 0,
            volunteersCount: 0
        },

        // Relationships (player IDs)
        relationships: [],
        family: {
            parents: [],
            siblings: [],
            children: [],
            spouse: null
        },

        // Game data
        activities: [],
        cooldowns: {},
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('characters').doc(userId).set(character);
    await addActivity(userId, 'Nasceu no LifeVerse!', 'important');
}

async function loadCharacter() {
    showLoading('Carregando seu personagem...');

    try {
        // First get character once to check existence
        const initialDoc = await db.collection('characters').doc(currentUser.uid).get();

        if (!initialDoc.exists) {
            hideLoading();
            showNotification('Personagem não encontrado. Crie um novo.', 'error');
            await auth.signOut();
            return;
        }

        // Setup real-time listener for current character
        if (characterListener) characterListener();
        characterListener = db.collection('characters').doc(currentUser.uid)
            .onSnapshot(async doc => {
                if (doc.exists) {
                    const data = doc.data();
                    const isFirstLoad = !currentCharacter;

                    currentCharacter = { id: doc.id, ...data };

                    // Initialize new fields
                    if (!currentCharacter.properties) currentCharacter.properties = [];
                    if (!currentCharacter.vehicles) currentCharacter.vehicles = [];
                    if (!currentCharacter.skills) currentCharacter.skills = {};
                    if (!currentCharacter.achievements) currentCharacter.achievements = [];
                    if (!currentCharacter.unlockedAchievements) currentCharacter.unlockedAchievements = [];
                    if (!currentCharacter.stats) currentCharacter.stats = { jobsHad: 0, timesMarried: 0, childrenAdopted: 0, timesTraveled: 0, healthyDays: 0, crimesCommitted: 0, volunteersCount: 0 };

                    if (isFirstLoad) {
                        // Things we only do once on login
                        if (!currentCharacter.alive) {
                            showDeathScreen();
                            hideLoading();
                            return;
                        }

                        await loadGameSettings();
                        syncServerTime();
                        updateAgeFromBirthDate();
                        showGameScreen();
                        updateUI();
                        startGameLoop();
                        loadActivities();
                        loadAllPlayers();
                        startDiceDuelListener();
                        hideLoading();
                    } else {
                        // Updates from admin or other sources
                        updateAgeFromBirthDate();
                        updateUI();
                    }
                }
            });

    } catch (error) {
        console.error('Error loading character:', error);
        hideLoading();
        showNotification('Erro ao carregar personagem', 'error');
    }
}

// FUNÇÃO CORRIGIDA - Calcula idade baseada na data de nascimento e velocidade do tempo
function updateAgeFromBirthDate() {
    if (!currentCharacter || !currentCharacter.birthDate) return;

    const birth = new Date(currentCharacter.birthDate);
    const now = new Date(Date.now() + serverTimeOffset);
    const diff = now - birth;

    // Calcula duração de um ano em MS baseado no timeSpeed
    // timeSpeed = 1 significa 1 dia real = 1 ano de jogo
    const yearMs = (1000 * 60 * 60 * 24) / (gameSettings.timeSpeed || 1);
    const newAge = Math.floor(diff / yearMs);

    // Only update if age changed
    if (newAge !== currentCharacter.age) {
        const oldAge = currentCharacter.age;
        currentCharacter.age = newAge;

        // Birthday celebration
        if (oldAge !== undefined && newAge > oldAge) {
            addActivity(currentCharacter.id, `Fez ${newAge} anos! 🎂`, 'important');
            currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 10);

            // Check for milestone achievements
            checkAgeAchievements();

            // NEW: Check for education enrollment milestones
            checkEducationMilestones(newAge);
        }

        saveCharacter();
    }
}

// EDUCAÇÃO AUTOMÁTICA E RAMIFICADA
function checkEducationMilestones(age) {
    if (!currentCharacter || !currentCharacter.alive) return;

    // 1. Matrícula Automática: Ensino Básico (6-9 anos)
    if (age >= 6 && age < 10 && (!currentCharacter.education || currentCharacter.education === 'none')) {
        enrollInSchool('elementary');
    }

    // 2. Matrícula Automática: Ensino Preparatório (10-14 anos)
    if (age >= 10 && age < 15 && currentCharacter.education === 'elementary') {
        enrollInSchool('middle');
    }

    // 3. Escolha do Secundário (15+ anos)
    if (age >= 15 && currentCharacter.education === 'middle') {
        promptSecondaryArea();
    }
}

async function enrollInSchool(eduKey) {
    const edu = EDUCATION[eduKey];
    currentCharacter.education = eduKey;
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 10) + 5);

    await addActivity(currentCharacter.id, `Matriculou-se no ${edu.label}! 📚`, 'important');
    await saveCharacter();
    updateUI();
    showNotification(`Matrícula automática: ${edu.label}`, 'success');
}

function promptSecondaryArea() {
    const areas = [
        { id: 'ct', label: 'Ciências e Tecnologias', icon: '🧪', desc: 'Engenharia, Saúde, TI' },
        { id: 'av', label: 'Artes Visuais', icon: '🎨', desc: 'Arquitetura, Design, Artes' },
        { id: 'lh', label: 'Línguas e Humanidades', icon: '📚', desc: 'Direito, Ensino, Letras' },
        { id: 'se', label: 'Ciências Socioeconómicas', icon: '📊', desc: 'Gestão, Economia, Finanças' }
    ];

    const areasList = areas.map(area => `
        <div class="shop-item" onclick="selectSecondaryArea('${area.id}')">
            <div class="shop-icon">${area.icon}</div>
            <div class="shop-info">
                <div class="shop-name">${area.label}</div>
                <div class="shop-desc">${area.desc}</div>
            </div>
            <button class="btn btn-primary">Escolher</button>
        </div>
    `).join('');

    showModal('Escolha da Área Secundária',
        '<p style="margin-bottom: 1.5rem;">Chegou ao Ensino Secundário! Esta escolha definirá o seu futuro académico e profissional.</p>' + areasList,
        [] // Persist until choice is made
    );
}

async function selectSecondaryArea(areaId) {
    const areasMap = {
        'ct': 'Ensino Secundário (Ciências)',
        'av': 'Ensino Secundário (Artes)',
        'lh': 'Ensino Secundário (Humanidades)',
        'se': 'Ensino Secundário (Economia)'
    };

    currentCharacter.education = 'high';
    currentCharacter.educationArea = areaId;
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 25) + 10);

    closeModal();
    await addActivity(currentCharacter.id, `Ingressou em ${areasMap[areaId]}! 🎓`, 'important');
    await saveCharacter();
    updateUI();
    showNotification(`Área escolhida: ${areasMap[areaId]}`, 'success');
}

async function loadGameSettings() {
    if (settingsListener) settingsListener();

    return new Promise((resolve) => {
        settingsListener = db.collection('config').doc('gameSettings')
            .onSnapshot(doc => {
                if (doc.exists) {
                    gameSettings = { ...gameSettings, ...doc.data() };
                    console.log('Game settings updated:', gameSettings);
                    if (currentCharacter) updateAgeFromBirthDate();
                }
                resolve();
            }, (error) => {
                console.error("Error loading settings:", error);
                resolve();
            });
    });
}

async function saveCharacter() {
    if (!currentCharacter) return;

    try {
        // Obter apenas campos mutáveis para evitar sobrescrever mudanças do admin
        const { id, name, birthDate, createdAt, ...mutableData } = currentCharacter;

        await db.collection('characters').doc(id).update({
            ...mutableData,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error saving:', error);
    }
}

// ============================================
// GAME LOOP - MELHORADO
// ============================================
function startGameLoop() {
    updateClock();

    gameLoop = setInterval(() => {
        updateClock();
        updateAgeFromBirthDate();

        const now = new Date();

        // Hourly events
        if (now.getMinutes() === 0 && now.getSeconds() < 2) {
            handleHourlyUpdate();
        }

        // Daily events at midnight
        if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() < 2) {
            handleDailyUpdate();
        }

        updateUI();
        updateCooldowns();
    }, 1000);
}

function stopGameLoop() {
    if (gameLoop) {
        clearInterval(gameLoop);
        gameLoop = null;
    }
    if (activityListener) {
        activityListener();
        activityListener = null;
    }
    if (playersListener) {
        playersListener();
        playersListener = null;
    }
    if (characterListener) {
        characterListener();
        characterListener = null;
    }
}

function updateClock() {
    const realNow = new Date(Date.now() + serverTimeOffset);

    const timeEl = document.getElementById('globalTime');
    const dateEl = document.getElementById('globalDate');

    if (timeEl) timeEl.textContent = realNow.toLocaleTimeString('pt-PT');
    if (dateEl) dateEl.textContent = realNow.toLocaleDateString('pt-PT');
}

// Sincronizar relógio com servidor Firebase
function syncServerTime() {
    const offsetRef = firebase.database().ref(".info/serverTimeOffset");
    offsetRef.on("value", (snap) => {
        serverTimeOffset = snap.val();
        console.log("Server time offset synchronized:", serverTimeOffset, "ms");
    });
}

async function handleHourlyUpdate() {
    if (!currentCharacter || !currentCharacter.alive) return;

    // Natural stat decay - mais realista
    const healthDecay = currentCharacter.age > 50 ? 0.8 : 0.5;
    const happinessDecay = 0.3;
    const fitnessDecay = currentCharacter.age > 40 ? 0.5 : 0.2;

    currentCharacter.health = Math.max(0, (currentCharacter.health || 100) - healthDecay);
    currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - happinessDecay);
    currentCharacter.fitness = Math.max(0, (currentCharacter.fitness || 50) - fitnessDecay);

    // Check for death
    if (currentCharacter.health <= 0) {
        await handleDeath('saúde chegou a zero');
        return;
    }

    // Age-based death chance
    if (currentCharacter.age >= 70) {
        const deathChance = (currentCharacter.age - 70) * 0.001;
        if (Math.random() < deathChance) {
            await handleDeath('causas naturais');
            return;
        }
    }

    // Random events
    for (const event of RANDOM_EVENTS) {
        if (event.minAge && currentCharacter.age < event.minAge) continue;
        if (event.requiresJob && currentCharacter.occupation === 'unemployed') continue;

        if (Math.random() < event.probability) {
            const params = event.effect(currentCharacter);
            let text = event.text;
            Object.keys(params).forEach(key => {
                text = text.replace(`{${key}}`, params[key]);
            });
            await addActivity(currentCharacter.id, text, event.type);
            break;
        }
    }

    await saveCharacter();
}

async function handleDailyUpdate() {
    if (!currentCharacter || !currentCharacter.alive) return;

    // Work salary
    if (currentCharacter.occupation && currentCharacter.occupation !== 'unemployed') {
        const career = CAREERS[currentCharacter.occupation];
        if (career) {
            const dailySalary = Math.floor(career.salary / 30);
            currentCharacter.money = (currentCharacter.money || 0) + dailySalary;
            await addActivity(currentCharacter.id, `Recebeu salário diário de €${dailySalary}`, 'positive');
        }
    }

    // Property costs
    if (currentCharacter.properties && currentCharacter.properties.length > 0) {
        let totalRent = 0;
        currentCharacter.properties.forEach(propKey => {
            const prop = PROPERTIES[propKey];
            if (prop) totalRent += Math.floor(prop.rent / 30);
        });
        if (totalRent > 0) {
            currentCharacter.money = Math.max(0, (currentCharacter.money || 0) - totalRent);
        }
    }

    // Check healthy days achievement
    if (currentCharacter.health >= 100) {
        currentCharacter.stats.healthyDays = (currentCharacter.stats.healthyDays || 0) + 1;
        if (currentCharacter.stats.healthyDays >= 30) {
            await unlockAchievement('healthy');
        }
    } else {
        currentCharacter.stats.healthyDays = 0;
    }

    // Check for stat-based achievements
    checkStatAchievements();

    await saveCharacter();
}

async function handleDeath(cause) {
    currentCharacter.alive = false;
    await saveCharacter();
    await addActivity(currentCharacter.id, `Morreu de ${cause} aos ${currentCharacter.age} anos.`, 'critical');
    showDeathScreen();
}

function showDeathScreen() {
    showModal('Fim da Vida', `
        <div style="text-align: center; padding: 2rem;">
            <div style="font-size: 5rem; margin-bottom: 1rem;">💀</div>
            <h2 style="font-size: 2rem; margin-bottom: 1rem;">Você Morreu</h2>
            <p style="font-size: 1.2rem; margin-bottom: 2rem;">
                ${currentCharacter.name} viveu ${currentCharacter.age} anos.<br>
                Acumulou €${formatMoney(currentCharacter.money || 0)}<br>
                ${currentCharacter.achievements ? currentCharacter.achievements.length : 0} conquistas desbloqueadas
            </p>
            <p style="color: var(--accent); font-weight: bold;">
                Devido à regra de permadeath, você não pode criar outro personagem.
            </p>
        </div>
    `, [
        { text: 'Sair', class: 'btn btn-primary', onclick: 'logout()' }
    ]);
}

// ============================================
// UI FUNCTIONS - EXPANDIDO
// ============================================
function showGameScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
}

function updateUI() {
    if (!currentCharacter) return;

    // Header
    document.getElementById('userName').textContent = currentCharacter.name;

    // Character Info
    document.getElementById('charAvatar').textContent = getGenderEmoji(currentCharacter.gender);
    document.getElementById('charName').textContent = currentCharacter.name;
    document.getElementById('charAge').textContent = `${currentCharacter.age} anos`;

    // Life Stage
    const stage = getLifeStage(currentCharacter.age);
    document.getElementById('lifeStage').textContent = stage.label;

    // Stats
    updateStat('health', currentCharacter.health || 0);
    updateStat('happiness', currentCharacter.happiness || 0);
    updateStat('intelligence', currentCharacter.intelligence || 0);
    updateStat('social', currentCharacter.social || 0);
    updateStat('fitness', currentCharacter.fitness || 0);

    // Money
    document.getElementById('moneyAmount').textContent = formatMoney(currentCharacter.money || 0);

    // Profile Info
    document.getElementById('occupation').textContent = CAREERS[currentCharacter.occupation]?.label || 'Desempregado';
    document.getElementById('education').textContent = EDUCATION[currentCharacter.education]?.label || 'Nenhuma';
    document.getElementById('maritalStatus').textContent = getMaritalStatus();
    document.getElementById('location').textContent = currentCharacter.location || 'Portugal';

    // Update tabs
    updateAllTabs();
}

function updateStat(statName, value) {
    const valueEl = document.getElementById(`${statName}Value`);
    const barEl = document.getElementById(`${statName}Bar`);

    if (valueEl) valueEl.textContent = Math.round(value);
    if (barEl) barEl.style.width = `${value}%`;
}

function updateAllTabs() {
    updateActionsTab();

    // Only update expensive/complex tabs if they are currently visible
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        const tabName = activeTab.getAttribute('data-tab');
        if (tabName === 'career') showCareerTab();
        if (tabName === 'assets') updateAssetsTab();
        if (tabName === 'relationships') showRelationshipsTab();
        if (tabName === 'family') showFamilyTab();
        if (tabName === 'social') showSocialTab();
    }
}

function updateActionsTab() {
    const grid = document.getElementById('actionsGrid');
    if (!grid) return;

    const age = currentCharacter.age;

    // Categories
    const categories = {
        'Vitalidade & Mente': [],
        'Lazer & Social': [],
        'Hobbies & Crescimento': [],
        'Educação & Trabalho': [],
        'Outros': []
    };

    // 1. VITALITY & MIND
    categories['Vitalidade & Mente'].push({
        icon: '🏋️', name: 'Academia', desc: '+15 Fitness', cost: 10, cooldown: 'gym', onclick: 'goToGym()'
    });
    categories['Vitalidade & Mente'].push({
        icon: '🧘', name: 'Meditar', desc: '+10 Saúde, +5 Fel.', cost: null, cooldown: 'meditate', onclick: 'meditate()'
    });
    categories['Vitalidade & Mente'].push({
        icon: '🩺', name: 'Check-up Médico', desc: '+30 Saúde', cost: 100, cooldown: 'doctor', onclick: 'goToDoctor()'
    });
    categories['Vitalidade & Mente'].push({
        icon: '😴', name: 'Sesta', desc: '+5 Saúde, -5 Soc.', cost: null, cooldown: null, onclick: 'takeANap()'
    });
    categories['Vitalidade & Mente'].push({
        icon: '🏃', name: 'Correr', desc: '+10 Fitness, +5 Saud.', cost: null, cooldown: 'gym', onclick: 'goRunning()'
    });

    // 2. LEISURE & SOCIAL
    if (age >= 13) {
        categories['Lazer & Social'].push({
            icon: '📺', name: 'Ver Netflix', desc: '+15 Fel., -5 Int.', cost: null, cooldown: null, onclick: 'watchNetflix()'
        });
        categories['Lazer & Social'].push({
            icon: '🌳', name: 'Passear no Parque', desc: '+5 Saúde, +5 Fel.', cost: null, cooldown: null, onclick: 'walkInPark()'
        });
        categories['Lazer & Social'].push({
            icon: '🎲', name: 'Duelo de Dados', desc: 'Aposta rápida vs Online', cost: 50, cooldown: null, onclick: 'quickDiceMatch()'
        });
        categories['Lazer & Social'].push({
            icon: '🥳', name: 'Ir à Festa', desc: '+20 Soc., -10 Int.', cost: 50, cooldown: 'socialize', onclick: 'goToParty()'
        });
        categories['Lazer & Social'].push({
            icon: '🎳', name: 'Bowling', desc: '+10 Soc., +5 Fel.', cost: 20, cooldown: 'socialize', onclick: 'goBowling()'
        });
    }
    if (age >= 18) {
        categories['Lazer & Social'].push({
            icon: '✈️', name: 'Viajar', desc: '+30 Fel., +10 Soc.', cost: 1500, cooldown: 'travel', onclick: 'travel()'
        });
    }

    // 3. HOBBIES & GROWTH
    if (age >= 6) {
        categories['Hobbies & Crescimento'].push({
            icon: '🎮', name: 'Jogar Videojogos', desc: '+10 Fel., -5 Fit.', cost: null, cooldown: null, onclick: 'playGames()'
        });
        categories['Hobbies & Crescimento'].push({
            icon: '🎨', name: 'Desenhar', desc: '+15 Fel., +2 Int.', cost: null, cooldown: null, onclick: 'drawArt()'
        });
    }
    if (age >= 10) {
        categories['Hobbies & Crescimento'].push({
            icon: '📖', name: 'Ler Livro', desc: '+15 Int., -5 Fel.', cost: null, cooldown: null, onclick: 'readBook()'
        });
        categories['Hobbies & Crescimento'].push({
            icon: '💻', name: 'Codar', desc: '+20 Int., -10 Soc.', cost: null, cooldown: null, onclick: 'practiceCoding()'
        });
        categories['Hobbies & Crescimento'].push({
            icon: '🗣️', name: 'Aprender Língua', desc: '+10 Int., +5 Soc.', cost: 200, cooldown: null, onclick: 'learnLanguage()'
        });
        categories['Hobbies & Crescimento'].push({
            icon: '🎸', name: 'Tocar Guitarra', desc: '+10 Soc., +5 Int.', cost: null, cooldown: null, onclick: 'playGuitar()'
        });
        categories['Hobbies & Crescimento'].push({
            icon: '🧶', name: 'Crochet', desc: '+10 Fel., +5 Int.', cost: null, cooldown: null, onclick: 'doCrochet()'
        });
    }

    // 4. EDUCATION & WORK
    if (age >= 6 && age < 18) {
        categories['Educação & Trabalho'].push({
            icon: '📚', name: 'Estudar', desc: '+10 Inteligência', cost: null, cooldown: 'study', onclick: 'study()'
        });
    }
    if (age >= 18) {
        categories['Educação & Trabalho'].push({
            icon: '🎓', name: 'Educação / Cursos', desc: 'Ver opções de estudo', cost: null, cooldown: null, onclick: 'showEducationMenu()'
        });
        if (currentCharacter.occupation === 'unemployed') {
            categories['Educação & Trabalho'].push({
                icon: '💼', name: 'Agência de Emprego', desc: 'Ver vagas de trabalho', cost: null, cooldown: null, onclick: 'showJobsMenu()'
            });
        }
    }

    // 5. OTHER
    categories['Outros'].push({
        icon: '🏆', name: 'Conquistas', desc: `${currentCharacter.achievements ? currentCharacter.achievements.length : 0}/${Object.keys(ACHIEVEMENTS).length}`, cost: null, cooldown: null, onclick: 'showAchievements()'
    });
    if (age >= 18) {
        categories['Outros'].push({
            icon: '🦹', name: 'Crime', desc: 'Risco vs Recompensa', cost: null, cooldown: 'crime', onclick: 'commitCrime()'
        });
        categories['Outros'].push({
            icon: '🏠', name: 'Imobiliária', desc: 'Comprar propriedades', cost: null, cooldown: null, onclick: 'showRealEstateMenu()'
        });
        categories['Outros'].push({
            icon: '🚗', name: 'Stand de Carros', desc: 'Comprar veículos', cost: null, cooldown: null, onclick: 'showCarDealerMenu()'
        });
        categories['Outros'].push({
            icon: '🏳️‍🌈', name: 'Pride', desc: '+30% Todos os Stats', cost: null, cooldown: 'pride', onclick: 'prideAction()'
        });
    }

    let html = '';
    for (const cat in categories) {
        if (categories[cat].length === 0) continue;
        html += `<h3 style="grid-column: 1/-1; margin: 1.5rem 0 1rem; font-size: 1.1rem; opacity: 0.8; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">${cat}</h3>`;
        html += categories[cat].map(action => createActionButton(action)).join('');
    }

    grid.innerHTML = html;
}


function updateSocialTab() {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) return;

    if (!currentCharacter.friends || currentCharacter.friends.length === 0) {
        friendsList.innerHTML = '<div style="padding: 1rem; opacity: 0.5;">Você ainda não tem amigos.</div>';
        return;
    }

    const friends = allPlayers.filter(p => currentCharacter.friends.includes(p.id));
    friendsList.innerHTML = friends.map(friend => `
        <div class="player-card">
            <div class="player-info">
                <div class="player-avatar">${getGenderEmoji(friend.gender)}</div>
                <div class="player-name-wrap">
                    <div class="player-name">${friend.name}</div>
                    <div class="player-meta">${friend.age} anos | ${friend.occupation || 'Desempregado'}</div>
                </div>
            </div>
            <div class="player-actions">
                <button class="btn btn-primary btn-sm" onclick="openPrivateChat('${friend.id}')">Chat</button>
                <button class="btn btn-secondary btn-sm" onclick="openSendMoneyModal('${friend.id}')">€</button>
                <button class="btn btn-danger btn-sm" onclick="removeFriend('${friend.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function updateAssetsTab() {
    const grid = document.getElementById('assetsGrid');
    if (!grid) return;

    const assets = [];

    // Properties (Private + Shared)
    const householdMembers = [];
    if (currentCharacter.spouse) householdMembers.push(currentCharacter.spouse);
    if (currentCharacter.family && currentCharacter.family.parents) {
        householdMembers.push(...currentCharacter.family.parents);
    }

    const myProperties = currentCharacter.properties || [];
    const sharedProperties = [];

    householdMembers.forEach(mid => {
        const member = allPlayers.find(p => p.id === mid);
        if (member && member.properties) {
            sharedProperties.push(...member.properties);
        }
    });

    const allProps = [...new Set([...myProperties, ...sharedProperties])];

    allProps.forEach(propKey => {
        const prop = PROPERTIES[propKey];
        if (prop) {
            const isShared = !myProperties.includes(propKey);
            assets.push({
                icon: '🏠',
                name: prop.label + (isShared ? ' (Família)' : ''),
                desc: `${isShared ? 'Casa Partilhada' : 'Propriedade Privada'} | Felicidade: +${prop.happiness}`,
                tag: 'CASA'
            });
        }
    });

    // Vehicles
    if (currentCharacter.vehicles && currentCharacter.vehicles.length > 0) {
        currentCharacter.vehicles.forEach(vehKey => {
            const veh = VEHICLES[vehKey];
            if (veh) {
                assets.push({
                    icon: '🚗',
                    name: veh.label,
                    desc: `Veículo | Estilo: +${veh.social}`,
                    tag: 'VEÍCULO'
                });
            }
        });
    }

    if (assets.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; opacity: 0.5;">Você ainda não possui nenhum património.</div>';
        return;
    }

    grid.innerHTML = assets.map(asset => `
        <div class="action-card">
            <div class="action-icon">${asset.icon}</div>
            <div class="asset-tag">${asset.tag}</div>
            <div class="action-title">${asset.name}</div>
            <div class="action-desc">${asset.desc}</div>
        </div>
    `).join('');
}


function createActionButton(action) {
    const cooldownRemaining = action.cooldown ? getCooldownRemaining(action.cooldown) : 0;
    const isOnCooldown = cooldownRemaining > 0;
    const canAfford = !action.cost || (currentCharacter.money || 0) >= action.cost;
    const disabled = isOnCooldown || !canAfford;

    return `
        <div class="action-btn ${disabled ? 'disabled' : ''}" onclick="${disabled ? '' : action.onclick}">
            <div class="action-icon">${action.icon}</div>
            <div class="action-name">${action.name}</div>
            <div class="action-desc">${action.desc}</div>
            ${action.cost ? `<div class="action-cost">€${action.cost}</div>` : ''}
            ${isOnCooldown ? `<div class="action-cooldown">${formatTime(cooldownRemaining)}</div>` : ''}
        </div>
    `;
}

function updateCooldowns() {
    updateAllTabs();
}

// ============================================
// ACTIONS - EXPANDIDO
// ============================================
async function study() {
    if (!canPerformAction('study')) return;

    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 10);
    currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 5);

    setCooldown('study');
    await addActivity(currentCharacter.id, 'Estudou e aumentou sua inteligência! 📚', 'normal');
    await saveCharacter();
    updateUI();
}

async function workExtra() {
    if (!canPerformAction('work')) return;

    const career = CAREERS[currentCharacter.occupation] || CAREERS.unemployed;
    const extraMoney = Math.floor(career.salary * 0.3);

    currentCharacter.money = (currentCharacter.money || 0) + extraMoney;
    currentCharacter.fitness = Math.max(0, (currentCharacter.fitness || 50) - 5);
    currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 8);

    setCooldown('work');
    await addActivity(currentCharacter.id, `Trabalhou horas extras e ganhou €${extraMoney}! 💼`, 'positive');
    await saveCharacter();
    updateUI();
}

async function goToGym() {
    if (!canPerformAction('gym')) return;

    currentCharacter.fitness = Math.min(100, (currentCharacter.fitness || 50) + 15);
    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 5);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 5);

    // Practice sports skill
    practiceSkill('sports', 1);

    setCooldown('gym');
    await addActivity(currentCharacter.id, 'Foi à academia e melhorou o fitness! 🏋️', 'normal');
    await saveCharacter();
    updateUI();
}

async function socialize() {
    if (!canPerformAction('socialize')) return;

    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 12);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 8);

    // Practice charisma skill
    practiceSkill('charisma', 1);

    setCooldown('socialize');
    await addActivity(currentCharacter.id, 'Socializou e fez novos amigos! 👥', 'normal');
    await saveCharacter();
    updateUI();
}

async function goToDoctor() {
    if (!canPerformAction('doctor', 100)) return;

    currentCharacter.money = Math.max(0, (currentCharacter.money || 0) - 100);
    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 30);

    setCooldown('doctor');
    await addActivity(currentCharacter.id, 'Foi ao médico e melhorou a saúde! ⚕️', 'positive');
    await saveCharacter();
    updateUI();
}

async function goToTherapy() {
    if (!canPerformAction('therapy', 150)) return;

    currentCharacter.money = Math.max(0, (currentCharacter.money || 0) - 150);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 20);

    setCooldown('therapy');
    await addActivity(currentCharacter.id, 'Foi à terapia e se sente melhor! 🧘', 'positive');
    await saveCharacter();
    updateUI();
}

async function travel() {
    if (!canPerformAction('travel', 500)) return;

    currentCharacter.money = Math.max(0, (currentCharacter.money || 0) - 500);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 25);
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 10);
    currentCharacter.stats.timesTraveled = (currentCharacter.stats.timesTraveled || 0) + 1;

    if (currentCharacter.stats.timesTraveled >= 10) {
        await unlockAchievement('world_traveler');
    }

    setCooldown('travel');
    await addActivity(currentCharacter.id, 'Viajou e teve experiências incríveis! ✈️', 'positive');
    await saveCharacter();
    updateUI();
}

// NEW: Meditation
async function meditate() {
    if (!canPerformAction('meditate')) return;

    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 10);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 5);

    practiceSkill('meditation', 1);

    setCooldown('meditate');
    await addActivity(currentCharacter.id, 'Meditou e encontrou paz interior! 🧘‍♂️', 'normal');
    await saveCharacter();
    updateUI();
}

// NEW: Volunteer
async function volunteer() {
    if (!canPerformAction('volunteer')) return;

    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 15);
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 10);
    currentCharacter.stats.volunteersCount = (currentCharacter.stats.volunteersCount || 0) + 1;

    setCooldown('volunteer');
    await addActivity(currentCharacter.id, 'Fez trabalho voluntário e ajudou pessoas! ❤️', 'positive');
    await saveCharacter();
    updateUI();
}

// NEW: Crime
async function commitCrime() {
    if (!canPerformAction('crime')) return;

    const caught = Math.random() < 0.3; // 30% chance de ser pego

    if (caught) {
        const fine = Math.floor(Math.random() * 1000) + 500;
        currentCharacter.money = Math.max(0, (currentCharacter.money || 0) - fine);
        currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 20);
        currentCharacter.social = Math.max(0, (currentCharacter.social || 50) - 15);
        await addActivity(currentCharacter.id, `Foi pego em atividade ilegal e pagou €${fine} de multa! 🚨`, 'negative');
    } else {
        const earnings = Math.floor(Math.random() * 2000) + 500;
        currentCharacter.money = (currentCharacter.money || 0) + earnings;
        currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 10);
        currentCharacter.stats.crimesCommitted = (currentCharacter.stats.crimesCommitted || 0) + 1;
        await addActivity(currentCharacter.id, `Teve sucesso em atividade arriscada e ganhou €${earnings}! 🎭`, 'positive');
    }

    setCooldown('crime');
    await saveCharacter();
    updateUI();
}

// ============================================
// EXPANDED ACTIONS
// ============================================

async function takeANap() {
    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 5);
    currentCharacter.social = Math.max(0, (currentCharacter.social || 50) - 5);
    await addActivity(currentCharacter.id, 'Tirou uma sesta revigorante. 😴', 'normal');
    await saveCharacter();
    updateUI();
}

async function watchNetflix() {
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 15);
    currentCharacter.intelligence = Math.max(0, (currentCharacter.intelligence || 50) - 5);
    await addActivity(currentCharacter.id, 'Ficou a ver Netflix e relaxou. 📺', 'normal');
    await saveCharacter();
    updateUI();
}

async function walkInPark() {
    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 5);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 5);
    await addActivity(currentCharacter.id, 'Deu um passeio agradável no parque. 🌳', 'normal');
    await saveCharacter();
    updateUI();
}

async function goToParty() {
    if (!canPerformAction('socialize')) return;
    if ((currentCharacter.money || 0) < 50) {
        showNotification('Dinheiro insuficiente para a entrada!', 'error');
        return;
    }
    currentCharacter.money -= 50;
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 20);
    currentCharacter.health = Math.max(0, (currentCharacter.health || 100) - 10);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 15);

    setCooldown('socialize');
    await addActivity(currentCharacter.id, 'Foi a uma festa épica! 🥳', 'positive');
    await saveCharacter();
    updateUI();
}

async function playGames() {
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 10);
    currentCharacter.fitness = Math.max(0, (currentCharacter.fitness || 50) - 5);
    await addActivity(currentCharacter.id, 'Jogou videojogos durante horas. 🎮', 'normal');
    await saveCharacter();
    updateUI();
}

async function readBook() {
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 15);
    currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 5);
    await addActivity(currentCharacter.id, 'Leu um livro interessante e aprendeu algo novo. 📖', 'normal');
    await saveCharacter();
    updateUI();
}

async function practiceCoding() {
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 20);
    currentCharacter.social = Math.max(0, (currentCharacter.social || 50) - 10);
    practiceSkill('programming', 1);
    await addActivity(currentCharacter.id, 'Passou a noite a codar. 💻', 'normal');
    await saveCharacter();
    updateUI();
}

async function learnLanguage() {
    if ((currentCharacter.money || 0) < 200) {
        showNotification('Dinheiro insuficiente para o curso!', 'error');
        return;
    }
    currentCharacter.money -= 200;
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 10);
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 5);
    await addActivity(currentCharacter.id, 'Começou a aprender uma nova língua. 🗣️', 'normal');
    await saveCharacter();
    updateUI();
}

async function goRunning() {
    currentCharacter.fitness = Math.min(100, (currentCharacter.fitness || 50) + 10);
    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 5);
    await addActivity(currentCharacter.id, 'Correu alguns quilómetros. 🏃', 'normal');
    await saveCharacter();
    updateUI();
}

async function goBowling() {
    if ((currentCharacter.money || 0) < 20) {
        showNotification('Dinheiro insuficiente!', 'error');
        return;
    }
    currentCharacter.money -= 20;
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 10);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 5);
    await addActivity(currentCharacter.id, 'Jogou bowling com amigos. 🎳', 'normal');
    await saveCharacter();
    updateUI();
}

async function playGuitar() {
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 10);
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 5);
    practiceSkill('music', 1);
    await addActivity(currentCharacter.id, 'Praticou guitarra e tocou uma música. 🎸', 'normal');
    await saveCharacter();
    updateUI();
}

async function drawArt() {
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 15);
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 2);
    await addActivity(currentCharacter.id, 'Fez um desenho incrível. 🎨', 'normal');
    await saveCharacter();
    updateUI();
}

// ============================================
// NEW: SKILLS SYSTEM
// ============================================
async function prideAction() {
    if (!canPerformAction('pride')) return;

    // Aumento de 30% em tudo (unidade ou percentual? o user disse "30%", assumirei multiplicador ou +30 pontos?)
    // "aumenta tudo em 30%" - Geralmente significa +30 se for stats de 0-100 ou multiplicador. 
    // Como os stats são 0-100, farei +30 pontos (ou 30% do total). 
    // Farei +30 pontos fixos para ser impactante.

    currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 30);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 30);
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 30);
    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 30);
    currentCharacter.fitness = Math.min(100, (currentCharacter.fitness || 50) + 30);

    setCooldown('pride');
    await addActivity(currentCharacter.id, 'Celebrou o Pride com orgulho! 🏳️‍🌈 ✨', 'important');
    await saveCharacter();
    updateUI();
    showNotification('Orgulho! Stats aumentados significativamente.', 'success');
}

async function doCrochet() {
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 10);
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 5);
    practiceSkill('art', 1);
    await addActivity(currentCharacter.id, 'Fez algum crochet e relaxou. 🧶', 'normal');
    await saveCharacter();
    updateUI();
    showNotification('Fazer crochet é relaxante!', 'success');
}

async function quickDiceMatch() {
    if ((currentCharacter.money || 0) < 50) {
        showNotification('Precisas de €50 para apostar!', 'error');
        return;
    }

    const now = Date.now();
    const onlineThreshold = 5 * 60 * 1000;

    // Check for online players
    const onlinePlayers = allPlayers.filter(p => {
        if (p.id === currentCharacter.id) return false;
        if (!p.alive) return false;
        if (!p.lastUpdate) return false;
        const lastUpd = p.lastUpdate.toDate ? p.lastUpdate.toDate().getTime() : new Date(p.lastUpdate).getTime();
        return (now - lastUpd) < onlineThreshold;
    });

    if (onlinePlayers.length === 0) {
        showNotification('Ninguém online no momento!', 'info');
        return;
    }

    const target = onlinePlayers[Math.floor(Math.random() * onlinePlayers.length)];

    // Pay at sending
    currentCharacter.money -= 50;
    await saveCharacter();
    updateUI();

    await db.collection('requests').add({
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        to: target.id,
        type: 'dice_duel',
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    showNotification(`Desafiou ${target.name} para Dados! €50 apostados.`, 'success');
}

function practiceSkill(skillName, amount = 1) {
    if (!currentCharacter.skills) currentCharacter.skills = {};
    if (!currentCharacter.skills[skillName]) currentCharacter.skills[skillName] = 0;

    const skill = SKILLS[skillName];
    if (!skill) return;

    const oldLevel = Math.floor(currentCharacter.skills[skillName]);
    currentCharacter.skills[skillName] = Math.min(skill.maxLevel, currentCharacter.skills[skillName] + amount);
    const newLevel = Math.floor(currentCharacter.skills[skillName]);

    if (newLevel > oldLevel) {
        showNotification(`Subiu para nível ${newLevel} em ${skill.label}!`, 'success');

        if (newLevel >= 10) {
            unlockAchievement('skill_master');
        }
    }
}

function showSkillsMenu() {
    const skillsList = Object.keys(SKILLS).map(key => {
        const skill = SKILLS[key];
        const level = currentCharacter.skills[key] || 0;
        const progress = Math.floor((level % 1) * 100);

        return `
            <div class="skill-item" onclick="trainSkill('${key}')">
                <div class="skill-info">
                    <div class="skill-name">${skill.label}</div>
                    <div class="skill-level">Nível ${Math.floor(level)}/${skill.maxLevel}</div>
                </div>
                <div class="skill-bar-container">
                    <div class="skill-bar-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
    }).join('');

    showModal('Treinar Habilidades', `
        <p style="margin-bottom: 1.5rem;">Escolha uma habilidade para treinar:</p>
        ${skillsList}
        <style>
            .skill-item {
                background: rgba(255,255,255,0.03);
                border: 2px solid var(--border);
                padding: 1rem;
                margin-bottom: 0.8rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .skill-item:hover {
                border-color: var(--accent);
                background: rgba(255,255,255,0.05);
            }
            .skill-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }
            .skill-name {
                font-weight: 700;
            }
            .skill-level {
                color: var(--emerald);
                font-size: 0.9rem;
            }
            .skill-bar-container {
                height: 8px;
                background: rgba(0,0,0,0.5);
                border: 2px solid var(--border);
                overflow: hidden;
            }
            .skill-bar-fill {
                height: 100%;
                background: var(--emerald);
                transition: width 0.3s ease;
            }
        </style>
    `, [
        { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function trainSkill(skillName) {
    if (!canPerformAction('practice_skill')) return;

    closeModal();

    const skill = SKILLS[skillName];
    practiceSkill(skillName, 0.5);

    // Apply skill bonuses
    if (skill.bonus === 'happiness') {
        currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + 5);
    } else if (skill.bonus === 'social') {
        currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 5);
    } else if (skill.bonus === 'fitness') {
        currentCharacter.fitness = Math.min(100, (currentCharacter.fitness || 50) + 5);
    } else if (skill.bonus === 'intelligence') {
        currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 5);
    } else if (skill.bonus === 'health') {
        currentCharacter.health = Math.min(100, (currentCharacter.health || 100) + 5);
    }

    setCooldown('practice_skill');
    await addActivity(currentCharacter.id, `Treinou ${skill.label}! ⭐`, 'normal');
    await saveCharacter();
    updateUI();
}

// ============================================
// NEW: SHOPPING SYSTEM
// ============================================
function showPropertiesShop() {
    const propertiesList = Object.keys(PROPERTIES).map(key => {
        const prop = PROPERTIES[key];
        const owned = currentCharacter.properties && currentCharacter.properties.includes(key);

        return `
            <div class="shop-item ${owned ? 'owned' : ''}">
                <div class="shop-icon">🏠</div>
                <div class="shop-info">
                    <div class="shop-name">${prop.label}</div>
                    <div class="shop-desc">+${prop.happiness} Felicidade | €${prop.rent}/dia</div>
                    <div class="shop-price">€${formatMoney(prop.cost)}</div>
                </div>
                ${owned ?
                `<div class="shop-owned">✓ Possuído</div>` :
                `<button class="btn btn-primary" onclick="buyProperty('${key}')">Comprar</button>`
            }
            </div>
        `;
    }).join('');

    showModal('Comprar Propriedade', `
        <p style="margin-bottom: 1.5rem;">Seu dinheiro: €${formatMoney(currentCharacter.money || 0)}</p>
        ${propertiesList}
        <style>
            .shop-item {
                background: rgba(255,255,255,0.03);
                border: 2px solid var(--border);
                padding: 1.5rem;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            .shop-item.owned {
                border-color: var(--emerald);
                background: rgba(0,217,163,0.1);
            }
            .shop-icon {
                font-size: 3rem;
            }
            .shop-info {
                flex: 1;
            }
            .shop-name {
                font-weight: 700;
                font-size: 1.1rem;
                margin-bottom: 0.3rem;
            }
            .shop-desc {
                color: rgba(255,255,255,0.7);
                font-size: 0.9rem;
                margin-bottom: 0.5rem;
            }
            .shop-price {
                color: var(--gold);
                font-weight: 700;
                font-size: 1.2rem;
            }
            .shop-owned {
                color: var(--emerald);
                font-weight: 700;
                padding: 0.8rem 1.5rem;
            }
        </style>
    `, [
        { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function buyProperty(propertyKey) {
    const prop = PROPERTIES[propertyKey];

    if ((currentCharacter.money || 0) < prop.cost) {
        showNotification('Dinheiro insuficiente!', 'error');
        return;
    }

    if (currentCharacter.properties && currentCharacter.properties.includes(propertyKey)) {
        showNotification('Você já possui esta propriedade!', 'error');
        return;
    }

    if (!currentCharacter.properties) currentCharacter.properties = [];

    currentCharacter.money -= prop.cost;
    currentCharacter.properties.push(propertyKey);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + prop.happiness);

    await unlockAchievement('property_owner');
    await addActivity(currentCharacter.id, `Comprou ${prop.label}! 🏠`, 'important');
    await saveCharacter();

    closeModal();
    showNotification(`Comprou ${prop.label}!`, 'success');
    updateUI();
}

function showVehiclesShop() {
    const vehiclesList = Object.keys(VEHICLES).map(key => {
        const vehicle = VEHICLES[key];
        const owned = currentCharacter.vehicles && currentCharacter.vehicles.includes(key);

        return `
            <div class="shop-item ${owned ? 'owned' : ''}">
                <div class="shop-icon">🚗</div>
                <div class="shop-info">
                    <div class="shop-name">${vehicle.label}</div>
                    <div class="shop-desc">+${vehicle.happiness} Felicidade${vehicle.fitness ? ` | +${vehicle.fitness} Fitness` : ''}</div>
                    <div class="shop-price">€${formatMoney(vehicle.cost)}</div>
                </div>
                ${owned ?
                `<div class="shop-owned">✓ Possuído</div>` :
                `<button class="btn btn-primary" onclick="buyVehicle('${key}')">Comprar</button>`
            }
            </div>
        `;
    }).join('');

    showModal('Comprar Veículo', `
        <p style="margin-bottom: 1.5rem;">Seu dinheiro: €${formatMoney(currentCharacter.money || 0)}</p>
        ${vehiclesList}
    `, [
        { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

async function buyVehicle(vehicleKey) {
    const vehicle = VEHICLES[vehicleKey];

    if ((currentCharacter.money || 0) < vehicle.cost) {
        showNotification('Dinheiro insuficiente!', 'error');
        return;
    }

    if (currentCharacter.vehicles && currentCharacter.vehicles.includes(vehicleKey)) {
        showNotification('Você já possui este veículo!', 'error');
        return;
    }

    if (!currentCharacter.vehicles) currentCharacter.vehicles = [];

    currentCharacter.money -= vehicle.cost;
    currentCharacter.vehicles.push(vehicleKey);
    currentCharacter.happiness = Math.min(100, (currentCharacter.happiness || 50) + vehicle.happiness);
    if (vehicle.fitness) {
        currentCharacter.fitness = Math.min(100, (currentCharacter.fitness || 50) + vehicle.fitness);
    }

    await unlockAchievement('car_owner');
    await addActivity(currentCharacter.id, `Comprou ${vehicle.label}! 🚗`, 'important');
    await saveCharacter();

    closeModal();
    showNotification(`Comprou ${vehicle.label}!`, 'success');
    updateUI();
}

// ============================================
// NEW: ACHIEVEMENTS SYSTEM
// ============================================
async function unlockAchievement(achievementKey) {
    if (!currentCharacter.achievements) currentCharacter.achievements = [];
    if (currentCharacter.achievements.includes(achievementKey)) return;

    const achievement = ACHIEVEMENTS[achievementKey];
    if (!achievement) return;

    currentCharacter.achievements.push(achievementKey);
    currentCharacter.money = (currentCharacter.money || 0) + achievement.reward;

    await addActivity(currentCharacter.id, `Desbloqueou: ${achievement.label}! +€${achievement.reward}`, 'important');
    showNotification(`🏆 ${achievement.label}\n${achievement.desc}\n+€${achievement.reward}`, 'success');

    await saveCharacter();
}

function checkStatAchievements() {
    if (currentCharacter.social >= 100) unlockAchievement('social_butterfly');
    if (currentCharacter.intelligence >= 100) unlockAchievement('genius');
    if (currentCharacter.fitness >= 100) unlockAchievement('athlete_pro');
    if (currentCharacter.money >= 1000000) unlockAchievement('millionaire');
}

function checkAgeAchievements() {
    if (currentCharacter.age >= 100) unlockAchievement('centenarian');
}

function showAchievements() {
    const achievementsList = Object.keys(ACHIEVEMENTS).map(key => {
        const achievement = ACHIEVEMENTS[key];
        const unlocked = currentCharacter.achievements && currentCharacter.achievements.includes(key);

        return `
            <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${unlocked ? achievement.icon : '🔒'}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${unlocked ? achievement.label : '???'}</div>
                    <div class="achievement-desc">${unlocked ? achievement.desc : 'Conquista bloqueada'}</div>
                    <div class="achievement-reward">${unlocked ? `Recompensa: €${achievement.reward}` : ''}</div>
                </div>
            </div>
        `;
    }).join('');

    const unlockedCount = currentCharacter.achievements ? currentCharacter.achievements.length : 0;
    const totalCount = Object.keys(ACHIEVEMENTS).length;

    showModal('Conquistas', `
        <p style="margin-bottom: 1.5rem;">
            Progresso: ${unlockedCount}/${totalCount} (${Math.round(unlockedCount / totalCount * 100)}%)
        </p>
        ${achievementsList}
        <style>
            .achievement-item {
                background: rgba(255,255,255,0.03);
                border: 2px solid var(--border);
                padding: 1rem;
                margin-bottom: 0.8rem;
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            .achievement-item.unlocked {
                border-color: var(--gold);
                background: rgba(255,215,0,0.05);
            }
            .achievement-item.locked {
                opacity: 0.5;
            }
            .achievement-icon {
                font-size: 2.5rem;
            }
            .achievement-info {
                flex: 1;
            }
            .achievement-name {
                font-weight: 700;
                font-size: 1.1rem;
                margin-bottom: 0.3rem;
            }
            .achievement-desc {
                color: rgba(255,255,255,0.7);
                font-size: 0.9rem;
                margin-bottom: 0.3rem;
            }
            .achievement-reward {
                color: var(--gold);
                font-size: 0.9rem;
                font-weight: 700;
            }
        </style>
    `, [
        { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
}

// Continue no próximo arquivo devido ao limite de caracteres...
// ============================================
// CAREER & EDUCATION - Continuação do game.js
// ============================================

// Esta é a parte 2 do game.js - deve ser concatenada com a parte 1

// CAREER FUNCTIONS
function showCareerTab() {
    const grid = document.getElementById('careerGrid');
    if (!grid) return;

    const age = currentCharacter.age;
    const currentEdu = currentCharacter.education || 'none';
    const currentJob = currentCharacter.occupation || 'unemployed';

    let content = '';

    // 1. Quick Actions (Study / Work Extra)
    if (age >= 6) {
        content += '<h3 style="margin-bottom: 1rem;">Ações Rápidas</h3>';
        content += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">';

        // Study
        content += createActionButton({
            icon: '📚',
            name: 'Estudar',
            desc: '+10 Intel.',
            cost: null,
            cooldown: 'study',
            onclick: 'study()'
        });

        // Work Extra
        if (age >= 16 && currentJob !== 'unemployed') {
            content += createActionButton({
                icon: '💼',
                name: 'Trabalhar Extra',
                desc: 'Dinheiro bónus',
                cost: null,
                cooldown: 'work',
                onclick: 'workExtra()'
            });
        }
        content += '</div>';
    }

    content += '<h3 style="margin-bottom: 1rem;">Educação</h3>';

    // Education options
    Object.keys(EDUCATION).forEach(key => {
        const edu = EDUCATION[key];
        if (key === 'none') return;

        const canAfford = (currentCharacter.money || 0) >= edu.cost;
        const rightAge = age >= edu.minAge;
        const notCompleted = currentEdu !== key;
        const hasPrerequisite = checkEducationPrerequisite(key, currentEdu);

        const enabled = canAfford && rightAge && notCompleted && hasPrerequisite;

        content += `
            <div class="action-btn ${enabled ? '' : 'disabled'}" onclick="${enabled ? `startEducation('${key}')` : ''}">
                <div class="action-icon">🎓</div>
                <div class="action-name">${edu.label}</div>
                <div class="action-desc">+${edu.intelligence} Int | ${edu.duration} anos</div>
                ${edu.cost > 0 ? `<div class="action-cost">€${edu.cost}</div>` : ''}
                ${!rightAge ? `<div class="action-req">Idade mín: ${edu.minAge}</div>` : ''}
                ${!hasPrerequisite ? `<div class="action-req">Educação prévia necessária</div>` : ''}
            </div>
        `;
    });

    content += '<h3 style="margin: 2rem 0 1rem;">Carreiras Disponíveis</h3>';

    // Career options
    Object.keys(CAREERS).forEach(key => {
        const career = CAREERS[key];
        if (key === 'unemployed') return;

        const hasEducation = checkCareerEducation(career.education, currentEdu);
        const hasIntelligence = (currentCharacter.intelligence || 0) >= career.intelligence;
        const hasSocial = !career.social || (currentCharacter.social || 0) >= career.social;
        const hasFitness = !career.fitness || (currentCharacter.fitness || 0) >= career.fitness;
        const notCurrentJob = currentJob !== key;

        const enabled = hasEducation && hasIntelligence && hasSocial && hasFitness && notCurrentJob && age >= 16;

        content += `
            <div class="action-btn ${enabled ? '' : 'disabled'}" onclick="${enabled ? `applyForJob('${key}')` : ''}">
                <div class="action-icon">💼</div>
                <div class="action-name">${career.label}</div>
                <div class="action-desc">€${career.salary}/mês</div>
                ${!hasEducation ? `<div class="action-req">Requer: ${EDUCATION[career.education].label}</div>` : ''}
                ${!hasIntelligence ? `<div class="action-req">Int mín: ${career.intelligence}</div>` : ''}
                ${!hasSocial && career.social ? `<div class="action-req">Social mín: ${career.social}</div>` : ''}
            </div>
        `;
    });

    // Quit job option
    if (currentJob !== 'unemployed') {
        content += `
            <div class="action-btn" onclick="quitJob()">
                <div class="action-icon">❌</div>
                <div class="action-name">Demitir-se</div>
                <div class="action-desc">Deixar emprego atual</div>
            </div>
        `;
    }

    grid.innerHTML = content;
}

function checkEducationPrerequisite(targetEdu, currentEdu) {
    const order = ['none', 'elementary', 'middle', 'high', 'bachelor', 'master', 'phd'];
    const targetIndex = order.indexOf(targetEdu);
    const currentIndex = order.indexOf(currentEdu);

    return targetIndex <= currentIndex + 1;
}

function checkCareerEducation(requiredEdu, currentEdu) {
    const order = ['none', 'elementary', 'middle', 'high', 'bachelor', 'master', 'phd'];
    const requiredIndex = order.indexOf(requiredEdu);
    const currentIndex = order.indexOf(currentEdu);

    return currentIndex >= requiredIndex;
}

async function startEducation(eduKey) {
    const edu = EDUCATION[eduKey];

    if ((currentCharacter.money || 0) < edu.cost) {
        showNotification('Dinheiro insuficiente!', 'error');
        return;
    }

    if (currentCharacter.age < edu.minAge) {
        showNotification('Você é muito jovem para esta educação!', 'error');
        return;
    }

    currentCharacter.money -= edu.cost;
    currentCharacter.education = eduKey;
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + edu.intelligence);

    if (eduKey === 'bachelor') await unlockAchievement('graduated');
    if (eduKey === 'phd') await unlockAchievement('doctorate');

    await addActivity(currentCharacter.id, `Completou ${edu.label}! 🎓`, 'important');
    await saveCharacter();
    updateUI();
    showCareerTab();
    showNotification(`Completou ${edu.label}!`, 'success');
}

async function applyForJob(careerKey) {
    const career = CAREERS[careerKey];
    if (!career) return;

    const requiresEdu = career.education !== 'none' && career.education !== 'elementary';
    const rand = Math.random();

    if (requiresEdu) {
        // 33% fail, 33% success, 33% interview
        if (rand < 0.33) {
            showNotification(`Infelizmente, a empresa decidiu não seguir com a sua candidatura para ${career.label}.`, 'error');
            await addActivity(currentCharacter.id, `Candidatura para ${career.label} recusada.`, 'negative');
        } else if (rand < 0.66) {
            await applyChangeCareer(careerKey);
            showNotification(`Parabéns! Foi contratado como ${career.label}! 💼`, 'success');
        } else {
            showJobInterview(careerKey);
        }
    } else {
        // 50% chance
        if (rand < 0.5) {
            showNotification(`A vaga para ${career.label} já foi preenchida.`, 'error');
            await addActivity(currentCharacter.id, `Não conseguiu a vaga de ${career.label}.`, 'negative');
        } else {
            await applyChangeCareer(careerKey);
            showNotification(`Parabéns! Começou a trabalhar como ${career.label}! 💼`, 'success');
        }
    }
}

function showJobInterview(careerKey) {
    const career = CAREERS[careerKey];
    const category = INTERVIEW_QUESTIONS[careerKey] ? careerKey : 'general';
    const pool = INTERVIEW_QUESTIONS[category];
    const question = pool[Math.floor(Math.random() * pool.length)];

    const buttons = question.a.map((ans, idx) => ({
        text: ans,
        class: 'btn btn-secondary',
        onclick: `checkInterviewAnswer('${careerKey}', ${idx}, ${question.correct})`
    }));

    showModal(`Entrevista: ${career.label}`, `
        <div style="text-align: center; padding: 1rem;">
            <p style="font-size: 1.2rem; margin-bottom: 2rem;">"Para começar, uma pergunta técnica: <strong>${question.q}</strong>"</p>
        </div>
    `, buttons);
}

window.checkInterviewAnswer = async function (careerKey, selected, correct) {
    closeModal();
    if (selected === correct) {
        await applyChangeCareer(careerKey);
        showNotification(`Excelente resposta! Foi contratado! 💼`, 'success');
    } else {
        showNotification(`A resposta estava errada. A entrevista terminou aqui.`, 'error');
        await addActivity(currentCharacter.id, `Falhou na entrevista para ${CAREERS[careerKey].label}.`, 'negative');
    }
};

async function applyChangeCareer(jobKey) {
    const career = CAREERS[jobKey];

    const oldJob = currentCharacter.occupation;
    currentCharacter.occupation = jobKey;

    if (oldJob === 'unemployed') {
        currentCharacter.stats.jobsHad = (currentCharacter.stats.jobsHad || 0) + 1;
        if (currentCharacter.stats.jobsHad === 1) {
            await unlockAchievement('first_job');
        }
    }

    await addActivity(currentCharacter.id, `Conseguiu emprego como ${career.label}! 💼`, 'important');
    await saveCharacter();
    updateUI();
    showCareerTab();
}

async function quitJob() {
    if (!confirm('Tem certeza que deseja se demitir?')) return;

    const oldCareer = CAREERS[currentCharacter.occupation];
    currentCharacter.occupation = 'unemployed';
    currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 10);

    await addActivity(currentCharacter.id, `Demitiu-se do cargo de ${oldCareer.label}`, 'normal');
    await saveCharacter();
    updateUI();
    showCareerTab();
}

// ============================================
// RELATIONSHIPS & FAMILY
// ============================================
function showRelationshipsTab() {
    const list = document.getElementById('relationshipsList');
    if (!list) return;

    if (!allPlayers || allPlayers.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Carregando jogadores...</p>';
        return;
    }

    const singles = allPlayers.filter(p =>
        p.id !== currentCharacter.id &&
        p.alive &&
        p.maritalStatus === 'single'
    );

    let content = '';

    if (currentCharacter.age < 18 && currentCharacter.family && currentCharacter.family.parents && currentCharacter.family.parents.length > 0 && !currentCharacter.family.isEmancipated) {
        content += `
            <div class="action-btn" onclick="requestEmancipation()">
                <div class="action-icon">🕊️</div>
                <div class="action-name">Pedir Emancipação</div>
                <div class="action-desc">Tornar-se legalmente independente dos seus pais.</div>
            </div>
            <hr style="margin: 2rem 0; border-color: rgba(255,255,255,0.1);">
        `;
    }

    if (singles.length === 0) {
        content += '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Nenhum jogador disponível</p>';
    } else {
        content += singles.map(player => createPlayerCard(player, 'relationship')).join('');
    }
    list.innerHTML = content;
}

function showFamilyTab() {
    const list = document.getElementById('familyList');
    if (!list) return;

    const family = currentCharacter.family || {};
    const familyMembers = [];

    // Spouse
    if (family.spouse) {
        const spouse = allPlayers.find(p => p.id === family.spouse);
        if (spouse) {
            familyMembers.push({ ...spouse, relation: 'Cônjuge' });
        }
    }

    // Children
    if (family.children && family.children.length > 0) {
        family.children.forEach(childId => {
            const child = allPlayers.find(p => p.id === childId);
            if (child) {
                familyMembers.push({ ...child, relation: 'Filho(a)' });
            }
        });
    }

    // Parents
    if (family.parents && family.parents.length > 0) {
        family.parents.forEach(parentId => {
            const parent = allPlayers.find(p => p.id === parentId);
            if (parent) {
                familyMembers.push({ ...parent, relation: 'Pai/Mãe' });
            }
        });
    }

    if (familyMembers.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Você não tem família ainda</p>';
        return;
    }

    list.innerHTML = familyMembers.map(player => createPlayerCard(player, 'family')).join('');
}

function showSocialTab(searchQuery = '') {
    const socialList = document.getElementById('socialList');
    const friendsList = document.getElementById('friendsList');
    if (!socialList || !friendsList) return;

    // Chat Buttons at the top
    let chatHeader = `
        <div class="chat-shortcuts" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem; margin-bottom: 2rem;">
            <button class="btn btn-primary" onclick="openGlobalChat()">Chat Global 🌍</button>
            <button class="btn btn-primary" onclick="openWorkChat()">Chat Trabalho 💼</button>
            <button class="btn btn-primary" onclick="openEduChat()">Chat Escola 🎓</button>
            <button class="btn btn-primary" onclick="openFamilyChat()">Chat Família 🏠</button>
        </div>
        <hr style="margin: 2rem 0; border-color: rgba(255,255,255,0.1);">
    `;

    if (!allPlayers || allPlayers.length === 0) {
        socialList.innerHTML = chatHeader + '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Carregando jogadores...</p>';
        friendsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Nenhum amigo ainda</p>';
        return;
    }

    // 1. Friends List
    const friends = allPlayers.filter(p =>
        currentCharacter.friends && currentCharacter.friends.includes(p.id) && p.alive
    );

    if (friends.length === 0) {
        friendsList.innerHTML = '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Você ainda não adicionou amigos</p>';
    } else {
        friendsList.innerHTML = friends.map(player => createPlayerCard(player, 'social')).join('');
    }

    // 2. Search Results / Potential People
    let otherPlayers = allPlayers.filter(p =>
        p.id !== currentCharacter.id &&
        p.alive &&
        !(currentCharacter.friends && currentCharacter.friends.includes(p.id))
    );

    if (searchQuery) {
        otherPlayers = otherPlayers.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    } else {
        otherPlayers = otherPlayers.slice(0, 10);
    }

    let otherHtml = chatHeader;
    if (otherPlayers.length === 0) {
        otherHtml += searchQuery ?
            '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Nenhum jogador encontrado</p>' :
            '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Nenhum jogador disponível</p>';
    } else {
        otherHtml += otherPlayers.map(player => createPlayerCard(player, 'social')).join('');
    }
    socialList.innerHTML = otherHtml;
}

function handlePlayerSearch(query) {
    showSocialTab(query);
}

function createPlayerCard(player, type) {
    const relation = player.relation || '';
    const avatar = getGenderEmoji(player.gender);
    const isFriend = currentCharacter.friends && currentCharacter.friends.includes(player.id);
    const isHousehold = currentCharacter.family?.parents?.includes(player.id) ||
        currentCharacter.family?.children?.includes(player.id) ||
        currentCharacter.family?.spouse === player.id;

    let actions = `
        <div class="player-actions" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${isFriend || isHousehold ? `<button class="btn btn-sm btn-primary" onclick="openPrivateChat('${player.id}')">Chat 💬</button>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="interactWithPlayer('${player.id}', 'praise')">Elogiar ✨</button>
            <button class="btn btn-sm btn-secondary" onclick="interactWithPlayer('${player.id}', 'insult')">Insultar 😡</button>
            <button class="btn btn-sm btn-danger" onclick="interactWithPlayer('${player.id}', 'duel')">Duelo ⚔️</button>
    `;

    if (type === 'relationship') {
        if (currentCharacter.age >= 13 && player.age >= 13 && player.maritalStatus === 'single') {
            actions += `<button class="btn btn-sm btn-primary" onclick="askOnDate('${player.id}')">Sair 💑</button>`;
        }
    } else if (type === 'family' && relation === 'Cônjuge') {
        actions += `<button class="btn btn-sm btn-danger" onclick="divorce('${player.id}')">Divorciar</button>`;
    } else if (type === 'social') {
        if (!isFriend && !isHousehold) {
            actions += `<button class="btn btn-sm btn-primary" onclick="addFriend('${player.id}')">+ Amigo 🤝</button>`;
        }
        if (currentCharacter.age >= 18 && player.age < 18) {
            actions += `<button class="btn btn-sm btn-primary" onclick="adoptChild('${player.id}')">Adotar 👶</button>`;
        }
    }

    actions += '</div>';

    return `
        <div class="player-card" style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 16px; margin-bottom: 1rem;">
            <div style="display: flex; gap: 1rem; align-items: center;">
                <div class="player-avatar" style="font-size: 2rem;">${avatar}</div>
                <div class="player-info">
                    <div class="player-name" style="font-weight: bold; font-size: 1.1rem;">${player.name}</div>
                    <div class="player-details" style="opacity: 0.7; font-size: 0.9rem;">
                        ${player.age} anos | ${CAREERS[player.occupation]?.label || 'Desempregado'}
                        ${relation ? `<br><span style="color: var(--primary)">Relação: ${relation}</span>` : ''}
                    </div>
                </div>
            </div>
            ${actions}
        </div>
    `;
}

async function askOnDate(playerId) {
    if (!canPerformAction('date')) return;

    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    // Create date request
    await db.collection('requests').add({
        type: 'date',
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        to: playerId,
        toName: player.name,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    setCooldown('date');
    await addActivity(currentCharacter.id, `Convidou ${player.name} para sair! 💑`, 'normal');
    await addActivity(playerId, `${currentCharacter.name} te convidou para sair! 💑`, 'social');

    showNotification('Convite enviado!', 'success');
}

async function proposeMarriage(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    if (currentCharacter.maritalStatus !== 'single') {
        showNotification('Você já está em um relacionamento!', 'error');
        return;
    }

    if (player.maritalStatus !== 'single') {
        showNotification('Esta pessoa já está em um relacionamento!', 'error');
        return;
    }

    // Create marriage request
    await db.collection('requests').add({
        type: 'marriage',
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        to: playerId,
        toName: player.name,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await addActivity(currentCharacter.id, `Pediu ${player.name} em casamento! 💍`, 'important');
    await addActivity(playerId, `${currentCharacter.name} te pediu em casamento! 💍`, 'social');

    showNotification('Pedido de casamento enviado!', 'success');
}

async function addFriend(playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    if (currentCharacter.friends && currentCharacter.friends.includes(playerId)) {
        showNotification('Vocês já são amigos!', 'error');
        return;
    }

    // Create friend request
    await db.collection('requests').add({
        type: 'friend',
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        to: playerId,
        toName: player.name,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await addActivity(currentCharacter.id, `Enviou pedido de amizade para ${player.name}`, 'normal');
    await addActivity(playerId, `${currentCharacter.name} quer ser seu amigo! 🤝`, 'social');

    showNotification('Pedido de amizade enviado!', 'success');
}

async function adoptChild(childId) {
    const child = allPlayers.find(p => p.id === childId);
    if (!child) return;

    if (currentCharacter.age < 18) {
        showNotification('Você precisa ter pelo menos 18 anos para adotar!', 'error');
        return;
    }

    // Allow any age if player accepts, but logically adoption is for someone younger
    if (child.age >= currentCharacter.age) {
        showNotification('Você só pode adotar alguém mais novo que você!', 'error');
        return;
    }

    // Create adoption request
    await db.collection('requests').add({
        type: 'adoption',
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        to: childId,
        toName: child.name,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await addActivity(currentCharacter.id, `Solicitou adoção de ${child.name}! 👶`, 'important');
    await addActivity(childId, `${currentCharacter.name} quer te adotar! 👶`, 'social');

    showNotification('Pedido de adoção enviado!', 'success');
}

async function divorce(spouseId) {
    if (!confirm('Tem certeza que deseja se divorciar?')) return;

    const spouse = allPlayers.find(p => p.id === spouseId);
    if (!spouse) return;

    // Update current character
    currentCharacter.maritalStatus = 'single';
    if (currentCharacter.family) {
        currentCharacter.family.spouse = null;
    }
    currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 30);

    // Update spouse
    await db.collection('characters').doc(spouseId).update({
        maritalStatus: 'single',
        'family.spouse': null,
        happiness: firebase.firestore.FieldValue.increment(-30)
    });

    await addActivity(currentCharacter.id, `Divorciou-se de ${spouse.name}`, 'negative');
    await addActivity(spouseId, `Divorciou-se de ${currentCharacter.name}`, 'negative');

    await saveCharacter();
    loadAllPlayers();
    showFamilyTab();
    showNotification('Divórcio concluído', 'success');
}

// ============================================
// REQUESTS SYSTEM
// ============================================
async function checkRequests() {
    if (!currentCharacter || !currentCharacter.id) return;

    const requests = await db.collection('requests')
        .where('to', '==', currentCharacter.id)
        .where('status', '==', 'pending')
        .get();

    // Evitar mostrar múltiplos modais de uma vez
    if (!requests.empty && !document.getElementById('modal').classList.contains('active')) {
        const doc = requests.docs[0];
        const request = { id: doc.id, ...doc.data() };
        showRequestNotification(request);
    }
}

function showRequestNotification(request) {
    let message = '';
    let buttons = [];

    if (request.type === 'date') {
        message = `${request.fromName} te convidou para sair! 💑`;
        buttons = [
            { text: 'Aceitar', class: 'btn btn-primary', onclick: `acceptRequest('${request.id}', 'date')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    } else if (request.type === 'marriage') {
        message = `${request.fromName} te pediu em casamento! 💍`;
        buttons = [
            { text: 'Aceitar', class: 'btn btn-primary', onclick: `acceptRequest('${request.id}', 'marriage')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    } else if (request.type === 'adoption') {
        message = `${request.fromName} quer te adotar! 👶`;
        buttons = [
            { text: 'Aceitar', class: 'btn btn-primary', onclick: `acceptRequest('${request.id}', 'adoption')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    } else if (request.type === 'friend') {
        message = `${request.fromName} enviou um pedido de amizade! 🤝`;
        buttons = [
            { text: 'Aceitar', class: 'btn btn-primary', onclick: `acceptRequest('${request.id}', 'friend')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    } else if (request.type === 'emancipation') {
        message = `${request.fromName} pediu para ser emancipado(a)! 🕊️`;
        buttons = [
            { text: 'Aceitar', class: 'btn btn-primary', onclick: `acceptRequest('${request.id}', 'emancipation')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    } else if (request.type === 'duel') {
        message = `${request.fromName} te desafiou para um ${request.duelType === 'force' ? 'Duelo de Força' : 'Duelo de Mentes'}! ⚔️`;
        buttons = [
            { text: 'Aceitar Desafio', class: 'btn btn-danger', onclick: `acceptRequest('${request.id}', 'duel')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    } else if (request.type === 'dice_duel') {
        message = `${request.fromName} desafiou-te para um Duelo de Dados de €50! 🎲`;
        buttons = [
            { text: 'Aceitar Dados', class: 'btn btn-primary', onclick: `acceptRequest('${request.id}', 'dice_duel')` },
            { text: 'Recusar', class: 'btn btn-secondary', onclick: `rejectRequest('${request.id}')` }
        ];
    }

    if (message) {
        showModal('Novo Pedido', message, buttons);
    }
}

async function acceptRequest(requestId, type) {
    try {
        closeModal();
        showLoading('Aceitando...');

        await db.collection('requests').doc(requestId).update({ status: 'accepted' });

        const requestDoc = await db.collection('requests').doc(requestId).get();
        const request = requestDoc.data();
        const fromId = request.from;

        if (type === 'friend') {
            if (!currentCharacter.friends) currentCharacter.friends = [];
            if (!currentCharacter.friends.includes(fromId)) {
                currentCharacter.friends.push(fromId);
            }

            // Update other player
            const otherPlayerRef = db.collection('characters').doc(fromId);
            const otherDoc = await otherPlayerRef.get();
            const otherData = otherDoc.data();
            const otherFriends = otherData.friends || [];
            if (!otherFriends.includes(currentCharacter.id)) {
                otherFriends.push(currentCharacter.id);
                await otherPlayerRef.update({ friends: otherFriends });
            }

            await addActivity(currentCharacter.id, `Aceitou o pedido de amizade de ${request.fromName}! 🤝`, 'social');
            await addActivity(fromId, `${currentCharacter.name} aceitou o seu pedido de amizade! 🤝`, 'social');
        } else if (type === 'emancipation') {
            // Check if all parents agree (soft implementation)
            // For now, if one parent accepts, it proceeds (can be complex with multi-parent)
            if (currentCharacter.family && currentCharacter.family.children) {
                currentCharacter.family.children = currentCharacter.family.children.filter(id => id !== fromId);
            }

            const childRef = db.collection('characters').doc(fromId);
            const childDoc = await childRef.get();
            const childData = childDoc.data();

            if (childData.family && childData.family.parents) {
                const newParents = childData.family.parents.filter(id => id !== currentCharacter.id);
                await childRef.update({
                    'family.parents': newParents,
                    'family.isEmancipated': newParents.length === 0
                });
            }

            await addActivity(currentCharacter.id, `Aceitou o pedido de emancipação de ${request.fromName}.`, 'social');
            await addActivity(fromId, `${currentCharacter.name} aceitou o seu pedido de emancipação!`, 'social');
        } else if (type === 'duel') {
            const duelId = `duel_${requestId}`;
            await db.collection('duels').doc(duelId).set({
                challengerId: request.from,
                opponentId: currentCharacter.id,
                duelType: request.duelType,
                status: 'active',
                turn: 1,
                hp: {
                    [request.from]: 100,
                    [currentCharacter.id]: 100
                },
                moves: {},
                logs: [`O duelo começou! ${request.fromName} vs ${currentCharacter.name}`],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            enterDuelArena(duelId);
        } else if (type === 'dice_duel') {
            if (currentCharacter.money < 50) {
                showNotification('Não tens dinheiro suficiente!', 'error');
                return;
            }
            currentCharacter.money -= 50;
            const diceResult = Math.floor(Math.random() * 6) + 1;

            await db.collection('dice_duels').add({
                p1Id: request.from,
                p2Id: currentCharacter.id,
                p1Name: request.fromName,
                p2Name: currentCharacter.name,
                p2Roll: diceResult,
                status: 'waiting_p1',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            await saveCharacter();
            updateUI();
            showNotification(`Lançaste um ${diceResult}! Aguardando adversário...`, 'success');
        } else if (type === 'dice_duel_resolve') {
            resolveDiceDuel(requestId);
        }
        // ... (other types like marriage, adoption to be refined)

        await saveCharacter();
        hideLoading();
        showNotification('Pedido aceite!', 'success');
        updateUI();
    } catch (error) {
        console.error(error);
        hideLoading();
        showNotification('Erro ao aceitar pedido', 'error');
    }
}

// ============================================
// CHAT SYSTEM
// ============================================
// ============================================
// CHAT SYSTEM
// ============================================
let currentChatId = null;
let currentChatType = null;
let chatListener = null;

window.openChatChannel = async function (type, id, title) {
    const chatId = type === 'private' ? [currentCharacter.id, id].sort().join('_') : id;
    currentChatId = chatId;
    currentChatType = type;

    showModal(title, `
        <div id="chatMessages" class="chat-messages" style="height: 400px; overflow-y: auto; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; margin-bottom: 1rem;"></div>
        <div class="chat-actions-bar" style="display: flex; gap: 0.5rem; margin-bottom: 1rem; overflow-x: auto; padding-bottom: 0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="sendChatScene('abraço')">🫂 Abraço</button>
            <button class="btn btn-sm btn-secondary" onclick="sendChatScene('coração')">❤️ Coração</button>
            <button class="btn btn-sm btn-secondary" onclick="sendChatScene('festa')">🥳 Festa</button>
            <button class="btn btn-sm btn-primary" onclick="showGiftMenu()" style="background: #E91E63; border-color: #E91E63;">🎁 Presente</button>
        </div>
        <div id="giftMenu" style="display: none; background: rgba(0,0,0,0.4); padding: 1rem; border-radius: 12px; margin-bottom: 1rem; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
            <div class="gift-opt" onclick="sendChatGift('chocolate')" style="cursor:pointer; text-align:center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">🍫 €20</div>
            <div class="gift-opt" onclick="sendChatGift('flores')" style="cursor:pointer; text-align:center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">💐 €50</div>
            <div class="gift-opt" onclick="sendChatGift('diamante')" style="cursor:pointer; text-align:center; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 8px;">💎 €500</div>
        </div>
        <div class="chat-input-wrap" style="display: flex; gap: 0.5rem;">
            <input type="text" id="chatInput" class="form-input" placeholder="Escreva uma mensagem..." onkeydown="if(event.key==='Enter') sendChannelMessage()">
            <button class="btn btn-primary" onclick="sendChannelMessage()" style="width: auto; white-space: nowrap;">Enviar</button>
        </div>
    `, [{ text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeChat()' }]);

    if (chatListener) chatListener();

    chatListener = db.collection('messages')
        .where('chatId', '==', chatId)
        .orderBy('createdAt', 'asc')
        .limitToLast(50)
        .onSnapshot(snapshot => {
            const messagesDiv = document.getElementById('chatMessages');
            if (!messagesDiv) return;

            const messages = [];
            snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));

            messagesDiv.innerHTML = messages.map(msg => {
                const isSystem = msg.type === 'system';
                const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';

                if (isSystem) {
                    return `<div class="chat-system-msg" style="text-align: center; color: var(--primary); font-size: 0.85rem; margin: 1rem 0; font-style: italic;">📢 ${parseChatMessage(msg.text)}</div>`;
                }

                return `
                    <div class="chat-msg ${msg.from === currentCharacter.id ? 'sent' : 'received'}" style="margin-bottom: 0.8rem; display: flex; flex-direction: column; align-items: ${msg.from === currentCharacter.id ? 'flex-end' : 'flex-start'};">
                        <div class="msg-author" style="font-size: 0.75rem; opacity: 0.6; margin-bottom: 0.2rem; display: flex; gap: 0.5rem;">
                            <span>${msg.fromName || 'Invisível'}</span>
                            <span style="opacity: 0.5;">${time}</span>
                        </div>
                        <div class="msg-text" style="background: ${msg.from === currentCharacter.id ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; padding: 0.6rem 1rem; border-radius: 12px; max-width: 85%; word-break: break-word; position: relative; ${msg.isGift ? 'border: 1px solid gold; box-shadow: 0 0 10px rgba(255,215,0,0.3);' : ''}">
                            ${parseChatMessage(msg.text)}
                        </div>
                    </div>
                `;
            }).join('');
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
};

function parseChatMessage(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/:smile:/g, '😊')
        .replace(/:heart:/g, '❤️')
        .replace(/:fire:/g, '🔥')
        .replace(/:cash:/g, '💰');
}

window.showGiftMenu = function () {
    const menu = document.getElementById('giftMenu');
    menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
};

window.sendChatGift = async function (giftType) {
    let cost = 0;
    let text = '';
    let bonus = 0;

    if (giftType === 'chocolate') { cost = 20; text = 'enviou uma Caixa de Chocolates! 🍫'; bonus = 5; }
    if (giftType === 'flores') { cost = 50; text = 'enviou um Ramo de Flores! 💐'; bonus = 12; }
    if (giftType === 'diamante') { cost = 500; text = 'enviou um Diamante Raro! 💎'; bonus = 50; }

    if (currentCharacter.money < cost) {
        showNotification('Dinheiro insuficiente!', 'error');
        return;
    }

    currentCharacter.money -= cost;
    document.getElementById('giftMenu').style.display = 'none';

    await db.collection('messages').add({
        chatId: currentChatId,
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        text: `🎁 **${currentCharacter.name}** ${text}`,
        isGift: true,
        giftType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Award bonus if it's a private chat
    if (currentChatType === 'private') {
        const friendId = currentChatId.replace(currentCharacter.id, '').replace('_', '');
        await db.collection('characters').doc(friendId).update({
            happiness: firebase.firestore.FieldValue.increment(bonus)
        });
    }

    await saveCharacter();
    updateUI();
};

window.sendChannelMessage = async function () {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;

    await db.collection('messages').add({
        chatId: currentChatId,
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        text,
        type: currentChatType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    input.value = '';
};

window.sendChatScene = async function (sceneType) {
    let text = '';
    if (sceneType === 'abraço') text = `te mandou um abraço virtual! 🫂`;
    if (sceneType === 'coração') text = `te mandou um coração! ❤️`;
    if (sceneType === 'festa') text = `está a celebrar contigo! 🥳`;

    await db.collection('messages').add({
        chatId: currentChatId,
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        text: `✨ ${text}`,
        isScene: true,
        sceneType,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 1);
    await saveCharacter();
};

window.closeChat = function () {
    if (chatListener) chatListener();
    chatListener = null;
    currentChatId = null;
    currentChatType = null;
    closeModal();
};

// Simplified chat opens
window.openPrivateChat = (id) => {
    const p = allPlayers.find(pl => pl.id === id);
    window.openChatChannel('private', id, `Chat com ${p?.name || 'Amigo'}`);
};
window.openGlobalChat = () => window.openChatChannel('global', 'global', 'Chat Global 🌍');
window.openWorkChat = () => window.openChatChannel('work', `job_${currentCharacter.occupation || 'unemployed'}`, 'Chat do Trabalho 💼');
window.openEduChat = () => window.openChatChannel('edu', `edu_${currentCharacter.education || 'none'}`, 'Chat da Escola 🎓');
window.openFamilyChat = () => {
    const famId = (currentCharacter.family?.parents?.[0]) || currentCharacter.id;
    window.openChatChannel('family', `family_${famId}`, 'Chat da Família 🏠');
};

// ============================================
// SOCIAL ACTIONS & INTERACTIONS
// ============================================
window.interactWithPlayer = async function (playerId, interactionType) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    if (interactionType === 'praise') {
        await addActivity(playerId, `${currentCharacter.name} te elogiou! ✨`, 'social');
        await db.collection('characters').doc(playerId).update({
            happiness: firebase.firestore.FieldValue.increment(5)
        });
        currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 2);
        showNotification(`Elogiaste ${player.name}!`, 'success');
        await saveCharacter();
        updateUI();
    } else if (interactionType === 'insult') {
        await addActivity(playerId, `${currentCharacter.name} te insultou! 😡`, 'negative');
        await db.collection('characters').doc(playerId).update({
            happiness: firebase.firestore.FieldValue.increment(-10)
        });
        currentCharacter.social = Math.max(0, (currentCharacter.social || 50) - 5);
        showNotification(`Insultaste ${player.name}...`, 'warning');
        await saveCharacter();
        updateUI();
    } else if (interactionType === 'duel') {
        openDuelSelection(playerId);
    }
};

window.openDuelSelection = function (playerId) {
    const player = allPlayers.find(p => p.id === playerId);
    showModal(`Desafiar ${player.name}`, `
        <p>Escolha o tipo de duelo:</p>
        <div class="trait-grid">
            <div class="trait-option" onclick="requestDuel('${playerId}', 'force')">
                <div class="trait-icon">⚔️</div>
                <div class="trait-name">Duelo de Força</div>
                <div class="trait-desc">Baseado em Fitness</div>
            </div>
            <div class="trait-option" onclick="requestDuel('${playerId}', 'minds')">
                <div class="trait-icon">🧠</div>
                <div class="trait-name">Duelo de Mentes</div>
                <div class="trait-desc">Baseado em Inteligência</div>
            </div>
        </div>
    `, [{ text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }]);
};

window.requestDuel = async function (playerId, type) {
    const player = allPlayers.find(p => p.id === playerId);
    if (!player) return;

    closeModal();
    showLoading('Enviando desafio...');

    await db.collection('requests').add({
        type: 'duel',
        from: currentCharacter.id,
        fromName: currentCharacter.name,
        to: playerId,
        toName: player.name,
        duelType: type,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    hideLoading();
    showNotification('Desafio enviado! Aguarde o oponente.', 'success');

    // Listen for acceptance
    const unsub = db.collection('duels')
        .where('challengerId', '==', currentCharacter.id)
        .where('opponentId', '==', playerId)
        .where('status', '==', 'active')
        .onSnapshot(snap => {
            if (!snap.empty) {
                unsub();
                window.enterDuelArena(snap.docs[0].id);
            }
        });
};

let duelArenaListener = null;
window.enterDuelArena = function (duelId) {
    if (duelArenaListener) duelArenaListener();

    duelArenaListener = db.collection('duels').doc(duelId).onSnapshot(doc => {
        if (!doc.exists) return;
        const duel = doc.data();

        if (duel.status === 'finished') {
            duelArenaListener();
            window.showDuelResults(duel);
            return;
        }

        const isChallenger = currentCharacter.id === duel.challengerId;
        const myMove = duel.moves?.[currentCharacter.id];
        const opponentId = isChallenger ? duel.opponentId : duel.challengerId;
        const opponentMove = duel.moves?.[opponentId];
        const opponent = allPlayers.find(p => p.id === opponentId);

        const myHP = duel.hp[currentCharacter.id];
        const oppHP = duel.hp[opponentId];

        showModal(`Arena de Duelo: ${duel.duelType === 'force' ? 'Força' : 'Mentes'}`, `
            <div style="text-align:center; padding: 1rem;">
                <div style="display: flex; justify-content: space-around; margin-bottom: 2rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 12px; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="font-size: 2rem;">${getGenderEmoji(currentCharacter.gender)}</div>
                        <div style="font-weight: bold; color: var(--primary);">Você</div>
                        <div class="hp-bar-container" style="background: #333; height: 10px; border-radius: 5px; margin: 0.5rem 0;">
                            <div style="background: #4CAF50; width: ${myHP}%; height: 100%; border-radius: 5px; transition: width 0.3s;"></div>
                        </div>
                        <div style="font-size: 0.8rem;">${myHP}/100 HP</div>
                        <div id="duelMyStatus" style="font-size: 0.7rem;">${myMove ? '✅ Pronto' : '⌛ Pensando...'}</div>
                    </div>
                    <div style="font-size: 1.5rem; align-self: center; opacity: 0.5;">VS</div>
                    <div style="flex: 1;">
                        <div style="font-size: 2rem;">${getGenderEmoji(opponent?.gender)}</div>
                        <div style="font-weight: bold;">${opponent?.name}</div>
                        <div class="hp-bar-container" style="background: #333; height: 10px; border-radius: 5px; margin: 0.5rem 0;">
                            <div style="background: #e91e63; width: ${oppHP}%; height: 100%; border-radius: 5px; transition: width 0.3s;"></div>
                        </div>
                        <div style="font-size: 0.8rem;">${oppHP}/100 HP</div>
                        <div id="duelOppStatus" style="font-size: 0.7rem;">${opponentMove ? '✅ Pronto' : '⌛ Pensando...'}</div>
                    </div>
                </div>

                <div id="duelLogs" style="height: 100px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 8px; font-size: 0.8rem; margin-bottom: 1.5rem; text-align: left;">
                    ${duel.logs.slice(-5).map(log => `<div>> ${log}</div>`).join('')}
                </div>

                ${!myMove ? `
                    <p style="margin-bottom: 1rem; font-weight: bold;">Turno ${duel.turn}: Escolha sua ação</p>
                    <div class="trait-grid">
                        <div class="trait-option" onclick="submitDuelMove('${duelId}', 'quick')">
                            <div class="trait-icon">⚡</div>
                            <div class="trait-name">Ataque Rápido</div>
                            <div class="trait-desc">Dano leve, alta precisão</div>
                        </div>
                        <div class="trait-option" onclick="submitDuelMove('${duelId}', 'heavy')">
                            <div class="trait-icon">💥</div>
                            <div class="trait-name">Golpe Pesado</div>
                            <div class="trait-desc">Dano alto, precisão média</div>
                        </div>
                        <div class="trait-option" onclick="submitDuelMove('${duelId}', 'guard')">
                            <div class="trait-icon">🛡️</div>
                            <div class="trait-name">Defesa</div>
                            <div class="trait-desc">Reduz dano no próximo turno</div>
                        </div>
                        <div class="trait-option" onclick="submitDuelMove('${duelId}', 'heal')">
                            <div class="trait-icon">💊</div>
                            <div class="trait-name">Recuperar</div>
                            <div class="trait-desc">Cura um pouco de HP</div>
                        </div>
                    </div>
                ` : `<div class="loading-dots">Aguardando oponente<span>.</span><span>.</span><span>.</span></div>`}
            </div>
        `, []);
        const logsDiv = document.getElementById('duelLogs');
        if (logsDiv) logsDiv.scrollTop = logsDiv.scrollHeight;
    });
};

window.submitDuelMove = async function (duelId, move) {
    const duelDoc = db.collection('duels').doc(duelId);
    await duelDoc.update({
        [`moves.${currentCharacter.id}`]: move
    });

    const doc = await duelDoc.get();
    const duel = doc.data();
    if (Object.keys(duel.moves || {}).length === 2) {
        window.resolveDuel(duelId);
    }
};

window.resolveDuel = async function (duelId) {
    const duelDoc = db.collection('duels').doc(duelId);
    const doc = await duelDoc.get();
    const duel = doc.data();
    if (duel.status === 'finished') return;

    const p1Id = duel.challengerId;
    const p2Id = duel.opponentId;
    const m1 = duel.moves[p1Id];
    const m2 = duel.moves[p2Id];

    const p1 = allPlayers.find(p => p.id === p1Id);
    const p2 = allPlayers.find(p => p.id === p2Id);

    const stats1 = duel.duelType === 'force' ? (p1.fitness || 50) : (p1.intelligence || 50);
    const stats2 = duel.duelType === 'force' ? (p2.fitness || 50) : (p2.intelligence || 50);

    const newHP = { ...duel.hp };
    const newLogs = [...duel.logs];
    const newGuards = duel.guards || {};

    const processMove = (casterId, targetId, move, casterStats, targetStats) => {
        const casterName = casterId === p1Id ? p1.name : p2.name;
        const targetName = targetId === p1Id ? p1.name : p2.name;

        let damage = 0;
        let heal = 0;
        let hit = true;

        if (move === 'quick') {
            hit = Math.random() < 0.95;
            damage = hit ? Math.floor((casterStats / 5) + Math.random() * 10 + 5) : 0;
            if (hit) newLogs.push(`${casterName} usou Ataque Rápido! Dano: ${damage}`);
            else newLogs.push(`${casterName} errou o Ataque Rápido!`);
        } else if (move === 'heavy') {
            hit = Math.random() < 0.7;
            damage = hit ? Math.floor((casterStats / 3) + Math.random() * 15 + 10) : 0;
            if (hit) newLogs.push(`${casterName} usou Golpe Pesado! Dano crítico: ${damage}`);
            else newLogs.push(`${casterName} errou o Golpe Pesado!`);
        } else if (move === 'guard') {
            newGuards[casterId] = true;
            newLogs.push(`${casterName} está em postura defensiva!`);
        } else if (move === 'heal') {
            hit = Math.random() < 0.8;
            heal = hit ? 20 : 0;
            if (hit) {
                newHP[casterId] = Math.min(100, newHP[casterId] + heal);
                newLogs.push(`${casterName} recuperou ${heal} de HP!`);
            } else newLogs.push(`${casterName} falhou ao tentar curar!`);
        }

        if (damage > 0) {
            if (newGuards[targetId]) {
                damage = Math.floor(damage / 2);
                newLogs.push(`A defesa de ${targetName} reduziu o dano!`);
                delete newGuards[targetId];
            }
            newHP[targetId] = Math.max(0, newHP[targetId] - damage);
        }
    };

    // Resolução simultânea ou aleatória de ordem (Pokemon style speed is complicated, let's go sequential)
    processMove(p1Id, p2Id, m1, stats1, stats2);
    if (newHP[p2Id] > 0) {
        processMove(p2Id, p1Id, m2, stats2, stats1);
    }

    const isFinished = newHP[p1Id] <= 0 || newHP[p2Id] <= 0;

    if (isFinished) {
        const winnerId = newHP[p1Id] > 0 ? p1Id : p2Id;
        const loserId = winnerId === p1Id ? p2Id : p1Id;
        const winner = allPlayers.find(p => p.id === winnerId);
        const loser = allPlayers.find(p => p.id === loserId);

        await duelDoc.update({
            status: 'finished',
            hp: newHP,
            logs: newLogs,
            winnerId,
            loserId,
            resolveText: `${winner.name} saiu vitorioso deste duelo intenso!`
        });
    } else {
        await duelDoc.update({
            turn: (duel.turn || 1) + 1,
            hp: newHP,
            moves: {}, // Clear moves for next turn
            logs: newLogs,
            guards: newGuards
        });
    }
};

window.showDuelResults = function (duel) {
    const isWinner = currentCharacter.id === duel.winnerId;

    showModal(isWinner ? '🏆 Vitória!' : '💀 Derrota...', `
        <div style="text-align:center; padding: 1rem;">
            <p style="font-size: 1.2rem; margin-bottom: 1.5rem;">${duel.resolveText}</p>
            <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 12px;">
                ${isWinner ?
            `<p style="color: #4CAF50; font-weight: bold;">+ €150 | + Reputação</p>` :
            `<p style="color: #f44336; font-weight: bold;">- Saúde | - Felicidade</p>`}
            </div>
        </div>
    `, [{ text: 'Finalizar', class: 'btn btn-primary', onclick: 'finishDuelSync()' }]);

    if (isWinner) {
        currentCharacter.money += 150;
        currentCharacter.social = Math.min(100, (currentCharacter.social || 50) + 5);
    } else {
        currentCharacter.happiness = Math.max(0, (currentCharacter.happiness || 50) - 15);
        currentCharacter.health = Math.max(0, (currentCharacter.health || 100) - 10);
    }
    saveCharacter();
    updateUI();
};

window.finishDuelSync = function () {
    closeModal();
};

// ============================================
// DICE DUEL SYSTEM
// ============================================
let diceDuelListener = null;

function startDiceDuelListener() {
    if (diceDuelListener) diceDuelListener();
    diceDuelListener = db.collection('dice_duels')
        .where('p1Id', '==', currentCharacter.id)
        .where('status', '==', 'waiting_p1')
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const duel = doc.data();
                showDiceRollModal(doc.id, duel);
            });
        });

    // Also listen for results as P2 or P1
    db.collection('dice_duels')
        .where('status', '==', 'finished')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .onSnapshot(snapshot => {
            snapshot.forEach(doc => {
                const duel = doc.data();
                // Omit for now or show auto notification if player part of it
                if (duel.p1Id === currentCharacter.id || duel.p2Id === currentCharacter.id) {
                    // Only show if timestamp is very recent
                    const ts = duel.timestamp?.toDate().getTime() || 0;
                    if (Date.now() - ts < 10000) {
                        showDiceResults(duel);
                    }
                }
            });
        });
}

function showDiceRollModal(duelId, duel) {
    showModal('Duelo de Dados: Tua Vez!', `
        <div style="text-align: center;">
            <p>${duel.p2Name} aceitou o desafio!</p>
            <div style="font-size: 3rem; margin: 1rem;">🎲</div>
            <p>Lança os dados para decidir quem ganha os €100!</p>
        </div>
    `, [
        { text: 'Lançar Dados! 🎲', class: 'btn btn-primary', onclick: `resolveDiceDuel('${duelId}')` }
    ]);
}

async function resolveDiceDuel(duelId) {
    closeModal();
    const duelRef = db.collection('dice_duels').doc(duelId);
    const duelDoc = await duelRef.get();
    if (!duelDoc.exists || duelDoc.data().status !== 'waiting_p1') return;

    const duel = duelDoc.data();
    const p1Roll = Math.floor(Math.random() * 6) + 1;
    const p2Roll = duel.p2Roll;

    let winnerId = null;
    let resolveText = "";

    if (p1Roll > p2Roll) {
        winnerId = duel.p1Id;
        resolveText = `Ganhaste! ${p1Roll} vs ${p2Roll}`;
    } else if (p2Roll > p1Roll) {
        winnerId = duel.p2Id;
        resolveText = `Perdeste... ${p1Roll} vs ${p2Roll}`;
    } else {
        resolveText = `Empate! ${p1Roll} vs ${p2Roll}. O pote será dividido.`;
    }

    await duelRef.update({
        p1Roll: p1Roll,
        status: 'finished',
        winnerId: winnerId,
        resolveText: resolveText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (winnerId === currentCharacter.id) {
        currentCharacter.money += 100;
        await addActivity(currentCharacter.id, `Ganhou um duelo de dados contra ${duel.p2Name}! +€100 🎲`, 'positive');
    } else if (!winnerId) {
        currentCharacter.money += 50;
        await addActivity(currentCharacter.id, `Empatou nos dados contra ${duel.p2Name}. €50 devolvidos.`, 'normal');
    } else {
        await addActivity(currentCharacter.id, `Perdeu nos dados contra ${duel.p2Name}... -€50 🎲`, 'negative');
    }

    await saveCharacter();
    updateUI();
}

function showDiceResults(duel) {
    // Optional additional modal or just notification
    const isWinner = duel.winnerId === currentCharacter.id;
    const isDraw = !duel.winnerId;

    if (duel.status === 'finished' && duel.p1Id === currentCharacter.id) return; // Challenger already saw it in resolve function

    // For P2 who waiting
    if (duel.status === 'finished' && duel.p2Id === currentCharacter.id) {
        if (isWinner) {
            currentCharacter.money += 100;
            saveCharacter();
            updateUI();
        } else if (isDraw) {
            currentCharacter.money += 50;
            saveCharacter();
            updateUI();
        }

        showModal('Resultado dos Dados', `
            <div style="text-align: center;">
                <p>${duel.p1Name} lançou os dados!</p>
                <div style="font-size: 2rem; margin: 1rem;">🎲 ${duel.p1Roll} vs ${duel.p2Roll} 🎲</div>
                <h3 style="color: ${isWinner ? 'gold' : (isDraw ? 'white' : 'red')}">
                    ${isWinner ? 'Ganhaste €100!' : (isDraw ? 'Empate! €50 devolvidos.' : 'Perdeste €50...')}
                </h3>
            </div>
        `, [{ text: 'Continuar', class: 'btn btn-primary', onclick: 'closeModal()' }]);
    }
}
async function rejectRequest(requestId) {
    closeModal();

    const requestDoc = await db.collection('requests').doc(requestId).get();
    if (!requestDoc.exists) return;

    const request = requestDoc.data();

    await db.collection('requests').doc(requestId).update({ status: 'rejected' });
    await addActivity(request.from, `${currentCharacter.name} recusou seu pedido.`, 'negative');

    showNotification('Pedido recusado', 'success');
}

// ============================================
// ADMIN / GOD MODE FUNCTIONS
// ============================================
// ============================================
// SOCIAL INTERACTIONS
// ============================================
window.removeFriend = async function (friendId) {
    if (!currentCharacter || !currentCharacter.friends) return;

    const friend = allPlayers.find(p => p.id === friendId);
    if (!confirm(`Tens a certeza que queres desamigar ${friend?.name || 'este jogador'}?`)) return;

    currentCharacter.friends = currentCharacter.friends.filter(id => id !== friendId);

    // Update other player (soft removal)
    const otherRef = db.collection('characters').doc(friendId);
    const otherDoc = await otherRef.get();
    if (otherDoc.exists) {
        const otherData = otherDoc.data();
        const otherFriends = (otherData.friends || []).filter(id => id !== currentCharacter.id);
        await otherRef.update({ friends: otherFriends });
    }

    await saveCharacter();
    updateUI();
    showNotification('Amizade removida.', 'success');
};

window.openSendMoneyModal = function (toId) {
    const target = allPlayers.find(p => p.id === toId);
    showModal(`Enviar dinheiro para ${target.name}`, `
            <p>Saldo disponível: €${formatMoney(currentCharacter.money || 0)}</p>
            <input type="number" id="sendMoneyAmount" class="form-input" placeholder="Quantia €" min="1">
        `, [
        { text: 'Enviar', class: 'btn btn-primary', onclick: `sendMoney('${toId}')` },
        { text: 'Cancelar', class: 'btn btn-secondary', onclick: 'closeModal()' }
    ]);
};

window.sendMoney = async function (toId) {
    const amount = parseInt(document.getElementById('sendMoneyAmount').value);
    if (isNaN(amount) || amount <= 0) {
        showNotification('Quantia inválida.', 'error');
        return;
    }

    if ((currentCharacter.money || 0) < amount) {
        showNotification('Saldo insuficiente.', 'error');
        return;
    }

    closeModal();
    showLoading('Enviando...');

    currentCharacter.money -= amount;

    await db.collection('characters').doc(toId).update({
        money: firebase.firestore.FieldValue.increment(amount)
    });

    const target = allPlayers.find(p => p.id === toId);
    await addActivity(currentCharacter.id, `Enviou €${formatMoney(amount)} para ${target.name}. 💸`, 'social');
    await addActivity(toId, `Recebeu €${formatMoney(amount)} de ${currentCharacter.name}! 💰`, 'social');

    await saveCharacter();
    hideLoading();
    updateUI();
    showNotification(`Enviou €${formatMoney(amount)} com sucesso!`, 'success');
};

window.requestEmancipation = async function () {
    if (!currentCharacter.family || !currentCharacter.family.parents || currentCharacter.family.parents.length === 0) return;

    if (!confirm("Desejas solicitar o abandono da adoção/emancipação? Isso requer aprovação de todos os envolvidos.")) return;

    const parents = currentCharacter.family.parents;
    for (const parentId of parents) {
        await db.collection('requests').add({
            from: currentCharacter.id,
            fromName: currentCharacter.name,
            to: parentId,
            type: 'emancipation',
            status: 'pending',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    showNotification('Pedido de emancipação enviado aos pais.', 'success');
};

window.adminAddMoney = async function (amount) {
    if (!currentCharacter) return;
    currentCharacter.money = (currentCharacter.money || 0) + amount;
    await saveCharacter();
    updateUI();
    showNotification(`Adicionado €${formatMoney(amount)}!`, 'success');
};

window.adminMaxStats = async function () {
    if (!currentCharacter) return;
    currentCharacter.health = 100;
    currentCharacter.happiness = 100;
    currentCharacter.intelligence = 100;
    currentCharacter.social = 100;
    currentCharacter.fitness = 100;
    await saveCharacter();
    updateUI();
    showNotification('Todos os stats no máximo!', 'success');
};

window.adminResurrect = async function () {
    if (!currentCharacter) return;
    currentCharacter.alive = true;
    currentCharacter.health = 100;
    await saveCharacter();
    updateUI();
    closeModal();
    showNotification('Personagem ressuscitado!', 'success');
};

window.adminSetAge = async function (newAge) {
    if (!currentCharacter) return;
    const age = parseInt(newAge);

    const now = new Date(Date.now() + serverTimeOffset);
    const yearMs = (1000 * 60 * 60 * 24) / (gameSettings.timeSpeed || 1);
    const offsetMs = (age * yearMs) + (yearMs * 0.05); // 5% buffer
    const newBirthDate = new Date(now.getTime() - offsetMs);

    await db.collection('characters').doc(currentCharacter.id).update({
        age: age,
        birthDate: newBirthDate.toISOString()
    });

    showNotification(`Idade alterada para ${newAge} anos!`, 'success');
};

window.adminUnlockAllAchievements = async function () {
    if (!currentCharacter) return;
    const allKeys = Object.keys(ACHIEVEMENTS);
    currentCharacter.achievements = allKeys;
    await saveCharacter();
    updateUI();
    showNotification('Todas as conquistas desbloqueadas!', 'success');
};
// ============================================
// ACTIVITIES & PLAYERS
// ============================================
async function addActivity(characterId, text, type = 'normal') {
    try {
        await db.collection('activities').add({
            characterId,
            text,
            type,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error adding activity:', error);
    }
}

function loadActivities() {
    if (activityListener) activityListener();

    activityListener = db.collection('activities')
        .where('characterId', '==', currentCharacter.id)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            const activities = [];
            snapshot.forEach(doc => {
                activities.push({ id: doc.id, ...doc.data() });
            });
            displayActivities(activities);
        });
}

function displayActivities(activities) {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;

    if (activities.length === 0) {
        feed.innerHTML = '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.5);">Nenhuma atividade ainda</p>';
        return;
    }

    feed.innerHTML = activities.map(activity => {
        const typeClass = activity.type || 'normal';
        const time = activity.timestamp ? new Date(activity.timestamp.toDate()).toLocaleString('pt-PT') : 'Agora';

        return `
            <div class="activity-item ${typeClass}">
                <div class="activity-text">${activity.text}</div>
                <div class="activity-time">${time}</div>
            </div>
        `;
    }).join('');
}

function loadAllPlayers() {
    if (playersListener) playersListener();

    playersListener = db.collection('characters')
        .onSnapshot(snapshot => {
            allPlayers = [];
            snapshot.forEach(doc => {
                allPlayers.push({ id: doc.id, ...doc.data() });
            });

            // Update current tabs
            const activeTab = document.querySelector('.tab.active');
            if (activeTab) {
                const tabName = activeTab.getAttribute('data-tab');
                if (tabName === 'relationships') showRelationshipsTab();
                if (tabName === 'family') showFamilyTab();
                if (tabName === 'social') showSocialTab();
            }
        });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function getLifeStage(age) {
    for (const key in LIFE_STAGES) {
        const stage = LIFE_STAGES[key];
        if (age >= stage.min && age <= stage.max) {
            return stage;
        }
    }
    return LIFE_STAGES.elderly;
}

function getGenderEmoji(gender) {
    const emojis = {
        'male': '👨',
        'female': '👩',
        'non-binary': '🧑',
        'genderfluid': '🌈',
        'transgender-male': '🏳️‍⚧️',
        'transgender-female': '🏳️‍⚧️',
        'agender': '⚪',
        'other': '✨'
    };
    return emojis[gender] || '👤';
}

function getMaritalStatus() {
    const status = currentCharacter.maritalStatus || 'single';
    const statuses = {
        'single': 'Solteiro(a)',
        'dating': 'Namorando',
        'married': 'Casado(a)',
        'divorced': 'Divorciado(a)',
        'widowed': 'Viúvo(a)'
    };
    return statuses[status] || 'Solteiro(a)';
}

function formatMoney(amount) {
    return new Intl.NumberFormat('pt-PT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
}

function canPerformAction(actionType, cost = 0) {
    if (cost > 0 && (currentCharacter.money || 0) < cost) {
        showNotification('Dinheiro insuficiente!', 'error');
        return false;
    }

    if (actionType && isOnCooldown(actionType)) {
        const remaining = getCooldownRemaining(actionType);
        showNotification(`Aguarde ${formatTime(remaining)}`, 'error');
        return false;
    }

    return true;
}

function isOnCooldown(actionType) {
    if (!currentCharacter.cooldowns) return false;
    const cooldownEnd = currentCharacter.cooldowns[actionType];
    if (!cooldownEnd) return false;
    return Date.now() < cooldownEnd;
}

function getCooldownRemaining(actionType) {
    if (!currentCharacter.cooldowns) return 0;
    const cooldownEnd = currentCharacter.cooldowns[actionType];
    if (!cooldownEnd) return 0;
    const remaining = cooldownEnd - Date.now();
    return remaining > 0 ? remaining : 0;
}

function setCooldown(actionType) {
    if (!currentCharacter.cooldowns) currentCharacter.cooldowns = {};
    const duration = COOLDOWNS[actionType] || 0;
    currentCharacter.cooldowns[actionType] = Date.now() + duration;
}

// ============================================
// MODAL & UI HELPERS
// ============================================
function showModal(title, body, buttons = []) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;

    const buttonsContainer = document.getElementById('modalButtons');
    if (buttons.length > 0) {
        buttonsContainer.innerHTML = buttons.map(btn =>
            `<button class="${btn.class}" onclick="${btn.onclick}">${btn.text}</button>`
        ).join('');
    } else {
        buttonsContainer.innerHTML = '';
    }

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
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-title">${type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Aviso'}</div>
        <div class="notification-message">${message}</div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// ============================================
// TAB SYSTEM
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');

            // Update tab buttons
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabName}`).classList.add('active');

            // Load appropriate content
            if (tabName === 'actions') updateActionsTab();
            if (tabName === 'relationships') showRelationshipsTab();
            if (tabName === 'career') showCareerTab();
            if (tabName === 'family') showFamilyTab();
            if (tabName === 'social') showSocialTab();
        });
    });
});

// Check for requests periodically
setInterval(() => {
    if (currentCharacter && currentCharacter.alive) {
        checkRequests();
    }
}, 30000); // Every 30 seconds

// Animations for slideInRight and slideOutRight
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    .action-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: rgba(255,255,255,0.2);
    }
    
    .action-btn.disabled:hover {
        border-color: rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.02);
        transform: none;
    }
    
    .action-req {
        color: var(--accent);
        font-size: 0.8rem;
        margin-top: 0.3rem;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// ============================================
// MODALS FOR CAREER & EDUCATION
// ============================================
function showEducationMenu() {
    const age = currentCharacter.age;
    const currentEdu = currentCharacter.education || 'none';

    // Se estiver a estudar na universidade, mostrar progresso
    if (currentCharacter.currentCourse) {
        const course = UNIVERSITY_COURSES[currentCharacter.currentCourse];
        const yearsRemaining = currentCharacter.graduationAge - currentCharacter.age;

        if (yearsRemaining <= 0) {
            showModal('Formatura!', `
                <div style="text-align:center;">
                    <div style="font-size:4rem; margin-bottom:1rem;">🎓</div>
                    <p>Parabéns! Você concluiu a sua Licenciatura em <strong>${course.label}</strong>!</p>
                </div>
            `, [
                { text: 'Celebrar!', class: 'btn btn-primary', onclick: 'completeUniversity()' }
            ]);
        } else {
            showModal('Frequência Universitária', `
                <div style="text-align:center;">
                    <div style="font-size:3rem; margin-bottom:1rem;">🏫</div>
                    <p>A frequentar: <strong>${course.label}</strong></p>
                    <p>Faltam <strong>${yearsRemaining}</strong> anos para a graduação.</p>
                </div>
            `, [
                { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
            ]);
        }
        return;
    }

    const eduList = Object.keys(EDUCATION).map(key => {
        if (key === 'none' || key === 'bachelor' || key === 'elementary' || key === 'middle' || key === 'high') return '';
        const edu = EDUCATION[key];

        const canAfford = (currentCharacter.money || 0) >= edu.cost;
        const rightAge = age >= edu.minAge;
        const notCompleted = currentEdu !== key;
        const hasPrerequisite = checkEducationPrerequisite(key, currentEdu);

        const enabled = rightAge && hasPrerequisite && notCompleted;
        const reason = !rightAge ? 'Min: ' + edu.minAge + ' anos' :
            !hasPrerequisite ? 'Requer diploma anterior' :
                !canAfford ? 'Sem dinheiro' : '';

        const onclick = (enabled && canAfford) ? `confirmStartEducation('${key}')` : '';
        const btnClass = enabled ? '' : 'disabled';
        const status = (!enabled || !canAfford) ?
            `<div class="shop-owned" style="color:var(--accent);">${reason || 'Indisponível'}</div>` :
            '<button class="btn btn-primary">Matricular</button>';

        return `
            <div class="shop-item ${btnClass}" onclick="${onclick}">
                <div class="shop-icon">🎓</div>
                <div class="shop-info">
                    <div class="shop-name">${edu.label}</div>
                    <div class="shop-desc">+${edu.intelligence} Int | ${edu.duration} anos</div>
                    <div class="shop-price">€${formatMoney(edu.cost)}</div>
                </div>
                ${status}
            </div>
        `;
    }).join('');

    // University Courses section if high school is completed
    let uniList = '';
    if (currentCharacter.education === 'high') {
        const ALL_UNIVERSITY_COURSES = {
            ...UNIVERSITY_COURSES,
            gestao: { label: 'Gestão de Empresas', area: 'all', duration: 3, cost: 697 }
        };

        uniList = '<h3 style="margin: 1.5rem 0 1rem;">Cursos Universitários (Licenciatura)</h3>';
        uniList += Object.keys(ALL_UNIVERSITY_COURSES).map(key => {
            const course = ALL_UNIVERSITY_COURSES[key];
            const areaMatch = (course.area === 'all' || currentCharacter.educationArea === course.area);
            const canAfford = (currentCharacter.money || 0) >= course.cost;

            const onclick = (areaMatch && canAfford) ? `startUniversity('${key}')` : '';
            const btnClass = (areaMatch && canAfford) ? '' : 'disabled';
            const reason = !areaMatch ? `Requer Secundário em ${getAreaName(course.area)}` : (!canAfford ? 'Dinheiro insuficiente' : '');

            return `
                <div class="shop-item ${btnClass}" onclick="${onclick}">
                    <div class="shop-icon">🏛️</div>
                    <div class="shop-info">
                        <div class="shop-name">${course.label}</div>
                        <div class="shop-desc">Duração: ${course.duration} anos | ⚠️ ${reason || 'Elegível'}</div>
                        <div class="shop-price">Propinas: €${formatMoney(course.cost)}/ano</div>
                    </div>
                    ${(areaMatch && canAfford) ? '<button class="btn btn-primary">Candidatar-se</button>' : ''}
                </div>
            `;
        }).join('');
    }

    showModal('Instituições de Ensino',
        '<p style="margin-bottom: 1.5rem;">Cancele o seu futuro!</p>' + eduList + uniList,
        [
            { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
        ]
    );
}

function getAreaName(areaId) {
    const names = { 'ct': 'Ciências', 'av': 'Artes', 'lh': 'Humanidades', 'se': 'Economia' };
    return names[areaId] || areaId;
}

async function startUniversity(courseKey) {
    const course = UNIVERSITY_COURSES[courseKey];
    if ((currentCharacter.money || 0) < course.cost) {
        showNotification('Dinheiro insuficiente para a primeira propina!', 'error');
        return;
    }

    closeModal();
    currentCharacter.money -= course.cost;
    currentCharacter.currentCourse = courseKey;
    currentCharacter.graduationAge = currentCharacter.age + course.duration;

    await addActivity(currentCharacter.id, `Entrou na Universidade em ${course.label}! 🏛️`, 'important');
    await saveCharacter();
    updateUI();
    showNotification(`Matriculado em ${course.label}!`, 'success');
}

async function completeUniversity() {
    const course = UNIVERSITY_COURSES[currentCharacter.currentCourse];
    currentCharacter.education = 'bachelor';
    currentCharacter.major = currentCharacter.currentCourse;
    currentCharacter.currentCourse = null;
    currentCharacter.intelligence = Math.min(100, (currentCharacter.intelligence || 50) + 20);

    closeModal();
    await unlockAchievement('graduated');
    await addActivity(currentCharacter.id, `Licenciou-se em ${course.label}! 🎓`, 'important');
    await saveCharacter();
    updateUI();
}

function confirmStartEducation(key) {
    closeModal();
    startEducation(key);
}

function showJobsMenu() {
    const currentEdu = currentCharacter.education || 'none';

    const jobsList = Object.keys(CAREERS).map(key => {
        if (key === 'unemployed') return '';
        const career = CAREERS[key];

        const hasEducation = checkCareerEducation(career.education, currentEdu);
        const hasIntelligence = (currentCharacter.intelligence || 0) >= career.intelligence;
        const hasSocial = !career.social || (currentCharacter.social || 0) >= career.social;
        const hasFitness = !career.fitness || (currentCharacter.fitness || 0) >= career.fitness;

        const enabled = hasEducation && hasIntelligence && hasSocial && hasFitness;

        let reqs = [];
        if (!hasEducation) reqs.push('Requer: ' + (EDUCATION[career.education] ? EDUCATION[career.education].label : career.education));
        if (!hasIntelligence) reqs.push('Int: ' + career.intelligence);
        if (!hasSocial && career.social) reqs.push('Soc: ' + career.social);
        if (!hasFitness && career.fitness) reqs.push('Fit: ' + career.fitness);

        const onclick = enabled ? "confirmApplyJob('" + key + "')" : '';
        const btnClass = enabled ? '' : 'disabled';
        const status = !enabled ?
            '<div class="shop-owned" style="color:var(--accent);">Requisitos não atendidos</div>' :
            '<button class="btn btn-primary">Candidatar-se</button>';

        return '<div class="shop-item ' + btnClass + '" onclick="' + onclick + '">' +
            '<div class="shop-icon">💼</div>' +
            '<div class="shop-info">' +
            '<div class="shop-name">' + career.label + '</div>' +
            '<div class="shop-desc">€' + career.salary + '/mês</div>' +
            '<div class="shop-price" style="font-size:0.8rem; color: #fff;">' + (reqs.length ? reqs.join(', ') : 'Qualificado') + '</div>' +
            '</div>' +
            status +
            '</div>';
    }).join('');

    showModal('Agência de Empregos',
        '<p style="margin-bottom: 1.5rem;">Encontre sua vocação!</p>' + jobsList,
        [
            { text: 'Fechar', class: 'btn btn-secondary', onclick: 'closeModal()' }
        ]
    );
}

function confirmApplyJob(key) {
    closeModal();
    applyForJob(key);
}

// ============================================
// MOBILE NAVIGATION
// ============================================
function switchMobileTab(tabName) {
    // 1. Update Buttons
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // Find button with matching onclick
    const buttons = document.querySelectorAll('.nav-item');
    // Simple index mapping: 0=stats, 1=main, 2=events
    // A better way is to pass 'this' and toggle, but this works based on fixed order
    if (tabName === 'stats' && buttons[0]) buttons[0].classList.add('active');
    if (tabName === 'main' && buttons[1]) buttons[1].classList.add('active');
    if (tabName === 'events' && buttons[2]) buttons[2].classList.add('active');

    // 2. Manage Classes
    const statsPanel = document.getElementById('panel-stats');
    const mainPanel = document.getElementById('panel-main');
    const eventsPanel = document.getElementById('panel-events');

    if (statsPanel) statsPanel.classList.remove('mobile-active');
    if (mainPanel) mainPanel.classList.remove('mobile-active');
    if (eventsPanel) eventsPanel.classList.remove('mobile-active');

    // 3. Show selected panel
    if (tabName === 'stats' && statsPanel) statsPanel.classList.add('mobile-active');
    if (tabName === 'main' && mainPanel) mainPanel.classList.add('mobile-active');
    if (tabName === 'events' && eventsPanel) eventsPanel.classList.add('mobile-active');
}

// Initialize mobile view
window.addEventListener('resize', checkMobileView);
// Also run on load
window.addEventListener('load', () => {
    checkMobileView();
    if (window.innerWidth <= 768) {
        switchMobileTab('main');
    }
});

function checkMobileView() {
    if (window.innerWidth <= 768) {
        // Ensure one tab is active if none are
        const active = document.querySelector('.mobile-active');
        if (!active) {
            switchMobileTab('main');
        }
    } else {
        // Reset classes for desktop
        const panels = ['panel-stats', 'panel-main', 'panel-events'];
        panels.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('mobile-active');
        });
    }
}