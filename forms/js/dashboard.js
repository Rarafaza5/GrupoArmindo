/* ============================================
   ARMINDO FORMS - Dashboard Logic
   ============================================ */

// State
let currentUser = null;
let userForms = [];
let formToDelete = null;

// DOM Elements (Initialized in DOMContentLoaded)
let loadingOverlay, sidebar, formsGrid, emptyState, deleteModal, shareModal;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    loadingOverlay = document.getElementById('loadingOverlay');
    sidebar = document.getElementById('sidebar');
    formsGrid = document.getElementById('formsGrid');
    emptyState = document.getElementById('emptyState');
    deleteModal = document.getElementById('deleteModal');
    shareModal = document.getElementById('shareModal');

    if (!document.getElementById('formsGrid')) {
        // We are likely not on the dashboard page (e.g. profile.html reusing sidebar logic)
        // Just setup sidebar and auth if present
        setupSharedListeners();

        // Initialize Firebase if not already done by other scripts
        if (!firebase.apps.length) {
            ArmindoForms.initFirebase();
        }

        // Check auth for sidebar user info
        ArmindoForms.Auth.onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                updateUserInfo(user);
            } else {
                window.location.href = 'index.html';
            }
            if (loadingOverlay) hideLoading();
        });
        return;
    }

    if (!ArmindoForms.initFirebase()) {
        console.error('Failed to initialize Firebase');
        return;
    }

    // Check auth state
    ArmindoForms.Auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            updateUserInfo(user);
            await loadForms();
        } else {
            // Redirect to login
            window.location.href = 'index.html';
        }
        hideLoading();
    });

    // Setup event listeners
    setupEventListeners();
});

function setupSharedListeners() {
    // Shared functionality like Sidebar and Logout

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await ArmindoForms.Auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                ArmindoForms.Utils.showToast('Erro ao sair: ' + error.message, 'error');
            }
        });
    }

    // User Profile Click
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.style.cursor = 'pointer';
        userInfo.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebarToggle = document.getElementById('sidebarToggle');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (sidebar) sidebar.classList.add('open');
            document.body.insertAdjacentHTML('beforeend', '<div class="sidebar-overlay active" id="sidebarOverlay"></div>');
            document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
        });
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', closeSidebar);
    }
}

// Setup Dashboard-specific Event Listeners
function setupEventListeners() {
    setupSharedListeners();

    // View toggle
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            if (formsGrid) formsGrid.classList.toggle('list-view', view === 'list');
            localStorage.setItem('formsView', view);
        });
    });

    // Restore view preference
    const savedView = localStorage.getItem('formsView');
    if (savedView === 'list' && document.querySelector('[data-view="list"]')) {
        document.querySelector('[data-view="list"]').click();
    }

    // Delete confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);

    // Share modal buttons
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) copyLinkBtn.addEventListener('click', copyShareLink);

    const copyEmbedBtn = document.getElementById('copyEmbedBtn');
    if (copyEmbedBtn) copyEmbedBtn.addEventListener('click', copyEmbedCode);
}

// Close sidebar
function closeSidebar() {
    sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.remove();
}

// Update user info in sidebar
function updateUserInfo(user) {
    document.getElementById('userName').textContent = user.displayName || 'Utilizador';
    document.getElementById('userEmail').textContent = user.email;

    const avatar = document.getElementById('userAvatar');
    if (user.photoURL) {
        avatar.style.backgroundImage = `url(${user.photoURL})`;
        avatar.style.backgroundSize = 'cover';
        avatar.textContent = '';
    } else {
        avatar.textContent = (user.displayName || user.email || '?')[0].toUpperCase();
    }
}

// Load forms
async function loadForms() {
    try {
        showLoading();

        // 1. Fetch owned forms
        const owned = await ArmindoForms.Database.forms.getByUser(currentUser.uid);

        // 2. Fetch forms where invited
        const shared = await ArmindoForms.Database.forms.getByCollaborator(currentUser.email);

        // 3. Merge and deduplicate
        const merged = [...owned];
        shared.forEach(s => {
            if (!merged.find(m => m.id === s.id)) merged.push(s);
        });

        // 4. Sort by date
        userForms = merged.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        renderForms();
        updateStats();
    } catch (error) {
        console.error('Error loading forms:', error);
        ArmindoForms.Utils.showToast('Erro ao carregar formulários', 'error');
    } finally {
        hideLoading();
    }
}

// Render forms
function renderForms() {
    if (userForms.length === 0) {
        formsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    formsGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    formsGrid.innerHTML = userForms.map(form => createFormCard(form)).join('');

    // Add event listeners to form cards
    formsGrid.querySelectorAll('.form-card').forEach(card => {
        const formId = card.dataset.formId;

        card.querySelector('.view-btn-action')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(`form.html?id=${formId}`, '_blank');
        });

        card.querySelector('.edit-btn-action')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `editor.html?id=${formId}`;
        });

        card.querySelector('.analytics-btn-action')?.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `analytics.html?id=${formId}`;
        });

        card.querySelector('.share-btn-action')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openShareModal(formId);
        });

        card.querySelector('.delete-btn-action')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal(formId);
        });

        // Click on card
        card.addEventListener('click', () => {
            window.location.href = `editor.html?id=${formId}`;
        });
    });
}

