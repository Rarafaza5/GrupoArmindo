/* ============================================
   CONTA GRUPO ARMINDO - SDK de Autenticação Unificada
   © 2026 Grupo Armindo. Todos os direitos reservados.
   ============================================
   
   Este SDK fornece autenticação centralizada para todos os
   projetos do Grupo Armindo. Um registo dá acesso a tudo.
   
   Uso:
   1. Incluir Firebase SDK antes deste script
   2. Chamar ArmindoAccount.init() após página carregar
   3. Usar ArmindoAccount.signIn/signUp para autenticação
   ============================================ */

const ArmindoAccount = (function () {
    // Firebase configuration (shared across all Grupo Armindo projects)
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

    // Internal state
    let _app = null;
    let _auth = null;
    let _db = null;
    let _currentUser = null;
    let _userProfile = null;
    let _authStateListeners = [];
    let _initialized = false;

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        if (_initialized) {
            console.log('✅ Armindo Account já inicializado');
            return Promise.resolve(true);
        }

        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK não carregado. Inclua o Firebase antes de armindo-account.js');
            return Promise.resolve(false);
        }

        try {
            // Initialize Firebase only if not already initialized
            if (!firebase.apps.length) {
                _app = firebase.initializeApp(firebaseConfig);
            } else {
                _app = firebase.app();
            }

            _auth = firebase.auth();
            _db = firebase.firestore();

            // Setup auth state listener
            _auth.onAuthStateChanged(async (user) => {
                _currentUser = user;

                if (user) {
                    // Load user profile from Firestore
                    await _loadUserProfile(user.uid);
                } else {
                    _userProfile = null;
                }

                // Notify all listeners
                _authStateListeners.forEach(callback => callback(user, _userProfile));
            });

            _initialized = true;
            console.log('✅ Conta Grupo Armindo inicializada');
            return Promise.resolve(true);

        } catch (error) {
            console.error('❌ Erro ao inicializar Conta Grupo Armindo:', error);
            return Promise.resolve(false);
        }
    }

    // ============================================
    // USER PROFILE MANAGEMENT
    // ============================================

    async function _loadUserProfile(userId) {
        try {
            const doc = await _db.collection('users').doc(userId).get();

            if (doc.exists) {
                _userProfile = { id: doc.id, ...doc.data() };

                // Update last login
                await _db.collection('users').doc(userId).update({
                    'profile.lastLogin': firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                _userProfile = null;
            }

            return _userProfile;
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            _userProfile = null;
            return null;
        }
    }

    async function _createUserProfile(userId, profileData) {
        const userDoc = {
            profile: {
                displayName: profileData.displayName || '',
                email: profileData.email || '',
                avatar: profileData.avatar || null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            },
            projects: {}
        };

        await _db.collection('users').doc(userId).set(userDoc);
        _userProfile = { id: userId, ...userDoc };
        return _userProfile;
    }

    // ============================================
    // AUTHENTICATION METHODS
    // ============================================

    /**
     * Sign in with email and password
     */
    async function signIn(email, password) {
        if (!_initialized) throw new Error('SDK não inicializado. Chame init() primeiro.');

        console.log('🔐 Tentativa de login:', email);
        try {
            const result = await _auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('❌ Erro no signInWithEmailAndPassword:', error);
            return {
                success: false,
                error: _getErrorMessage(error.code),
                code: error.code,
                detail: error.message
            };
        }
    }

    /**
     * Sign up with email, password and profile info
     */
    async function signUp(email, password, displayName) {
        if (!_initialized) throw new Error('SDK não inicializado. Chame init() primeiro.');

        console.log('📝 Tentativa de registo:', email, displayName);
        try {
            // Create Firebase Auth user
            const result = await _auth.createUserWithEmailAndPassword(email, password);

            // Update display name in Auth
            await result.user.updateProfile({ displayName });

            // Create user profile in Firestore
            await _createUserProfile(result.user.uid, {
                displayName,
                email
            });

            return { success: true, user: result.user, profile: _userProfile };
        } catch (error) {
            console.error('❌ Erro no createUserWithEmailAndPassword:', error);
            return {
                success: false,
                error: _getErrorMessage(error.code),
                code: error.code,
                detail: error.message
            };
        }
    }

    /**
     * Sign in with Google
     */
    async function signInWithGoogle() {
        if (!_initialized) throw new Error('SDK não inicializado. Chame init() primeiro.');

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await _auth.signInWithPopup(provider);

            // Check if user profile exists, create if not
            const existingProfile = await _loadUserProfile(result.user.uid);

            if (!existingProfile) {
                await _createUserProfile(result.user.uid, {
                    displayName: result.user.displayName || '',
                    email: result.user.email || '',
                    avatar: result.user.photoURL || null
                });
            }

            return { success: true, user: result.user, profile: _userProfile };
        } catch (error) {
            return {
                success: false,
                error: _getErrorMessage(error.code),
                code: error.code
            };
        }
    }

    /**
     * Sign out
     */
    async function signOut() {
        if (!_initialized) throw new Error('SDK não inicializado. Chame init() primeiro.');

        try {
            await _auth.signOut();
            _currentUser = null;
            _userProfile = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send password reset email
     */
    async function sendPasswordReset(email) {
        if (!_initialized) throw new Error('SDK não inicializado. Chame init() primeiro.');

        try {
            await _auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: _getErrorMessage(error.code),
                code: error.code
            };
        }
    }

    // ============================================
    // PROFILE & PROJECT DATA
    // ============================================

    /**
     * Get current user
     */
    function getCurrentUser() {
        return _currentUser;
    }

    /**
     * Get user profile
     */
    function getProfile() {
        return _userProfile;
    }

    /**
     * Update user profile
     */
    async function updateProfile(updates) {
        if (!_currentUser) throw new Error('Utilizador não autenticado');

        try {
            const profileUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                profileUpdates[`profile.${key}`] = value;
            }

            await _db.collection('users').doc(_currentUser.uid).update(profileUpdates);

            // Reload profile
            await _loadUserProfile(_currentUser.uid);

            return { success: true, profile: _userProfile };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get project-specific data
     */
    async function getProjectData(projectId) {
        if (!_currentUser || !_userProfile) return null;

        return _userProfile.projects?.[projectId] || null;
    }

    /**
     * Set project-specific data
     */
    async function setProjectData(projectId, data) {
        if (!_currentUser) throw new Error('Utilizador não autenticado');

        try {
            const updateData = {};
            updateData[`projects.${projectId}`] = {
                ...data,
                lastAccess: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Set firstAccess if it's the first time
            const existing = await getProjectData(projectId);
            if (!existing) {
                updateData[`projects.${projectId}`].firstAccess = firebase.firestore.FieldValue.serverTimestamp();
            }

            await _db.collection('users').doc(_currentUser.uid).update(updateData);

            // Reload profile
            await _loadUserProfile(_currentUser.uid);

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if user has configured a specific project
     */
    async function hasProjectSetup(projectId) {
        const data = await getProjectData(projectId);
        return data !== null && Object.keys(data).length > 0;
    }

    // ============================================
    // AUTH STATE LISTENERS
    // ============================================

    /**
     * Add auth state change listener
     */
    function onAuthStateChanged(callback) {
        _authStateListeners.push(callback);

        // Immediately call with current state
        if (_initialized) {
            callback(_currentUser, _userProfile);
        }

        // Return unsubscribe function
        return () => {
            const index = _authStateListeners.indexOf(callback);
            if (index > -1) {
                _authStateListeners.splice(index, 1);
            }
        };
    }

    // ============================================
    // UTILITIES
    // ============================================

    function _getErrorMessage(code) {
        const messages = {
            'auth/email-already-in-use': 'Este email já está registado',
            'auth/invalid-email': 'Email inválido',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
            'auth/user-not-found': 'Conta não encontrada',
            'auth/wrong-password': 'Senha incorreta',
            'auth/too-many-requests': 'Demasiadas tentativas. Tente novamente mais tarde.',
            'auth/network-request-failed': 'Erro de conexão. Verifique a internet.',
            'auth/popup-closed-by-user': 'Login cancelado',
            'auth/user-disabled': 'Esta conta foi desativada',
            'auth/operation-not-allowed': 'Este método de login não está ativado. Contacte o administrador.',
            'auth/key-violated': 'Chave de API inválida ou restrita.',
            'auth/unauthorized-domain': 'Este domínio não está autorizado para autenticação.'
        };
        return messages[code] || `Erro de autenticação (${code})`;
    }

    /**
     * Check if SDK is initialized
     */
    function isInitialized() {
        return _initialized;
    }

    /**
     * Get Firestore reference (for advanced use)
     */
    function getFirestore() {
        return _db;
    }

    /**
     * Get Auth reference (for advanced use)
     */
    function getAuth() {
        return _auth;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    return {
        // Initialization
        init,
        isInitialized,

        // Authentication
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        sendPasswordReset,

        // User data
        getCurrentUser,
        getProfile,
        updateProfile,

        // Project-specific data
        getProjectData,
        setProjectData,
        hasProjectSetup,

        // Listeners
        onAuthStateChanged,

        // Advanced
        getFirestore,
        getAuth
    };
})();

// Auto-export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArmindoAccount;
}
