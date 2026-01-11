/* ============================================
   EDITOR 3.0 LOGIC - OBSIDIAN ENGINE
   ============================================ */

let formData = {
    title: "Formulário sem título",
    description: "",
    questions: [],
    settings: {
        requireLogin: false,
        allowMultiple: true, // Renaming to 'limitOneResponse' in UI logic for clarity, keeping data key for now or refactoring?
        // Let's rely on new keys for safety:
        limitOneResponse: false,
        successMessage: "Obrigado pela sua resposta!",
        endDate: null
    },
    collaborators: [], // Array of emails
    theme: {
        primaryColor: '#4A5FE5',     // Armindo Blue
        backgroundColor: '#18181B',  // Zinc 900 (Rich Dark, not harsh black)
        fontFamily: "'Inter', sans-serif",
        borderRadius: '12px',        // Modern rounded corners
        logoUrl: '',
        buttonText: 'Enviar'
    },
    status: 'draft',
    creatorId: null
};
let selectedId = null;
let formId = null;
let saveTimeout = null;

// Global UI Actions (Expose early for HTML onclick)
window.openCollabModal = function () {
    console.log("Opening collab modal...");
    const modal = document.getElementById('collabModal');
    if (modal) {
        modal.classList.remove('hidden');
        renderCollaborators();
    } else {
        console.error("Collab modal not found!");
    }
};

window.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('hidden');
};

// Redundant assignments removed to prevent infinite recursion


// Real Question Types
const TOOLS = {
    short_text: { icon: 'fa-font', label: 'Texto Curto' },
    long_text: { icon: 'fa-paragraph', label: 'Texto Longo' },
    single_choice: { icon: 'fa-circle-dot', label: 'Escolha Única' },
    multiple_choice: { icon: 'fa-square-check', label: 'Múltipla Escolha' },
    dropdown: { icon: 'fa-caret-down', label: 'Lista (Dropdown)' },
    rating: { icon: 'fa-star', label: 'Avaliação' },
    nps: { icon: 'fa-gauge-high', label: 'NPS' },
    matrix: { icon: 'fa-table-cells', label: 'Matriz' },
    file_upload: { icon: 'fa-cloud-arrow-up', label: 'Ficheiro' },
    date: { icon: 'fa-calendar', label: 'Data' },
    email: { icon: 'fa-envelope', label: 'Email' }
};

document.addEventListener('DOMContentLoaded', () => {
    initFirebaseAndEditor();
});

async function initFirebaseAndEditor() {
    // 1. Initialize Firebase
    if (typeof ArmindoForms !== 'undefined' && ArmindoForms.initFirebase) {
        ArmindoForms.initFirebase();
    }

    // 2. Auth Check
    ArmindoForms.Auth.onAuthStateChanged(async (user) => {
        if (user) {
            setupUser(user);
            await loadForm();
        } else {
            window.location.href = 'index.html';
        }
    });

    // 3. UI Init
    renderTools();
    setupGlobalListeners();
    setupSortable();
}

function setupUser(user) {
    const avatar = document.getElementById('userAvatar');
    if (user.photoURL) {
        avatar.style.backgroundImage = `url(${user.photoURL})`;
        avatar.textContent = '';
    } else {
        avatar.textContent = (user.displayName || '?')[0];
    }
}

async function loadForm() {
    const params = new URLSearchParams(window.location.search);
    formId = params.get('id');

    if (formId) {
        // Use Real-time listener for Collaboration
        firebase.firestore().collection('forms').doc(formId).onSnapshot((doc) => {
            if (doc.exists) {
                const remoteData = doc.data();
                formData = remoteData;

                renderHeader();
                renderQuestions();
                if (document.getElementById('formSettings').dataset.active === 'true') {
                    renderFormSettings();
                }

                document.getElementById('saveStatus').textContent = 'Sincronizado';
            }
        }, (err) => {
            console.error("Snapshot error:", err);
        });
    } else {
        // New form logic
        formData.creatorId = firebase.auth().currentUser.uid;
        // Don't save immediately to avoid empty form spam, 
        // saveChanges() will be called on first edit or manual save.
    }
}


/* --- PROPERTIES PANEL --- */

