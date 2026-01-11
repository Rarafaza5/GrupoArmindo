/* ============================================
   ARMINDO FORMS - Public Form Logic
   ============================================ */

// State
let formData = null;
let currentQuestionIndex = 0;
let answers = {};
let startTime = null;
let isPreview = false;
let visibleQuestions = [];

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');
const formContainer = document.getElementById('formContainer');
const errorPage = document.getElementById('errorPage');
const successPage = document.getElementById('successPage');
const formQuestions = document.getElementById('formQuestions');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.getElementById('progressContainer');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    if (!ArmindoForms.initFirebase()) {
        showError('Erro de configuração');
        return;
    }

    await loadForm();
    setupEventListeners();
});

// Load Form
async function loadForm() {
    try {
        const formId = ArmindoForms.Utils.getUrlParam('id');
        isPreview = ArmindoForms.Utils.getUrlParam('preview') === 'true';

        if (!formId) {
            showError('ID do formulário não especificado');
            return;
        }

        // Load form data
        if (isPreview) {
            formData = await ArmindoForms.Database.forms.get(formId);
        } else {
            formData = await ArmindoForms.Database.forms.getPublic(formId);
        }

        if (!formData) {
            showError('Este formulário não existe ou já foi encerrado.');
            return;
        }

        // Check if requires login and if already submitted
        if (formData.settings?.requireLogin && !isPreview) {
            const user = ArmindoForms.Auth.getCurrentUser();
            if (!user) {
                // Redirect to login
                sessionStorage.setItem('redirectAfterLogin', window.location.href);
                window.location.href = 'index.html';
                return;
            }

            // Check for existing response
            if (!formData.settings.allowMultipleResponses) {
                const hasSubmitted = await ArmindoForms.Database.responses.checkDuplicate(formData.id, user.uid);
                if (hasSubmitted) {
                    showError('Já respondeu a este formulário.');
                    return;
                }
            }
        }

        // Calculate visible questions based on logic
        calculateVisibleQuestions();

        // Render form
        renderForm();
        startTime = new Date();

        // Show preview banner if in preview mode
        if (isPreview) {
            document.body.insertAdjacentHTML('afterbegin', `
                <div class="preview-banner">
                    ⚠️ Modo de pré-visualização - As respostas não serão guardadas
                </div>
            `);
        }

        // Hide/show progress bar based on settings
        progressContainer.style.display = formData.settings?.showProgressBar !== false ? 'block' : 'none';

    } catch (error) {
        console.error('Error loading form:', error);
        showError('Erro ao carregar formulário');
    } finally {
        hideLoading();
    }
}

// Calculate visible questions based on conditional logic
function calculateVisibleQuestions() {
    visibleQuestions = [];

    if (!formData.questions) return;

    for (const question of formData.questions) {
        // Check if question has conditional logic
        if (question.logic?.showIf) {
            const { questionId, value } = question.logic.showIf;
            const answer = answers[questionId];

            // If condition is not met, skip this question
            if (answer !== value && !answer?.includes?.(value)) {
                continue;
            }
        }

        visibleQuestions.push(question);
    }
}

// Render Form
function renderForm() {
    // Apply custom theme
    applyTheme();

    // Update header
    document.getElementById('formTitle').textContent = formData.title;
    document.getElementById('formDescription').textContent = formData.description || '';
    document.title = formData.title;

    // Handle logo/branding
    const formLogo = document.getElementById('formLogo');
    const formBrand = document.getElementById('formBrand');

    if (formData.theme?.showLogo && formData.theme?.customLogo) {
        formLogo.src = formData.theme.customLogo;
        formLogo.alt = formData.theme?.customBrandName || '';
        formLogo.style.display = 'block';
    } else if (formData.theme?.customBrandName) {
        formBrand.textContent = formData.theme.customBrandName;
        formBrand.style.display = 'block';
    }

    // Handle "Powered by" footer
    const footer = document.getElementById('formFooter');
    if (formData.settings?.showPoweredBy !== false) {
        footer.innerHTML = '<p>Criado com <a href="index.html" target="_blank" style="color: var(--primary);">Armindo Forms</a></p>';
    } else {
        footer.innerHTML = '';
    }

    // Render questions
    renderQuestions();

    // Update counter
    updateCounter();
    updateProgress();

    // Show form container
    formContainer.style.display = 'flex';
}