// Create form card HTML
function createFormCard(form) {
    const statusBadge = getStatusBadge(form.status);
    const createdDate = ArmindoForms.Utils.formatRelativeTime(form.createdAt);
    const questionsCount = form.questions?.length || 0;
    const responsesCount = form.responseCount || 0;

    return `
        <div class="form-card" data-form-id="${form.id}">
            <div class="form-card-header">
                <div>
                    <h3 class="form-card-title">${escapeHtml(form.title)}</h3>
                    <p class="form-card-description">${escapeHtml(form.description || 'Sem descrição')}</p>
                </div>
                ${statusBadge}
            </div>
            <div class="form-card-body">
                <div class="form-card-stats">
                    <div class="form-stat">
                        <span class="form-stat-value">${responsesCount}</span>
                        <span class="form-stat-label">Respostas</span>
                    </div>
                    <div class="form-stat">
                        <span class="form-stat-value">${questionsCount}</span>
                        <span class="form-stat-label">Perguntas</span>
                    </div>
                </div>
            </div>
            <div class="form-card-footer">
                <span class="form-card-date">${createdDate}</span>
                <div class="form-card-actions">
                    <button class="form-action-btn view-btn-action" title="Ver formulário">👁️</button>
                    <button class="form-action-btn edit-btn-action" title="Editar">✏️</button>
                    <button class="form-action-btn analytics-btn-action" title="Analytics">📊</button>
                    <button class="form-action-btn share-btn-action" title="Partilhar">🔗</button>
                    <button class="form-action-btn danger delete-btn-action" title="Eliminar">🗑️</button>
                </div>
            </div>
        </div>
    `;
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        active: '<span class="badge badge-success">Ativo</span>',
        draft: '<span class="badge badge-warning">Rascunho</span>',
        closed: '<span class="badge badge-error">Fechado</span>'
    };
    return badges[status] || badges.draft;
}

// Update stats
function updateStats() {
    const totalForms = userForms.length;
    const totalResponses = userForms.reduce((sum, form) => sum + (form.responseCount || 0), 0);
    const activeForms = userForms.filter(f => f.status === 'active').length;

    // Calculate today's responses (simplified - actual implementation would query Firestore)
    const todayResponses = 0; // Would need real-time query

    animateCounter('totalForms', totalForms);
    animateCounter('totalResponses', totalResponses);
    animateCounter('activeFormsCount', activeForms);
    animateCounter('recentResponses', todayResponses);
}

// Animate counter
function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (target - start) * eased);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Delete Modal
function openDeleteModal(formId) {
    formToDelete = formId;
    const form = userForms.find(f => f.id === formId);
    document.getElementById('deleteFormName').textContent = form?.title || '-';
    deleteModal.classList.add('active');
}

function closeDeleteModal() {
    formToDelete = null;
    deleteModal.classList.remove('active');
}

async function confirmDelete() {
    if (!formToDelete) return;

    try {
        showLoading();
        await ArmindoForms.Database.forms.delete(formToDelete);
        closeDeleteModal();
        await loadForms();
        ArmindoForms.Utils.showToast('Formulário eliminado com sucesso', 'success');
    } catch (error) {
        console.error('Error deleting form:', error);
        ArmindoForms.Utils.showToast('Erro ao eliminar formulário', 'error');
    } finally {
        hideLoading();
    }
}

// Share Modal
let currentShareFormId = null;

function openShareModal(formId) {
    currentShareFormId = formId;
    const form = userForms.find(f => f.id === formId);

    // Generate URLs
    const baseUrl = window.location.origin + window.location.pathname.replace('dashboard.html', '');
    const formUrl = `${baseUrl}form.html?id=${formId}`;

    document.getElementById('shareLink').value = formUrl;
    document.getElementById('embedCode').value = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0"></iframe>`;

    // Share links
    const title = encodeURIComponent(form?.title || 'Formulário');
    document.getElementById('shareWhatsapp').href = `https://wa.me/?text=${title}%20${encodeURIComponent(formUrl)}`;
    document.getElementById('shareEmail').href = `mailto:?subject=${title}&body=${encodeURIComponent('Responda ao formulário: ' + formUrl)}`;
    document.getElementById('shareFacebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(formUrl)}`;

    shareModal.classList.add('active');
}

function closeShareModal() {
    currentShareFormId = null;
    shareModal.classList.remove('active');
}

async function copyShareLink() {
    const link = document.getElementById('shareLink').value;
    const success = await ArmindoForms.Utils.copyToClipboard(link);

    if (success) {
        ArmindoForms.Utils.showToast('Link copiado!', 'success');
    } else {
        ArmindoForms.Utils.showToast('Erro ao copiar link', 'error');
    }
}

async function copyEmbedCode() {
    const code = document.getElementById('embedCode').value;
    const success = await ArmindoForms.Utils.copyToClipboard(code);

    if (success) {
        ArmindoForms.Utils.showToast('Código copiado!', 'success');
    } else {
        ArmindoForms.Utils.showToast('Erro ao copiar código', 'error');
    }
}

// Loading helpers
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Close modals on overlay click
if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });
}

if (shareModal) {
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) closeShareModal();
    });
}

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDeleteModal();
        closeShareModal();
    }
});