function renderProperties() {
    const emptyPanel = document.getElementById('emptyProperties');
    const qPanel = document.getElementById('questionProperties');
    const formPanel = document.getElementById('formSettings');

    // Reset Views
    emptyPanel.classList.add('hidden');
    qPanel.classList.add('hidden');
    formPanel.classList.add('hidden');

    // 1. No Selection: Default to Form Settings
    if (!selectedId) {
        renderFormSettings();
        return;
    }

    // 2. Question Selected
    qPanel.classList.remove('hidden');
    const q = formData.questions.find(x => x.id === selectedId);

    // Bind Inputs
    const propType = document.getElementById('propType');
    propType.innerHTML = Object.entries(TOOLS).map(([type, t]) =>
        `<option value="${type}" ${type === q.type ? 'selected' : ''}>${t.label}</option>`
    ).join('');

    propType.onchange = (e) => {
        q.type = e.target.value;
        q.options = getDefaultOptions(q.type); // Reset options on type change
        saveChanges();
        renderQuestions();
        renderProperties();
    };

    const propRequired = document.getElementById('propRequired');
    propRequired.checked = q.required;
    propRequired.onchange = (e) => {
        q.required = e.target.checked;
        saveChanges();
    };

    // Render Options Editor (if applicable)
    const optionsContainer = document.getElementById('propOptionsContainer');
    const optionsList = document.getElementById('propOptionsList');

    if (['single_choice', 'multiple_choice', 'dropdown'].includes(q.type)) {
        optionsContainer.classList.remove('hidden');
        optionsList.innerHTML = q.options.options.map((opt, idx) => `
            <div class="flex items-center gap-2 mb-2">
                <i class="fa-solid fa-grip-vertical text-dim cursor-grab"></i>
                <input type="text" class="prop-input" value="${escapeHtml(opt)}" 
                    oninput="updateOption('${q.id}', ${idx}, this.value)">
                <button class="icon-btn-danger" onclick="removeOption('${q.id}', ${idx})"><i class="fa-solid fa-xmark"></i></button>
            </div>
        `).join('');

        document.getElementById('addOptionBtn').onclick = () => addOption(q.id);
    } else {
        optionsContainer.classList.add('hidden');
    }

    // Delete
    document.getElementById('deleteQuestionBtn').onclick = () => {
        if (confirm('Tem a certeza?')) {
            formData.questions = formData.questions.filter(x => x.id !== selectedId);
            selectBlock(null);
            renderQuestions();
            saveChanges();
        }
    };
}

function renderFormSettings() {
    const p = document.getElementById('formSettings');
    p.classList.remove('hidden');
    document.getElementById('emptyProperties').classList.add('hidden');

    // Bind Controls
    const setLogin = document.getElementById('settLogin');
    setLogin.checked = formData.settings.requireLogin;
    setLogin.onchange = (e) => { formData.settings.requireLogin = e.target.checked; saveChanges(); };

    const setMult = document.getElementById('settMultiple');
    setMult.checked = formData.settings.allowMultiple;
    setMult.onchange = (e) => { formData.settings.allowMultiple = e.target.checked; saveChanges(); };

    const setEnd = document.getElementById('settEndDate');
    setEnd.value = formData.settings.endDate || '';
    setEnd.onchange = (e) => { formData.settings.endDate = e.target.value; saveChanges(); };

    // New Fields
    const setLimit = document.getElementById('settLimitOne');
    if (setLimit) {
        setLimit.checked = formData.settings.limitOneResponse;
        setLimit.onchange = (e) => { formData.settings.limitOneResponse = e.target.checked; saveChanges(); };
    }

    const msgInput = document.getElementById('settSuccessMsg');
    if (msgInput) {
        msgInput.value = formData.settings.successMessage || "Obrigado pela sua resposta!";
        msgInput.onchange = (e) => { formData.settings.successMessage = e.target.value; saveChanges(); };
    }

    // Collaborators List
    renderCollaborators();
}