// Apply Custom Theme
function applyTheme() {
    const theme = formData.theme || {};
    const primaryColor = theme.primaryColor || '#4A5FE5';
    const accentColor = theme.accentColor || '#8B5CF6';
    const bgColor = theme.backgroundColor || '#0f0f1a';
    const textColor = theme.textColor || '#ffffff';
    const borderRadius = theme.borderRadius || '16';

    // Determine if it's a light theme
    const isLight = isLightColor(bgColor);

    const themeCSS = `
        :root {
            --primary: ${primaryColor};
            --accent: ${accentColor};
            --gradient-primary: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
        }
        
        body {
            background: ${bgColor};
            color: ${textColor};
        }
        
        .glass-card {
            background: ${isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)'};
            border-color: ${isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
        }
        
        .question-card-public {
            border-radius: ${borderRadius}px;
        }
        
        .btn-primary {
            background: ${primaryColor};
            background: var(--gradient-primary);
        }
        
        .choice-option:hover,
        .choice-option.selected {
            border-color: ${primaryColor};
            background: ${primaryColor}15;
        }
        
        .progress-bar {
            background: var(--gradient-primary);
        }
        
        .question-number-public {
            background: var(--gradient-primary);
        }
        
        .public-input:focus,
        .public-select:focus {
            border-color: ${primaryColor};
            box-shadow: 0 0 0 4px ${primaryColor}20;
        }
        
        .success-animation {
            background: var(--gradient-primary);
        }
        
        ${isLight ? `
            .text-muted, .text-secondary {
                color: rgba(0, 0, 0, 0.6);
            }
            .question-title-public {
                color: #1f2937;
            }
            .public-input, .public-select, .public-textarea {
                background: rgba(0, 0, 0, 0.03);
                border-color: rgba(0, 0, 0, 0.15);
                color: #1f2937;
            }
            .choice-option {
                background: rgba(0, 0, 0, 0.02);
                border-color: rgba(0, 0, 0, 0.15);
            }
            .btn-secondary {
                background: rgba(0, 0, 0, 0.05);
                border-color: rgba(0, 0, 0, 0.15);
                color: #1f2937;
            }
        ` : ''}
    `;

    document.getElementById('dynamicTheme').textContent = themeCSS;
}

// Check if a color is light
function isLightColor(hex) {
    if (!hex) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
}

// Render Questions
function renderQuestions() {
    if (visibleQuestions.length === 0) {
        formQuestions.innerHTML = `
            <div class="question-slide active">
                <div class="question-card-public">
                    <p class="text-center text-muted">Este formulário não tem perguntas.</p>
                </div>
            </div>
        `;
        return;
    }

    formQuestions.innerHTML = visibleQuestions.map((q, index) =>
        createQuestionSlide(q, index)
    ).join('');

    // Set up interactive elements
    setupQuestionInteractions();

    // Show first question
    showQuestion(0);
}

// Create Question Slide HTML
function createQuestionSlide(question, index) {
    const isActive = index === 0;

    return `
        <div class="question-slide ${isActive ? 'active' : ''}" data-question-id="${question.id}" data-index="${index}">
            <div class="question-card-public">
                <span class="question-number-public">${index + 1}</span>
                <h2 class="question-title-public">
                    ${escapeHtml(question.title)}
                    ${question.required ? '<span class="question-required">*</span>' : ''}
                </h2>
                ${question.description ? `<p class="question-description-public">${escapeHtml(question.description)}</p>` : ''}
                <div class="question-input-area">
                    ${renderQuestionInput(question)}
                </div>
            </div>
        </div>
    `;
}

