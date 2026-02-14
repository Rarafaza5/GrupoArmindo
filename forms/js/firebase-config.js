/* ============================================
   ARMINDO FORMS - Firebase Configuration
   ============================================
   Integrado com Conta Grupo Armindo
   © 2026 Grupo Armindo. Todos os direitos reservados.
   ============================================ */

// Firebase config (shared with Conta Grupo Armindo)
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

// Initialize Firebase (will be called after SDK loads)
let app, auth, db, storage;

// Flag to track if unified account is available
let _useUnifiedAccount = false;

function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded');
        return false;
    }

    try {
        // Check if ArmindoAccount SDK is available
        if (typeof ArmindoAccount !== 'undefined') {
            _useUnifiedAccount = true;
            ArmindoAccount.init();
            auth = ArmindoAccount.getAuth();
            db = ArmindoAccount.getFirestore();
            console.log('✅ Firebase inicializado via Conta Grupo Armindo');
        } else {
            // Fallback: Initialize Firebase directly
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            auth = firebase.auth();
            db = firebase.firestore();
            console.log('✅ Firebase initialized (standalone mode)');
        }

        if (firebase.storage) {
            storage = firebase.storage();
        }

        // Enable offline persistence (only on fresh init)
        if (!firebase.apps.length) {
            db.enablePersistence({ synchronizeTabs: true })
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence enabled in first tab only');
                    } else if (err.code === 'unimplemented') {
                        console.warn('Browser does not support persistence');
                    }
                });
        }

        return true;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        return false;
    }
}

// Helper to ensure unified profile exists when user logs in
async function _ensureUnifiedProfile(user) {
    if (!_useUnifiedAccount || !user) return;

    try {
        // Check if project data exists for forms
        const hasSetup = await ArmindoAccount.hasProjectSetup('forms');
        if (!hasSetup) {
            await ArmindoAccount.setProjectData('forms', {
                registered: true
            });
            console.log('✅ Projeto Forms configurado na Conta Grupo Armindo');
        }
    } catch (error) {
        console.warn('Aviso: Não foi possível configurar perfil unificado:', error);
    }
}

// ============================================
// Database Helper Functions
// ============================================

