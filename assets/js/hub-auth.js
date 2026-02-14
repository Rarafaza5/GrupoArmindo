/* =========================================
   HUB AUTH - UI Bridge for Armindo Account
   © 2026 Grupo Armindo
   ========================================= */

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for ArmindoAccount to be available
    if (typeof ArmindoAccount === 'undefined') {
        console.warn('ArmindoAccount SDK not loaded. Auth UI disabled.');
        return;
    }

    try {
        // Inject Auth Modal
        injectAuthModal();

        // Initialize SDK
        await ArmindoAccount.init();

        // Listen for auth changes
        ArmindoAccount.onAuthStateChanged((user, profile) => {
            updateNavbar(user, profile);
        });

        // Setup Mobile Menu Toggle (if not already handled by hub-interactions.js)
        setupMobileMenu();

    } catch (e) {
        console.error("Auth Init Error:", e);
    }
});

/* =========================================
   NAVIGATION & UI UPDATES
   ========================================= */
function updateNavbar(user, profile) {
    const navLinks = document.querySelector('.nav-links');
    const mobileMenu = document.querySelector('.mobile-menu');

    const navigationItems = `
        <a href="/sobre.html" class="nav-link">Sobre</a>
        <a href="/contato.html" class="nav-link">Contacto</a>
        <a href="/membros.html" class="nav-link">Membros</a>
    `;

    // Auth Buttons
    let authButtons = '';
    if (user) {
        // Logged In
        const displayName = profile?.profile?.displayName || user.displayName || user.email.split('@')[0];

        // Shorten name if too long
        const shortName = displayName.length > 15 ? displayName.substring(0, 12) + '...' : displayName;

        authButtons = `
            <div class="auth-btn-group" style="display: flex; gap: 8px; align-items: center; margin-left: 8px;">
                <a href="/perfil.html" class="nav-link" style="color: var(--accent-secondary); font-weight: 600; border: none;">
                    ${shortName}
                </a>
                <button onclick="handleLogout()" class="nav-link" title="Sair">
                    Sair
                </button>
            </div>
        `;
    } else {
        // Logged Out
        authButtons = `
            <div class="auth-btn-group" style="display: flex; gap: 8px; align-items: center; margin-left: 8px;">
                 <button onclick="openAuthModal('login')" class="nav-link" style="cursor:pointer; font-weight: 600;">
                    Entrar
                </button>
            </div>
        `;
    }

    // Update Desktop Nav
    if (navLinks) {
        navLinks.innerHTML = navigationItems + authButtons;
    }

    // Update Mobile Menu
    if (mobileMenu) {
        // Mobile menu usually stacks items
        mobileMenu.innerHTML = navigationItems.replace(/class="nav-link"/g, 'class="mobile-link"') + authButtons;
    }
}

function setupMobileMenu() {
    const toggle = document.querySelector('.mobile-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (toggle && mobileMenu) {
        // Remove old event listeners if any (cloning trick)
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);

        newToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            const isActive = mobileMenu.classList.contains('active');
            newToggle.innerHTML = isActive
                ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
                : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>';
        });
    }
}


/* =========================================
   AUTH MODAL LOGIC
   ========================================= */
function injectAuthModal() {
    if (document.getElementById('authModal')) return;

    const modalHTML = `
    <div id="authModal" class="auth-modal">
        <div class="auth-panel">
            <button class="auth-close" onclick="closeAuthModal()">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div style="text-align: center; margin-bottom: 24px;">
                <h2 class="brand-font" style="color: white; margin-bottom: 8px;">Grupo Armindo</h2>
                <p style="color: var(--text-muted); font-size: 0.9rem;">Acesse a sua conta universal</p>
            </div>

            <div class="auth-tabs">
                <button class="auth-tab active" onclick="switchAuthTab('login')" id="tabLogin">Entrar</button>
                <button class="auth-tab" onclick="switchAuthTab('register')" id="tabRegister">Registar</button>
            </div>

            <!-- LOGIN FORM -->
            <form id="loginForm" onsubmit="handleEmailLogin(event)">
                <div class="auth-form-group">
                    <label class="auth-label">Email</label>
                    <input type="email" class="auth-input" id="loginEmail" required placeholder="seu@email.com">
                </div>
                <div class="auth-form-group">
                    <label class="auth-label">Senha</label>
                    <input type="password" class="auth-input" id="loginPassword" required placeholder="••••••••">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Entrar</button>
                <div id="loginError" style="color: var(--accent-tertiary); font-size: 0.85rem; margin-top: 12px; text-align: center; display: none;"></div>
            </form>

            <!-- REGISTER FORM -->
            <form id="registerForm" onsubmit="handleEmailSignup(event)" style="display: none;">
                <div class="auth-form-group">
                    <label class="auth-label">Nome de Exibição</label>
                    <input type="text" class="auth-input" id="regName" required placeholder="Como quer ser chamado?">
                </div>
                <div class="auth-form-group">
                    <label class="auth-label">Email</label>
                    <input type="email" class="auth-input" id="regEmail" required placeholder="seu@email.com">
                </div>
                <div class="auth-form-group">
                    <label class="auth-label">Senha</label>
                    <input type="password" class="auth-input" id="regPassword" required placeholder="Mínimo 6 caracteres" minlength="6">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Criar Conta</button>
                <div id="regError" style="color: var(--accent-tertiary); font-size: 0.85rem; margin-top: 12px; text-align: center; display: none;"></div>
            </form>

            <div class="or-divider">OU CONTINUAR COM</div>

            <button onclick="handleGoogleLogin()" class="btn-google" style="padding: 12px; border-radius: 12px; border: none; cursor: pointer;">
                <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Google
            </button>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Exposed Global Functions
window.openAuthModal = (tab = 'login') => {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        switchAuthTab(tab);
    }
};

window.closeAuthModal = () => {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
};

window.switchAuthTab = (tab) => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    // Clear errors
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('regError').style.display = 'none';

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabLogin.classList.remove('active');
        tabRegister.classList.add('active');
    }
};

window.handleEmailLogin = async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    errorEl.style.display = 'none';
    errorEl.textContent = '';

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'A entrar...';
    submitBtn.disabled = true;

    try {
        const result = await ArmindoAccount.signIn(email, password);
        if (result.success) {
            closeAuthModal();
        } else {
            errorEl.textContent = result.error || 'Erro ao entrar.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Erro inesperado: ' + err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
};

window.handleEmailSignup = async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorEl = document.getElementById('regError');

    errorEl.style.display = 'none';
    errorEl.textContent = '';

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'A criar conta...';
    submitBtn.disabled = true;

    try {
        const result = await ArmindoAccount.signUp(email, password, name);
        if (result.success) {
            closeAuthModal();
            alert('Conta criada com sucesso! Bem-vindo(a), ' + name);
            window.location.href = '/perfil.html';
        } else {
            errorEl.textContent = result.error || 'Erro ao criar conta.';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Erro inesperado: ' + err.message;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
};

window.handleGoogleLogin = async () => {
    try {
        const result = await ArmindoAccount.signInWithGoogle();
        if (result.success) {
            closeAuthModal();
        } else {
            alert("Erro no login Google: " + (result.error || 'desconhecido'));
        }
    } catch (e) {
        alert("Erro sistema: " + e.message);
    }
};

window.handleLogout = async () => {
    if (confirm("Tem a certeza que deseja sair?")) {
        await ArmindoAccount.signOut();
        window.location.reload();
    }
};