// Render Question Input
function renderQuestionInput(question) {
    const value = answers[question.id] || '';

    switch (question.type) {
        case 'short_text':
            return `
                <input type="text" class="public-input" data-question-id="${question.id}" 
                    placeholder="Escreva a sua resposta aqui" value="${escapeHtml(value)}">
            `;

        case 'long_text':
            return `
                <textarea class="public-input public-textarea" data-question-id="${question.id}" 
                    placeholder="Escreva a sua resposta aqui">${escapeHtml(value)}</textarea>
            `;

        case 'email':
            return `
                <input type="email" class="public-input" data-question-id="${question.id}" 
                    placeholder="email@exemplo.com" value="${escapeHtml(value)}">
            `;

        case 'phone':
            return `
                <input type="tel" class="public-input" data-question-id="${question.id}" 
                    placeholder="+351 912 345 678" value="${escapeHtml(value)}">
            `;

        case 'number':
            return `
                <input type="number" class="public-input" data-question-id="${question.id}" 
                    placeholder="0" value="${value}"
                    ${question.options?.min !== undefined ? `min="${question.options.min}"` : ''}
                    ${question.options?.max !== undefined ? `max="${question.options.max}"` : ''}>
            `;

        case 'date':
            return `
                <input type="date" class="public-input" data-question-id="${question.id}" value="${value}">
            `;

        case 'time':
            return `
                <input type="time" class="public-input" data-question-id="${question.id}" value="${value}">
            `;

        case 'single_choice':
            const options = question.options?.options || [];
            return `
                <div class="choice-options" data-question-id="${question.id}">
                    ${options.map((opt, i) => `
                        <label class="choice-option ${value === opt ? 'selected' : ''}">
                            <input type="radio" name="q_${question.id}" value="${escapeHtml(opt)}" ${value === opt ? 'checked' : ''}>
                            <span class="choice-indicator"></span>
                            <span class="choice-label">${escapeHtml(opt)}</span>
                        </label>
                    `).join('')}
                </div>
            `;

        case 'multiple_choice':
            const mcOptions = question.options?.options || [];
            const selectedValues = Array.isArray(value) ? value : [];
            return `
                <div class="choice-options" data-question-id="${question.id}">
                    ${mcOptions.map((opt, i) => `
                        <label class="choice-option checkbox ${selectedValues.includes(opt) ? 'selected' : ''}">
                            <input type="checkbox" name="q_${question.id}" value="${escapeHtml(opt)}" ${selectedValues.includes(opt) ? 'checked' : ''}>
                            <span class="choice-indicator"></span>
                            <span class="choice-label">${escapeHtml(opt)}</span>
                        </label>
                    `).join('')}
                </div>
            `;

        case 'dropdown':
            const ddOptions = question.options?.options || [];
            return `
                <select class="public-select" data-question-id="${question.id}">
                    <option value="">Selecione uma opção</option>
                    ${ddOptions.map(opt => `
                        <option value="${escapeHtml(opt)}" ${value === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>
                    `).join('')}
                </select>
            `;

        case 'rating':
            const max = question.options?.max || 5;
            return `
                <div class="rating-input" data-question-id="${question.id}">
                    ${Array.from({ length: max }, (_, i) => `
                        <span class="rating-star-input ${value > i ? 'active' : ''}" data-value="${i + 1}">★</span>
                    `).join('')}
                </div>
            `;

        case 'nps':
            return `
                <div>
                    <div class="nps-input" data-question-id="${question.id}">
                        ${Array.from({ length: 11 }, (_, i) => {
                const category = i <= 6 ? 'detractor' : i <= 8 ? 'passive' : 'promoter';
                return `
                                <button type="button" class="nps-input-option ${category} ${value === i ? 'selected' : ''}" data-value="${i}">
                                    ${i}
                                </button>
                            `;
            }).join('')}
                    </div>
                    <div class="nps-labels">
                        <span>Nada provável</span>
                        <span>Extremamente provável</span>
                    </div>
                </div>
            `;

        case 'scale':
            const scaleMin = question.options?.min || 1;
            const scaleMax = question.options?.max || 10;
            return `
                <div class="scale-input-container">
                    <div class="scale-input" data-question-id="${question.id}">
                        ${Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => {
                const val = scaleMin + i;
                return `
                                <button type="button" class="scale-option ${value === val ? 'selected' : ''}" data-value="${val}">
                                    ${val}
                                </button>
                            `;
            }).join('')}
                    </div>
                    <div class="scale-labels">
                        <span>${question.options?.minLabel || 'Mínimo'}</span>
                        <span>${question.options?.maxLabel || 'Máximo'}</span>
                    </div>
                </div>
            `;

        case 'matrix':
            const matrixRows = question.options?.rows || [];
            const matrixCols = question.options?.columns || [];
            const matrixValue = value || {};
            return `
                <div class="matrix-input" data-question-id="${question.id}">
                    <table class="matrix-table-public">
                        <thead>
                            <tr>
                                <th></th>
                                ${matrixCols.map(col => `<th>${escapeHtml(col)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${matrixRows.map((row, rowIdx) => `
                                <tr>
                                    <td class="matrix-row-label">${escapeHtml(row)}</td>
                                    ${matrixCols.map((col, colIdx) => `
                                        <td>
                                            <input type="radio" name="matrix_${question.id}_${rowIdx}" 
                                                data-row="${rowIdx}" data-col="${escapeHtml(col)}" 
                                                ${matrixValue[row] === col ? 'checked' : ''}>
                                        </td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

        case 'file_upload':
            return `
                <div class="file-upload-container" data-question-id="${question.id}">
                    <div class="file-upload-area" id="fileUpload_${question.id}">
                        <span class="file-upload-icon">📎</span>
                        <p class="file-upload-text">Arraste um ficheiro ou clique para selecionar</p>
                        <p class="file-upload-info">Tamanho máximo: ${question.options?.maxSize || 5}MB</p>
                    </div>
                    <input type="file" id="fileInput_${question.id}" style="display: none;">
                    <div class="file-preview-container" id="filePreview_${question.id}"></div>
                </div>
            `;

        default:
            return `<input type="text" class="public-input" data-question-id="${question.id}" placeholder="Resposta">`;
    }
}

// Setup Question Interactions
function setupQuestionInteractions() {
    // Text inputs
    document.querySelectorAll('.public-input, .public-textarea, .public-select').forEach(input => {
        input.addEventListener('change', (e) => {
            const questionId = e.target.dataset.questionId;
            answers[questionId] = e.target.value;
            recalculateVisibility();
        });

        input.addEventListener('input', (e) => {
            const questionId = e.target.dataset.questionId;
            answers[questionId] = e.target.value;
        });
    });

    // Single choice
    document.querySelectorAll('.choice-options').forEach(container => {
        const questionId = container.dataset.questionId;

        container.querySelectorAll('.choice-option').forEach(option => {
            option.addEventListener('click', () => {
                const input = option.querySelector('input');

                if (input.type === 'radio') {
                    container.querySelectorAll('.choice-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                    input.checked = true;
                    answers[questionId] = input.value;
                } else {
                    option.classList.toggle('selected');
                    input.checked = option.classList.contains('selected');

                    // Gather all checked values
                    const checked = Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
                    answers[questionId] = checked;
                }

                recalculateVisibility();
            });
        });
    });

    // Rating
    document.querySelectorAll('.rating-input').forEach(container => {
        const questionId = container.dataset.questionId;
        const stars = container.querySelectorAll('.rating-star-input');

        stars.forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.dataset.value);
                answers[questionId] = value;

                stars.forEach((s, i) => {
                    s.classList.toggle('active', i < value);
                });
            });

            star.addEventListener('mouseenter', () => {
                const value = parseInt(star.dataset.value);
                stars.forEach((s, i) => {
                    s.classList.toggle('hover', i < value);
                });
            });

            star.addEventListener('mouseleave', () => {
                stars.forEach(s => s.classList.remove('hover'));
            });
        });
    });

    // NPS & Scale
    document.querySelectorAll('.nps-input, .scale-input').forEach(container => {
        const questionId = container.dataset.questionId;

        container.querySelectorAll('.nps-input-option, .scale-option').forEach(option => {
            option.addEventListener('click', () => {
                const value = parseInt(option.dataset.value);
                answers[questionId] = value;

                container.querySelectorAll('.nps-input-option, .scale-option').forEach(o => {
                    o.classList.remove('selected');
                });
                option.classList.add('selected');
            });
        });
    });

    // Matrix questions
    document.querySelectorAll('.matrix-input').forEach(container => {
        const questionId = container.dataset.questionId;
        const question = visibleQuestions.find(q => q.id === questionId);
        const rows = question?.options?.rows || [];

        container.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', () => {
                const rowIdx = parseInt(radio.dataset.row);
                const colValue = radio.dataset.col;
                const rowLabel = rows[rowIdx];

                // Initialize if needed
                if (!answers[questionId]) {
                    answers[questionId] = {};
                }

                answers[questionId][rowLabel] = colValue;
            });
        });
    });

    // File upload
    document.querySelectorAll('.file-upload-area').forEach(uploadArea => {
        const questionId = uploadArea.id.replace('fileUpload_', '');
        const fileInput = document.getElementById('fileInput_' + questionId);
        const previewContainer = document.getElementById('filePreview_' + questionId);

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');

            if (e.dataTransfer.files.length > 0) {
                handleFileSelect(questionId, e.dataTransfer.files[0], previewContainer);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(questionId, e.target.files[0], previewContainer);
            }
        });
    });
}