const Database = {
    // Forms Collection
    forms: {
        async create(formData) {
            const docRef = await db.collection('forms').add({
                ...formData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                responseCount: 0
            });
            return docRef.id;
        },

        async get(formId) {
            const doc = await db.collection('forms').doc(formId).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        },

        async update(formId, updates) {
            await db.collection('forms').doc(formId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },

        async delete(formId) {
            // Delete all responses first
            const responses = await db.collection('responses')
                .where('formId', '==', formId)
                .get();

            const batch = db.batch();
            responses.docs.forEach(doc => batch.delete(doc.ref));
            batch.delete(db.collection('forms').doc(formId));

            await batch.commit();
        },

        async getByUser(userId) {
            const snapshot = await db.collection('forms')
                .where('creatorId', '==', userId)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async getByCollaborator(email) {
            if (!email) return [];
            const snapshot = await db.collection('forms')
                .where('collaborators', 'array-contains', email)
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async getPublic(formId) {
            const doc = await db.collection('forms').doc(formId).get();
            if (!doc.exists) return null;

            const data = doc.data();
            if (data.status !== 'active') return null;

            // Check date restrictions
            const now = new Date();
            if (data.settings?.startDate && new Date(data.settings.startDate) > now) return null;
            if (data.settings?.endDate && new Date(data.settings.endDate) < now) return null;

            // Check max responses
            if (data.settings?.maxResponses && data.responseCount >= data.settings.maxResponses) return null;

            return { id: doc.id, ...data };
        }
    },

    // Responses Collection
    responses: {
        async submit(formId, answers, metadata = {}) {
            const batch = db.batch();

            // Create response
            const responseRef = db.collection('responses').doc();
            batch.set(responseRef, {
                formId,
                answers,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                respondentId: auth.currentUser?.uid || null,
                metadata
            });

            // Increment response count
            const formRef = db.collection('forms').doc(formId);
            batch.update(formRef, {
                responseCount: firebase.firestore.FieldValue.increment(1)
            });

            await batch.commit();
            return responseRef.id;
        },

        async getByForm(formId) {
            const snapshot = await db.collection('responses')
                .where('formId', '==', formId)
                .orderBy('submittedAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async delete(responseId) {
            const doc = await db.collection('responses').doc(responseId).get();
            if (!doc.exists) return;

            const formId = doc.data().formId;
            const batch = db.batch();

            batch.delete(doc.ref);
            batch.update(db.collection('forms').doc(formId), {
                responseCount: firebase.firestore.FieldValue.increment(-1)
            });

            await batch.commit();
        },

        async checkDuplicate(formId, userId) {
            if (!userId) return false;

            const snapshot = await db.collection('responses')
                .where('formId', '==', formId)
                .where('respondentId', '==', userId)
                .limit(1)
                .get();

            return !snapshot.empty;
        }
    },

    // Templates Collection
    templates: {
        async getAll() {
            const snapshot = await db.collection('templates')
                .orderBy('order', 'asc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        },

        async get(templateId) {
            const doc = await db.collection('templates').doc(templateId).get();
            if (!doc.exists) return null;
            return { id: doc.id, ...doc.data() };
        }
    }
};

// ============================================
// Authentication Helper Functions
// ============================================

const Auth = {
    async signInWithGoogle() {
        let user;

        // Use unified account if available
        if (_useUnifiedAccount) {
            const result = await ArmindoAccount.signInWithGoogle();
            if (!result.success) throw new Error(result.error);
            user = result.user;
        } else {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            user = result.user;
        }

        await _ensureUnifiedProfile(user);
        return user;
    },

    async signInWithEmail(email, password) {
        let user;

        if (_useUnifiedAccount) {
            const result = await ArmindoAccount.signIn(email, password);
            if (!result.success) throw new Error(result.error);
            user = result.user;
        } else {
            const result = await auth.signInWithEmailAndPassword(email, password);
            user = result.user;
        }

        await _ensureUnifiedProfile(user);
        return user;
    },

    async signUpWithEmail(email, password, displayName) {
        let user;

        if (_useUnifiedAccount) {
            const result = await ArmindoAccount.signUp(email, password, displayName);
            if (!result.success) throw new Error(result.error);
            user = result.user;

            // Set project data for Forms
            await ArmindoAccount.setProjectData('forms', { registered: true });
        } else {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            await result.user.updateProfile({ displayName });
            user = result.user;
        }

        return user;
    },

    async signOut() {
        if (_useUnifiedAccount) {
            await ArmindoAccount.signOut();
        } else {
            await auth.signOut();
        }
    },

    async sendPasswordReset(email) {
        if (_useUnifiedAccount) {
            const result = await ArmindoAccount.sendPasswordReset(email);
            if (!result.success) throw new Error(result.error);
        } else {
            await auth.sendPasswordResetEmail(email);
        }
    },

    getCurrentUser() {
        if (_useUnifiedAccount) {
            return ArmindoAccount.getCurrentUser();
        }
        return auth.currentUser;
    },

    onAuthStateChanged(callback) {
        if (_useUnifiedAccount) {
            return ArmindoAccount.onAuthStateChanged((user, profile) => {
                callback(user);
            });
        }
        return auth.onAuthStateChanged(callback);
    }
};


// ============================================
// Utility Functions
// ============================================

const Utils = {
    // Generate unique ID
    generateId() {
        return 'q_' + Math.random().toString(36).substr(2, 9);
    },

    // Format date
    formatDate(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Format relative time
    formatRelativeTime(timestamp) {
        if (!timestamp) return '-';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Agora mesmo';
        if (minutes < 60) return `Há ${minutes} min`;
        if (hours < 24) return `Há ${hours}h`;
        if (days < 7) return `Há ${days} dias`;

        return Utils.formatDate(timestamp);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Download as CSV
    downloadCSV(data, filename) {
        const csv = Utils.arrayToCSV(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    },

    // Array to CSV
    arrayToCSV(data) {
        if (!data.length) return '';
        const headers = Object.keys(data[0]);
        const rows = data.map(row =>
            headers.map(header => {
                let cell = row[header] ?? '';
                if (Array.isArray(cell)) cell = cell.join(', ');
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                    cell = `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        );
        return [headers.join(','), ...rows].join('\n');
    },

    // Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy:', err);
            return false;
        }
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || (() => {
            const el = document.createElement('div');
            el.className = 'toast-container';
            document.body.appendChild(el);
            return el;
        })();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // Get URL parameter
    getUrlParam(param) {
        const params = new URLSearchParams(window.location.search);
        return params.get(param);
    }
};

// Question type definitions
const QuestionTypes = {
    short_text: {
        name: 'Texto Curto',
        icon: '✏️',
        defaultOptions: {}
    },
    long_text: {
        name: 'Texto Longo',
        icon: '📝',
        defaultOptions: { maxLength: 1000 }
    },
    single_choice: {
        name: 'Escolha Única',
        icon: '⭕',
        defaultOptions: { options: ['Opção 1', 'Opção 2', 'Opção 3'] }
    },
    multiple_choice: {
        name: 'Escolha Múltipla',
        icon: '☑️',
        defaultOptions: { options: ['Opção 1', 'Opção 2', 'Opção 3'] }
    },
    dropdown: {
        name: 'Lista Suspensa',
        icon: '📋',
        defaultOptions: { options: ['Opção 1', 'Opção 2', 'Opção 3'] }
    },
    rating: {
        name: 'Classificação',
        icon: '⭐',
        defaultOptions: { max: 5 }
    },
    nps: {
        name: 'Net Promoter Score',
        icon: '📊',
        defaultOptions: { min: 0, max: 10 }
    },
    matrix: {
        name: 'Matriz / Grelha',
        icon: '📋',
        defaultOptions: {
            rows: ['Aspeto 1', 'Aspeto 2', 'Aspeto 3'],
            columns: ['Muito Insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito Satisfeito']
        }
    },
    date: {
        name: 'Data',
        icon: '📅',
        defaultOptions: {}
    },
    time: {
        name: 'Hora',
        icon: '⏰',
        defaultOptions: {}
    },
    email: {
        name: 'Email',
        icon: '📧',
        defaultOptions: {}
    },
    phone: {
        name: 'Telefone',
        icon: '📱',
        defaultOptions: {}
    },
    number: {
        name: 'Número',
        icon: '🔢',
        defaultOptions: { min: null, max: null }
    },
    scale: {
        name: 'Escala Linear',
        icon: '📏',
        defaultOptions: { min: 1, max: 10, minLabel: 'Mínimo', maxLabel: 'Máximo' }
    },
    file_upload: {
        name: 'Upload de Ficheiro',
        icon: '📎',
        defaultOptions: { maxSize: 5, allowedTypes: ['image/*', 'application/pdf'] }
    }
};

// Theme presets
const ThemePresets = {
    default: {
        name: 'Padrão',
        primaryColor: '#4A5FE5',
        accentColor: '#8B5CF6',
        backgroundColor: '#0f0f1a',
        textColor: '#ffffff',
        borderRadius: '16'
    },
    ocean: {
        name: 'Oceano',
        primaryColor: '#0EA5E9',
        accentColor: '#06B6D4',
        backgroundColor: '#0c1929',
        textColor: '#ffffff',
        borderRadius: '12'
    },
    forest: {
        name: 'Floresta',
        primaryColor: '#10B981',
        accentColor: '#34D399',
        backgroundColor: '#0d1f17',
        textColor: '#ffffff',
        borderRadius: '16'
    },
    sunset: {
        name: 'Pôr do Sol',
        primaryColor: '#F59E0B',
        accentColor: '#EF4444',
        backgroundColor: '#1a1412',
        textColor: '#ffffff',
        borderRadius: '20'
    },
    rose: {
        name: 'Rosa',
        primaryColor: '#EC4899',
        accentColor: '#F472B6',
        backgroundColor: '#1a0f14',
        textColor: '#ffffff',
        borderRadius: '24'
    },
    minimal: {
        name: 'Minimal (Claro)',
        primaryColor: '#1F2937',
        accentColor: '#4B5563',
        backgroundColor: '#ffffff',
        textColor: '#1F2937',
        borderRadius: '8'
    }
};

// Default form template
const DefaultForm = {
    title: 'Formulário sem título',
    description: '',
    status: 'draft',
    theme: {
        preset: 'default',
        primaryColor: '#4A5FE5',
        accentColor: '#8B5CF6',
        backgroundColor: '#0f0f1a',
        textColor: '#ffffff',
        fontFamily: 'Inter',
        borderRadius: '16',
        showLogo: false,
        customLogo: null,
        customBrandName: ''
    },
    settings: {
        requireLogin: false,
        allowMultipleResponses: false,
        showProgressBar: true,
        shuffleQuestions: false,
        confirmationMessage: 'Obrigado pela sua resposta! 🎉',
        redirectUrl: null,
        startDate: null,
        endDate: null,
        maxResponses: null,
        showPoweredBy: true
    },
    questions: []
};

// Export for use in other files
window.ArmindoForms = {
    initFirebase,
    Database,
    Auth,
    Utils,
    QuestionTypes,
    ThemePresets,
    DefaultForm
};
