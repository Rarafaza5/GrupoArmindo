/* ============================================
   VIEWER ENGINE - PUBLIC RUNNER
   ============================================ */

let formId = null;
let formData = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize
    if (typeof ArmindoForms !== 'undefined' && ArmindoForms.initFirebase) {
        ArmindoForms.initFirebase();
    }

    // 2. Get ID
    const params = new URLSearchParams(window.location.search);
    formId = params.get('id');
    const isPreview = params.get('preview') === 'true';

    if (!formId) {
        alert('ID do formulário não encontrado.');
        return;
    }

    // 3. Load Data
    try {
        const doc = await firebase.firestore().collection('forms').doc(formId).get();
        if (!doc.exists) {
            document.getElementById('loading').innerHTML = '<p style="color:white">Formulário não encontrado.</p>';
            return;
        }

        formData = doc.data();

        // Check Status (unless preview)
        if (formData.status !== 'active' && !isPreview) {
            document.getElementById('loading').innerHTML = '<p style="color:white">Este formulário ainda não está público.</p>';
            return;
        }

        if (formData.settings && formData.settings.requireLogin) {
            // Auth check placeholder (future Phase)
        }

        // Limit Check
        if (formData.settings && formData.settings.limitOneResponse) {
            const hasResponded = localStorage.getItem(`responded_${formId}`);
            if (hasResponded) {
                document.body.innerHTML = '<div style="color:white;text-align:center;padding:50px"><h2>Já respondeu a este formulário.</h2><p class="text-dim">Apenas uma resposta é permitida.</p></div>';
                return;
            }
        }

        renderForm();
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('mainContainer').classList.remove('hidden');

    } catch (e) {
        console.error(e);
        document.getElementById('loading').innerHTML = '<p style="color:white">Erro ao carregar o formulário. Tente recarregar.</p>';
    }
});


function renderForm() {
    // 1. Theme Application
    if (formData.theme) {
        const root = document.documentElement;
        if (formData.theme.primaryColor) {
            root.style.setProperty('--primary', formData.theme.primaryColor);
        }
        if (formData.theme.fontFamily) {
            root.style.setProperty('--font', formData.theme.fontFamily);
        }
        if (formData.theme.borderRadius) {
            root.style.setProperty('--radius', formData.theme.borderRadius);
        }
        if (formData.theme.backgroundColor) {
            root.style.setProperty('--bg-page', formData.theme.backgroundColor);
            // Re-trigger mesh update if needed, but CSS var usually handles it
        }
        if (formData.theme.logoUrl) {
            const logo = document.getElementById('formLogo');
            logo.src = formData.theme.logoUrl;
            logo.style.display = 'inline-block';
        }
        if (formData.theme.buttonText) {
            document.getElementById('submitBtn').innerText = formData.theme.buttonText;
        }
    }

    // 2. Header
    document.getElementById('formTitleView').textContent = formData.title;
    document.getElementById('formDescView').textContent = formData.description;
    document.title = formData.title + " - Grupo Armindo";

    // 3. Questions
    const container = document.getElementById('questionsContainer');
    container.innerHTML = formData.questions.map((q, index) => renderQuestionHTML(q, index)).join('');

    // 4. Submit Handler
    document.getElementById('publicForm').onsubmit = handleSubmit;
}

function renderQuestionHTML(q, index) {
    const reqMark = q.required ? '<span class="q-req">*</span>' : '';
    let inputHTML = '';

    switch (q.type) {
        case 'short_text':
            inputHTML = `<input type="text" name="${q.id}" ${q.required ? 'required' : ''} placeholder="A sua resposta...">`;
            break;
        case 'long_text':
            inputHTML = `<textarea name="${q.id}" rows="4" ${q.required ? 'required' : ''} placeholder="A sua resposta..."></textarea>`;
            break;
        case 'single_choice':
            inputHTML = q.options.options.map((opt, i) => `
                <label class="option-label">
                    <input type="radio" class="option-input" name="${q.id}" value="${opt}" ${q.required && i === 0 ? 'required' : ''}>
                    <span>${opt}</span>
                </label>
            `).join('');
            break;
        case 'multiple_choice':
            inputHTML = q.options.options.map(opt => `
                <label class="option-label">
                    <input type="checkbox" class="option-input" name="${q.id}" value="${opt}">
                    <span>${opt}</span>
                </label>
            `).join('');
            break;
        case 'dropdown':
            inputHTML = `
                <select name="${q.id}" ${q.required ? 'required' : ''}>
                    <option value="">Selecione uma opção...</option>
                    ${q.options.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            `;
            break;
        case 'rating':
            inputHTML = `
                <div class="rating-group" id="rating_${q.id}">
                    ${[1, 2, 3, 4, 5].map(v => `
                        <button type="button" class="star-btn" data-value="${v}" onclick="handleRatingClick('${q.id}', ${v})">
                            <i class="fa-regular fa-star"></i>
                        </button>
                    `).join('')}
                    <input type="hidden" name="${q.id}" id="input_${q.id}" ${q.required ? 'required' : ''}>
                </div>
            `;
            break;
        case 'nps':
            inputHTML = `
                <div class="nps-container">
                    <div class="nps-scale">
                        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => `
                            <label class="nps-label">
                                <input type="radio" name="${q.id}" value="${v}" ${q.required ? 'required' : ''} class="hidden">
                                <span>${v}</span>
                            </label>
                        `).join('')}
                    </div>
                    <div class="nps-labels">
                        <span>Nada Provável</span>
                        <span>Extremamente Provável</span>
                    </div>
                </div>
            `;
            break;
        default:
            inputHTML = `<p class="text-dim">Tipo de pergunta não suportado (${q.type})</p>`;
    }

    return `
        <div class="q-card" style="animation-delay: ${index * 0.1}s">
            <label class="q-title">${q.title} ${reqMark}</label>
            ${inputHTML}
        </div>
    `;
}

async function handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = 'A enviar...';

    // Harvest Data
    const formDataObj = new FormData(e.target);
    const answers = {};

    // Process form data
    for (let [key, value] of formDataObj.entries()) {
        if (answers[key]) {
            if (!Array.isArray(answers[key])) answers[key] = [answers[key]];
            answers[key].push(value);
        } else {
            answers[key] = value;
        }
    }

    try {
        await firebase.firestore().collection('responses').add({
            formId: formId,
            answers: answers,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('mainContainer').classList.add('hidden');
        document.getElementById('successView').classList.remove('hidden');

        // Custom Message
        if (formData.settings && formData.settings.successMessage) {
            const msgEl = document.getElementById('successMsgText');
            if (msgEl) msgEl.innerText = formData.settings.successMessage;
        }

        // Set Local Storage Flag
        if (formData.settings && formData.settings.limitOneResponse) {
            localStorage.setItem(`responded_${formId}`, 'true');
        }

    } catch (err) {
        console.error(err);
        alert('Erro ao enviar. Tente novamente.');
        btn.disabled = false;
        btn.innerText = 'Enviar';
    }
}

function handleRatingClick(qId, value) {
    const container = document.getElementById(`rating_${qId}`);
    const input = document.getElementById(`input_${qId}`);
    input.value = value;

    const stars = container.querySelectorAll('.star-btn i');
    stars.forEach((star, idx) => {
        if (idx < value) {
            star.classList.replace('fa-regular', 'fa-solid');
        } else {
            star.classList.replace('fa-solid', 'fa-regular');
        }
    });
}