// Handle File Select
function handleFileSelect(questionId, file, previewContainer) {
    // Store file reference
    answers[questionId] = file.name; // In a real app, you'd upload to Firebase Storage

    previewContainer.innerHTML = `
        <div class="file-preview">
            <span>📄</span>
            <span class="file-preview-name">${escapeHtml(file.name)}</span>
            <button type="button" class="file-remove-btn" onclick="removeFile('${questionId}')">✕</button>
        </div>
    `;
}

// Remove File
function removeFile(questionId) {
    delete answers[questionId];
    document.getElementById('filePreview_' + questionId).innerHTML = '';
}

// Recalculate Visibility when answers change
function recalculateVisibility() {
    const oldVisible = [...visibleQuestions];
    calculateVisibleQuestions();

    // Check if visible questions changed
    if (JSON.stringify(oldVisible.map(q => q.id)) !== JSON.stringify(visibleQuestions.map(q => q.id))) {
        // Re-render questions
        renderQuestions();

        // Adjust current index if needed
        if (currentQuestionIndex >= visibleQuestions.length) {
            currentQuestionIndex = visibleQuestions.length - 1;
        }

        showQuestion(currentQuestionIndex);
    }
}

// Show Question
function showQuestion(index, direction = 'next') {
    const slides = document.querySelectorAll('.question-slide');

    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.add('active');
            slide.classList.remove('slide-out-left', 'slide-out-right');
            slide.classList.add(direction === 'next' ? 'slide-in-left' : 'slide-in-right');
        } else {
            slide.classList.remove('active', 'slide-in-left', 'slide-in-right');
        }
    });

    currentQuestionIndex = index;
    updateNavigation();
    updateCounter();
    updateProgress();

    // Focus on input
    setTimeout(() => {
        const activeSlide = slides[index];
        const input = activeSlide?.querySelector('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea, select');
        if (input) input.focus();
    }, 400);
}