function renderCollaborators() {
    const list = document.getElementById('collabList');
    if (!list) return;

    if (!formData.collaborators) formData.collaborators = [];

    if (formData.collaborators.length === 0) {
        list.innerHTML = '<p class="text-xs text-mute italic mb-2">Sem colaboradores externos</p>';
        return;
    }

    list.innerHTML = formData.collaborators.map((email, idx) => `
        <div class="collab-item">
            <div class="collab-info">
                <span class="collab-email">${email}</span>
                <span class="collab-role">Editor</span>
            </div>
            <button class="icon-btn-danger" onclick="removeCollaborator(${idx})">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function addCollaborator() {
    const input = document.getElementById('newCollabEmail');
    const email = input.value.trim();
    if (email && email.includes('@')) {
        if (!formData.collaborators) formData.collaborators = [];
        formData.collaborators.push(email);
        input.value = '';
        saveChanges();
        renderCollaborators();
    } else {
        alert('Email inválido');
    }
}

function removeCollaborator(idx) {
    formData.collaborators.splice(idx, 1);
    saveChanges();
    renderCollaborators();
}

// (Moved to top of file for early exposure)

/* --- OPTION MANAGEMENT --- */
function updateOption(qId, idx, val) {
    const q = formData.questions.find(x => x.id === qId);
    if (q && q.options && q.options.options) {
        q.options.options[idx] = val;
        saveChanges();

        // Targeted Preview Update to avoid re-render loop
        const block = document.querySelector(`.form-block[data-id="${qId}"] .q-preview`);
        if (block) block.innerHTML = getPreviewHTML(q);
    }
}

function addOption(qId) {
    const q = formData.questions.find(x => x.id === qId);
    if (q) {
        q.options.options.push(`Opção ${q.options.options.length + 1}`);
        saveChanges();
        renderProperties();
        renderQuestions();
    }
}

function removeOption(qId, idx) {
    const q = formData.questions.find(x => x.id === qId);
    if (q && q.options.options.length > 1) {
        q.options.options.splice(idx, 1);
        saveChanges();
        renderProperties();
        renderQuestions();
    }
}

/* --- RENDERERS --- */

function renderTools() {
    const list = document.getElementById('toolsList');
    if (!list) return;
    list.innerHTML = Object.entries(TOOLS).map(([type, t]) => `
        <button class="tool-btn" data-type="${type}" onclick="addQuestion('${type}')">
            <i class="fa-solid ${t.icon}"></i> ${t.label}
        </button>
    `).join('');
}

function renderHeader() {
    document.getElementById('headerTitle').value = formData.title;
    document.getElementById('formTitle').value = formData.title;
    document.getElementById('formDescription').value = formData.description || "";

    // Apply Theme
    if (formData.theme) {
        applyTheme(formData.theme);
        updateDesignControls(formData.theme);
    }
}

function renderQuestions() {
    const container = document.getElementById('questionsList');
    container.innerHTML = '';

    if (formData.questions.length === 0) {
        container.innerHTML = `
            <div class="empty-properties" style="border: 2px dashed var(--border-active); border-radius: var(--radius-lg);">
                <i class="fa-solid fa-arrow-left"></i>
                <p>Adicione perguntas usando o menu lateral</p>
            </div>
        `;
        return;
    }

    formData.questions.forEach((q) => {
        const el = document.createElement('div');
        el.className = `form-block ${selectedId === q.id ? 'selected' : ''}`;
        el.dataset.id = q.id;
        el.onclick = (e) => {
            e.stopPropagation();
            selectBlock(q.id);
        };

        el.innerHTML = `
            <div style="display: flex; gap: 8px; align-items: flex-start;">
                <span class="text-dim text-sm" style="padding-top: 2px;">::</span>
                <div style="flex:1">
                    <input type="text" class="q-title" value="${escapeHtml(q.title)}" placeholder="Pergunta..." oninput="updateQuestion('${q.id}', 'title', this.value)">
                    <div class="q-preview">
                        ${getPreviewHTML(q)}
                    </div>
                </div>
                 ${q.required ? '<span class="text-xs text-accent">*Req</span>' : ''}
            </div>
        `;
        container.appendChild(el);
    });
}

function getPreviewHTML(q) {
    const type = q.type;

    if (type === 'short_text') return '<input class="prop-input" disabled placeholder="Texto curto...">';
    if (type === 'long_text') return '<textarea class="prop-input" disabled rows="2" placeholder="Texto longo..."></textarea>';

    if (type === 'single_choice' || type === 'multiple_choice') {
        const icon = type === 'single_choice' ? 'circle' : 'square';
        const opts = q.options?.options || ['Opção 1', 'Opção 2'];
        return opts.map(o => `
            <div class="flex items-center gap-2 mb-1 text-dim text-sm">
                <i class="fa-regular fa-${icon}"></i> ${escapeHtml(o)}
            </div>
        `).join('');
    }

    if (type === 'dropdown') return '<select class="prop-select" disabled><option>Selecione...</option></select>';

    if (type === 'rating') return '<div class="text-accent"><i class="fa-regular fa-star"></i> <i class="fa-regular fa-star"></i> <i class="fa-regular fa-star"></i></div>';

    if (type === 'nps') return '<div class="flex gap-1"><div class="badge-nps">1</div><div class="badge-nps">...</div><div class="badge-nps">10</div></div>'; // Simplified

    if (type === 'file_upload') return '<div class="prop-input text-center text-sm py-2"><i class="fa-solid fa-cloud-arrow-up"></i> Upload</div>';

    return '<div class="text-dim text-sm">Preview não disponível</div>';
}

function escapeHtml(text) {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* --- LOGIC --- */

// Helper to inject index for addQuestion
function addQuestion(type, index = null) {
    const newQ = {
        id: 'q_' + Date.now(),
        type: type,
        title: '',
        required: false,
        options: getDefaultOptions(type)
    };

    if (index !== null) {
        formData.questions.splice(index, 0, newQ);
    } else {
        formData.questions.push(newQ);
    }

    saveChanges();
    renderQuestions();
    selectBlock(newQ.id);

    // Initial scroll (only if appended to end)
    if (index === null) {
        setTimeout(() => {
            const last = document.getElementById('questionsList').lastElementChild;
            if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function getDefaultOptions(type) {
    if (['single_choice', 'multiple_choice', 'dropdown'].includes(type)) {
        return { options: ['Opção 1', 'Opção 2'] };
    }
    return {};
}

function selectBlock(id) {
    selectedId = id;

    // Reset active flag for settings if we select a question
    if (id) {
        document.getElementById('formSettings').dataset.active = 'false';
    }

    // 1. Update Visuals (Lightweight DOM update)
    const allBlocks = document.querySelectorAll('.form-block');
    allBlocks.forEach(el => {
        if (el.dataset.id === id) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    // 2. Render Sidebar
    renderProperties();
}

function updateQuestion(id, field, value) {
    const q = formData.questions.find(x => x.id === id);
    if (q) {
        q[field] = value;
        saveChanges();

        // Live Preview Update (if needed)
        // Note: Title input updates itself naturally.
        // We might want to update sidebars or other indicators if they existed.
    }
}

async function saveChanges() {
    clearTimeout(saveTimeout);
    document.getElementById('saveStatus').textContent = 'A guardar...';

    saveTimeout = setTimeout(async () => {
        try {
            if (!formId) {
                formId = await ArmindoForms.Database.forms.create(formData);
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('id', formId);
                window.history.pushState({}, '', newUrl);
            } else {
                await ArmindoForms.Database.forms.update(formId, formData);
            }
            document.getElementById('saveStatus').textContent = 'Guardado';
        } catch (e) {
            console.error(e);
            document.getElementById('saveStatus').textContent = 'Erro';
        }
    }, 1000);
}

/* --- THEME & DESIGN --- */
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));

    // Find button properly (simple way)
    const btns = document.querySelectorAll('.tab-btn');
    if (tab === 'properties') btns[0].classList.add('active');
    if (tab === 'design') btns[1].classList.add('active');

    document.getElementById(`panel-${tab}`).classList.remove('hidden');
}

function updateTheme(key, value) {
    if (!formData.theme) formData.theme = {};
    formData.theme[key] = value;

    applyTheme(formData.theme);
    saveChanges();
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme.primaryColor) root.style.setProperty('--form-primary', theme.primaryColor);
    if (theme.fontFamily) root.style.setProperty('--form-font', theme.fontFamily);
    if (theme.borderRadius) root.style.setProperty('--form-radius', theme.borderRadius);

    // Also update Accent for editor UI consistency if desired, or keep editor distinct
    // root.style.setProperty('--accent', theme.primaryColor); 
}

function updateDesignControls(theme) {
    const colorInput = document.getElementById('designColor');
    const colorHex = document.getElementById('designColorHex');
    const fontInput = document.getElementById('designFont');

    if (theme.primaryColor) {
        if (colorInput) colorInput.value = theme.primaryColor;
        if (colorHex) colorHex.value = theme.primaryColor;
    }

    // New Fields
    if (theme.backgroundColor) {
        // We'd need controls for this. Assuming we add them to HTML next.
        const bgPicker = document.getElementById('designBgColor');
        if (bgPicker) bgPicker.value = theme.backgroundColor;
    }
    if (theme.logoUrl) {
        const logoInput = document.getElementById('designLogo');
        if (logoInput) logoInput.value = theme.logoUrl;
    }
    if (theme.buttonText) {
        const btnInput = document.getElementById('designBtnText');
        if (btnInput) btnInput.value = theme.buttonText;
    }

    if (theme.fontFamily && fontInput) {
        fontInput.value = theme.fontFamily;
    }
    // Radius buttons
    if (theme.borderRadius) {
        document.querySelectorAll('.radius-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.r === theme.borderRadius);
        });
    }
}

function updateRadius(val) {
    updateTheme('borderRadius', val);
    updateDesignControls(formData.theme);
}

function setupGlobalListeners() {
    // Header Inputs
    const titleInput = document.getElementById('formTitle');
    if (titleInput) {
        titleInput.addEventListener('input', (e) => {
            formData.title = e.target.value;
            const headerTitle = document.getElementById('headerTitle');
            if (headerTitle) headerTitle.value = e.target.value;
            saveChanges();
        });
    }

    const descInput = document.getElementById('formDescription');
    if (descInput) {
        descInput.addEventListener('input', (e) => {
            formData.description = e.target.value;
            saveChanges();
        });
    }

    // Design Listeners (Safeguarded)
    const colorPicker = document.getElementById('designColor');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const hexInput = document.getElementById('designColorHex');
            if (hexInput) hexInput.value = e.target.value;
            updateTheme('primaryColor', e.target.value);
        });
    }

    // Logo Upload (Base64)
    const logoUpload = document.getElementById('designLogoUpload');
    if (logoUpload) {
        logoUpload.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (evt) {
                const base64 = evt.target.result;
                // Update text input
                const urlInput = document.getElementById('designLogo');
                if (urlInput) urlInput.value = base64;
                // Update theme
                updateTheme('logoUrl', base64);
            };
            reader.readAsDataURL(file);
        });
    }

    const colorHex = document.getElementById('designColorHex');
    if (colorHex) {
        colorHex.addEventListener('change', (e) => {
            if (colorPicker) colorPicker.value = e.target.value;
            updateTheme('primaryColor', e.target.value);
        });
    }

    const fontSelect = document.getElementById('designFont');
    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            updateTheme('fontFamily', e.target.value);
        });
    }

    // Canvas Background Click: Deselect and show Form Settings
    const canvas = document.getElementById('editorCanvas');
    if (canvas) {
        canvas.addEventListener('click', (e) => {
            // Only trigger if clicking exactly the canvas or container, not children
            if (e.target.id === 'editorCanvas' || e.target.classList.contains('canvas-container')) {
                selectBlock(null);
            }
        });
    }

    // Toggle Form Settings Panel
    const settingsBtn = document.getElementById('openFormSettings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            const formSettings = document.getElementById('formSettings');
            if (formSettings) formSettings.dataset.active = 'true';
            switchTab('properties'); // Ensure we are on props tab
            renderProperties();
        });
    }

    // Preview
    const prevBtn = document.getElementById('previewBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (!formId) { alert('Guarde o formulário primeiro'); return; }
            window.open(`view.html?id=${formId}&preview=true`, '_blank');
        });
    }

    // Publish
    const pubBtn = document.getElementById('publishBtn');
    if (pubBtn) {
        pubBtn.addEventListener('click', () => {
            // Update status to active (standardized with dashboard/firebase-config)
            formData.status = 'active';
            saveChanges();

            const url = `${window.location.origin}/view.html?id=${formId}`;
            const pubInput = document.getElementById('publishUrl');
            if (pubInput) pubInput.value = url;
            const modal = document.getElementById('publishModal');
            if (modal) modal.classList.remove('hidden');
        });
    }

    // Collaborators Modal
    const collabBtn = document.getElementById('openCollabModalBtn');
    if (collabBtn) {
        collabBtn.addEventListener('click', () => {
            openCollabModal();
        });
    }

    const copyBtn = document.getElementById('copyUrlBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const pubInput = document.getElementById('publishUrl');
            if (pubInput) {
                navigator.clipboard.writeText(pubInput.value);
                alert('Link copiado!');
            }
        });
    }
}

function setupSortable() {
    // Tools (Source)
    new Sortable(document.getElementById('toolsList'), {
        group: {
            name: 'shared',
            pull: 'clone',
            put: false
        },
        sort: false,
        animation: 150
    });

    // Canvas (Target)
    new Sortable(document.getElementById('questionsList'), {
        group: 'shared',
        animation: 150,
        ghostClass: 'sortable-ghost',
        onAdd: function (evt) {
            // Remove the raw DOM element created by dragging
            evt.item.remove();

            // Identify type by text or icon class (Simplified for now)
            // Ideally we'd data-type attributes on the tool buttons
            const type = evt.item.dataset.type; // Get type from data-type attribute

            // Insert at specific index
            addQuestion(type, evt.newIndex);
        },
        onEnd: (evt) => {
            if (evt.from === evt.to) { // Reordering within list
                const item = formData.questions.splice(evt.oldIndex, 1)[0];
                formData.questions.splice(evt.newIndex, 0, item);
                saveChanges();
            }
        }
    });
}