// Update Navigation Buttons
function updateNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    const isFirst = currentQuestionIndex === 0;
    const isLast = currentQuestionIndex === visibleQuestions.length - 1;

    prevBtn.style.display = isFirst ? 'none' : 'inline-flex';
    nextBtn.style.display = isLast ? 'none' : 'inline-flex';
    submitBtn.style.display = isLast ? 'inline-flex' : 'none';
}

// Update Counter
function updateCounter() {
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = visibleQuestions.length;
}

// Update Progress Bar
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / visibleQuestions.length) * 100;
    progressBar.style.width = progress + '%';
}

// Setup Event Listeners
function setupEventListeners() {
    // Previous button
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            showQuestion(currentQuestionIndex - 1, 'prev');
        }
    });

    // Next button
    document.getElementById('nextBtn').addEventListener('click', () => {
        if (validateCurrentQuestion()) {
            if (currentQuestionIndex < visibleQuestions.length - 1) {
                showQuestion(currentQuestionIndex + 1, 'next');
            }
        }
    });

    // Submit button
    document.getElementById('submitBtn').addEventListener('click', submitForm);

    // Submit another
    document.getElementById('submitAnotherBtn').addEventListener('click', () => {
        answers = {};
        currentQuestionIndex = 0;
        calculateVisibleQuestions();
        renderQuestions();
        successPage.style.display = 'none';
        formContainer.style.display = 'flex';
        startTime = new Date();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.matches('textarea')) {
            e.preventDefault();

            if (currentQuestionIndex < visibleQuestions.length - 1) {
                if (validateCurrentQuestion()) {
                    showQuestion(currentQuestionIndex + 1, 'next');
                }
            } else {
                submitForm();
            }
        }
    });
}

// Validate Current Question
function validateCurrentQuestion() {
    const question = visibleQuestions[currentQuestionIndex];
    if (!question) return true;

    const answer = answers[question.id];

    // Remove previous error
    const slide = document.querySelector(`.question-slide[data-index="${currentQuestionIndex}"]`);
    slide.querySelectorAll('.validation-error').forEach(e => e.remove());
    slide.querySelectorAll('.error').forEach(e => e.classList.remove('error'));

    // Check required
    if (question.required) {
        const isEmpty = answer === undefined || answer === '' ||
            (Array.isArray(answer) && answer.length === 0);

        if (isEmpty) {
            showValidationError(slide, 'Esta pergunta é obrigatória');
            return false;
        }
    }

    // Email validation
    if (question.type === 'email' && answer) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(answer)) {
            showValidationError(slide, 'Por favor, insira um email válido');
            return false;
        }
    }

    return true;
}

// Show Validation Error
function showValidationError(slide, message) {
    const inputArea = slide.querySelector('.question-input-area');

    // Add error class
    const input = inputArea.querySelector('.public-input, .public-select, .choice-options');
    if (input) input.classList.add('error');

    // Add error message
    inputArea.insertAdjacentHTML('beforeend', `
        <div class="validation-error">
            <span>⚠️</span>
            <span>${message}</span>
        </div>
    `);

    // Shake animation
    slide.querySelector('.question-card-public').style.animation = 'shake 0.4s ease';
    setTimeout(() => {
        slide.querySelector('.question-card-public').style.animation = '';
    }, 400);
}

// Submit Form
async function submitForm() {
    // Validate all questions
    for (let i = 0; i < visibleQuestions.length; i++) {
        currentQuestionIndex = i;
        showQuestion(i);

        if (!validateCurrentQuestion()) {
            return;
        }
    }

    if (isPreview) {
        ArmindoForms.Utils.showToast('Modo de pré-visualização - Respostas não guardadas', 'info');
        showSuccess();
        return;
    }

    try {
        showLoading();

        const endTime = new Date();
        const completionTime = Math.round((endTime - startTime) / 1000);

        await ArmindoForms.Database.responses.submit(formData.id, answers, {
            userAgent: navigator.userAgent,
            completionTime: completionTime
        });

        showSuccess();

    } catch (error) {
        console.error('Error submitting form:', error);
        ArmindoForms.Utils.showToast('Erro ao enviar resposta. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

// Show Success
function showSuccess() {
    formContainer.style.display = 'none';
    progressContainer.style.display = 'none';
    successPage.style.display = 'flex';

    // Update success message
    document.getElementById('successMessage').textContent =
        formData.settings?.confirmationMessage || 'Obrigado pela sua resposta! 🎉';

    // Show submit another button if allowed
    if (formData.settings?.allowMultipleResponses) {
        document.getElementById('submitAnotherBtn').style.display = 'inline-flex';
    }

    // Trigger confetti
    createConfetti();
}

// Create Confetti
function createConfetti() {
    const confettiContainer = document.getElementById('confetti');
    const colors = ['#4A5FE5', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#FFD700'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.animationDuration = (3 + Math.random() * 2) + 's';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confettiContainer.appendChild(confetti);
    }

    // Remove confetti after animation
    setTimeout(() => {
        confettiContainer.innerHTML = '';
    }, 5000);
}

// Show Error
function showError(message) {
    hideLoading();
    document.getElementById('errorMessage').textContent = message;
    errorPage.style.display = 'flex';
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

// Expose to window
window.removeFile = removeFile;
