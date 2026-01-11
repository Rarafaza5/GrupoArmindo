/* ============================================
   ARMINDO FORMS - Analytics Logic
   ============================================ */

// State
let currentUser = null;
let formId = null;
let formData = null;
let responses = [];
let responsesChart = null;
let currentResponseId = null;

// DOM Elements
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!ArmindoForms.initFirebase()) {
        console.error('Failed to initialize Firebase');
        return;
    }

    // Check auth state
    ArmindoForms.Auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadAnalytics();
        } else {
            window.location.href = 'index.html';
        }
    });

    // Setup event listeners
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', loadAnalytics);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('deleteResponseBtn').addEventListener('click', deleteCurrentResponse);
}

// Load Analytics
async function loadAnalytics() {
    try {
        showLoading();

        formId = ArmindoForms.Utils.getUrlParam('id');

        if (!formId) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Load form and responses
        formData = await ArmindoForms.Database.forms.get(formId);

        if (!formData || formData.creatorId !== currentUser.uid) {
            ArmindoForms.Utils.showToast('Formulário não encontrado ou sem permissão', 'error');
            window.location.href = 'dashboard.html';
            return;
        }

        responses = await ArmindoForms.Database.responses.getByForm(formId);

        // Update UI
        document.getElementById('formTitle').textContent = formData.title;
        document.title = formData.title + ' - Analytics - Armindo Forms';

        if (responses.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('analyticsContent').style.display = 'none';
        } else {
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('analyticsContent').style.display = 'block';

            renderStats();
            renderChart();
            renderQuestionsSummary();
            renderResponsesTable();
        }

    } catch (error) {
        console.error('Error loading analytics:', error);
        ArmindoForms.Utils.showToast('Erro ao carregar analytics', 'error');
    } finally {
        hideLoading();
    }
}

// Render Stats
function renderStats() {
    const total = responses.length;

    // Today's responses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayResponses = responses.filter(r => {
        const date = r.submittedAt?.toDate?.() || new Date(r.submittedAt);
        return date >= today;
    }).length;

    // Average completion time
    const timesInSeconds = responses
        .filter(r => r.metadata?.completionTime)
        .map(r => r.metadata.completionTime);

    let avgTime = '-';
    if (timesInSeconds.length > 0) {
        const avg = timesInSeconds.reduce((a, b) => a + b, 0) / timesInSeconds.length;
        if (avg < 60) {
            avgTime = Math.round(avg) + 's';
        } else {
            avgTime = Math.round(avg / 60) + 'min';
        }
    }

    // Update UI
    document.getElementById('totalResponses').textContent = total;
    document.getElementById('todayResponses').textContent = todayResponses;
    document.getElementById('avgTime').textContent = avgTime;
    document.getElementById('completionRate').textContent = '100%'; // All submitted responses are complete
}

// Render Chart
function renderChart() {
    const ctx = document.getElementById('responsesChart').getContext('2d');

    // Group responses by date
    const responsesByDate = {};
    const now = new Date();

    // Initialize last 14 days
    for (let i = 13; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        responsesByDate[key] = 0;
    }

    // Count responses
    responses.forEach(r => {
        const date = r.submittedAt?.toDate?.() || new Date(r.submittedAt);
        const key = date.toISOString().split('T')[0];
        if (responsesByDate.hasOwnProperty(key)) {
            responsesByDate[key]++;
        }
    });

    const labels = Object.keys(responsesByDate).map(date => {
        const d = new Date(date);
        return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
    });

    const data = Object.values(responsesByDate);

    // Destroy existing chart
    if (responsesChart) {
        responsesChart.destroy();
    }

    // Create new chart
    responsesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Respostas',
                data: data,
                borderColor: '#4A5FE5',
                backgroundColor: 'rgba(74, 95, 229, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4A5FE5',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: 'rgba(255, 255, 255, 0.5)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Render Questions Summary
function renderQuestionsSummary() {
    const container = document.getElementById('questionsSummary');
    const questions = formData.questions || [];

    if (questions.length === 0) {
        container.innerHTML = '<p class="text-muted">Sem perguntas</p>';
        return;
    }

    container.innerHTML = questions.map((question, index) => {
        return `
            <div class="question-summary">
                <h4 class="question-summary-title">
                    <span class="question-summary-number">${index + 1}</span>
                    ${escapeHtml(question.title || 'Pergunta sem título')}
                </h4>
                ${renderQuestionAnalytics(question)}
            </div>
        `;
    }).join('');
}

// Render Question Analytics
function renderQuestionAnalytics(question) {
    const questionResponses = responses
        .map(r => r.answers?.[question.id])
        .filter(a => a !== undefined && a !== '');

    if (questionResponses.length === 0) {
        return '<p class="text-muted">Sem respostas</p>';
    }

    // For choice questions, show bar chart
    if (['single_choice', 'multiple_choice', 'dropdown'].includes(question.type)) {
        const counts = {};
        const options = question.options?.options || [];

        options.forEach(opt => counts[opt] = 0);

        questionResponses.forEach(answer => {
            if (Array.isArray(answer)) {
                answer.forEach(a => {
                    if (counts.hasOwnProperty(a)) counts[a]++;
                });
            } else if (counts.hasOwnProperty(answer)) {
                counts[answer]++;
            }
        });

        const maxCount = Math.max(...Object.values(counts), 1);

        return Object.entries(counts).map(([option, count]) => {
            const percentage = (count / maxCount) * 100;
            return `
                <div class="answer-bar">
                    <span class="answer-label" title="${escapeHtml(option)}">${escapeHtml(option)}</span>
                    <div class="answer-bar-fill">
                        <div class="answer-bar-progress" style="width: ${percentage}%"></div>
                    </div>
                    <span class="answer-count">${count} (${Math.round(count / questionResponses.length * 100)}%)</span>
                </div>
            `;
        }).join('');
    }

    // For rating/NPS/scale, show average and distribution
    if (['rating', 'nps', 'scale'].includes(question.type)) {
        const numericResponses = questionResponses.filter(r => typeof r === 'number');

        if (numericResponses.length === 0) {
            return '<p class="text-muted">Sem respostas numéricas</p>';
        }

        const avg = numericResponses.reduce((a, b) => a + b, 0) / numericResponses.length;
        const min = Math.min(...numericResponses);
        const max = Math.max(...numericResponses);

        return `
            <div class="flex gap-xl">
                <div class="stat-card" style="padding: var(--space-md);">
                    <span class="stat-value" style="font-size: var(--font-size-2xl);">${avg.toFixed(1)}</span>
                    <span class="stat-label">Média</span>
                </div>
                <div class="stat-card" style="padding: var(--space-md);">
                    <span class="stat-value" style="font-size: var(--font-size-2xl);">${min}</span>
                    <span class="stat-label">Mínimo</span>
                </div>
                <div class="stat-card" style="padding: var(--space-md);">
                    <span class="stat-value" style="font-size: var(--font-size-2xl);">${max}</span>
                    <span class="stat-label">Máximo</span>
                </div>
            </div>
        `;
    }

    // For Matrix questions
    if (question.type === 'matrix') {
        const rows = question.options?.rows || [];
        const cols = question.options?.columns || [];

        if (rows.length === 0 || cols.length === 0) return '<p class="text-muted">Configuração inválida</p>';

        // Count frequencies: { rowLabel: { colLabel: count } }
        const counts = {};
        rows.forEach(r => {
            counts[r] = {};
            cols.forEach(c => counts[r][c] = 0);
        });

        // Track how many responses actually included this matrix
        let validResponseCount = 0;

        questionResponses.forEach(answer => {
            // answer is an object { rowLabel: colLabel }
            if (typeof answer === 'object' && answer !== null) {
                validResponseCount++;
                Object.entries(answer).forEach(([r, c]) => {
                    // Only count if row and col are still valid options (in case form changed)
                    if (counts[r] && counts[r].hasOwnProperty(c)) {
                        counts[r][c]++;
                    }
                });
            }
        });

        if (validResponseCount === 0) return '<p class="text-muted">Sem respostas</p>';

        // Render stats for each row
        return rows.map(rowLabel => {
            const rowCounts = counts[rowLabel];
            // Find max count in this row to scale bars relative to the most popular option
            const maxVal = Math.max(...Object.values(rowCounts), 1);

            // Sub-chart for this row
            const bars = cols.map(colLabel => {
                const count = rowCounts[colLabel];
                // Percentage for bar width relative to max value
                const widthPct = (count / maxVal) * 100;

                return `
                    <div class="answer-bar-small" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                         <div style="width: 120px; font-size: 0.8rem; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary);" title="${escapeHtml(colLabel)}">${escapeHtml(colLabel)}</div>
                         <div class="answer-bar-fill" style="flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                            <div class="answer-bar-progress" style="width: ${widthPct}%; height: 100%; background: var(--primary); border-radius: 3px; opacity: ${count > 0 ? 1 : 0.3};"></div>
                         </div>
                         <div style="font-size: 0.75rem; width: 30px; text-align: right;">${count}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="matrix-row-stats" style="margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px;">
                    <h5 style="margin-bottom: 10px; font-size: 0.95rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(rowLabel)}</h5>
                    ${bars}
                </div>
            `;
        }).join('');
    }

    // For text questions, show recent responses
    if (['short_text', 'long_text', 'email', 'phone'].includes(question.type)) {
        const recentText = questionResponses.slice(0, 5);

        return `
            <div class="text-responses">
                ${recentText.map(text => `
                    <div class="text-response-item">${escapeHtml(text)}</div>
                `).join('')}
                ${questionResponses.length > 5 ? `
                    <p class="text-muted text-center">+ ${questionResponses.length - 5} mais respostas</p>
                ` : ''}
            </div>
        `;
    }

    return `<p class="text-muted">${questionResponses.length} respostas</p>`;
}

// Render Responses Table
function renderResponsesTable() {
    const tableBody = document.getElementById('responsesTableBody');
    const recentResponses = responses.slice(0, 20);

    tableBody.innerHTML = recentResponses.map(response => {
        const date = ArmindoForms.Utils.formatDate(response.submittedAt);
        const time = response.metadata?.completionTime
            ? (response.metadata.completionTime < 60
                ? response.metadata.completionTime + 's'
                : Math.round(response.metadata.completionTime / 60) + 'min')
            : '-';

        return `
            <tr>
                <td>${date}</td>
                <td>${time}</td>
                <td>
                    <button class="response-detail-btn" onclick="viewResponse('${response.id}')">
                        Ver Detalhes
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// View Response
function viewResponse(responseId) {
    const response = responses.find(r => r.id === responseId);
    if (!response) return;

    currentResponseId = responseId;

    const modalBody = document.getElementById('responseModalBody');
    const questions = formData.questions || [];

    modalBody.innerHTML = `
        <div class="mb-lg">
            <p class="text-muted">${ArmindoForms.Utils.formatDate(response.submittedAt)}</p>
        </div>
        ${questions.map((q, i) => {
        const answer = response.answers?.[q.id];
        let displayAnswer = answer;

        if (Array.isArray(answer)) {
            displayAnswer = answer.join(', ');
        } else if (answer === undefined || answer === '') {
            displayAnswer = '<em class="text-muted">Não respondido</em>';
        } else if (typeof answer === 'object' && answer !== null) {
            // Handle Matrix or unknown objects
            if (q.type === 'matrix') {
                displayAnswer = '<table class="matrix-response-table" style="width: 100%; font-size: 0.9rem; margin-top: 5px;">';
                Object.entries(answer).forEach(([row, col]) => {
                    displayAnswer += `<tr>
                         <td style="color: var(--text-secondary); padding: 4px 0; width: 50%;">${escapeHtml(row)}</td>
                         <td style="padding: 4px 0; font-weight: 500;">${escapeHtml(col)}</td>
                     </tr>`;
                });
                displayAnswer += '</table>';
            } else {
                displayAnswer = JSON.stringify(answer);
            }
        }

        return `
                <div class="question-summary">
                    <h4 class="question-summary-title">
                        <span class="question-summary-number">${i + 1}</span>
                        ${escapeHtml(q.title || 'Pergunta sem título')}
                    </h4>
                    <div class="response-value">${typeof displayAnswer === 'string' ? displayAnswer : escapeHtml(String(displayAnswer))}</div>
                </div>
            `;
    }).join('')}
`;

    document.getElementById('responseModal').classList.add('active');
}

// Close Response Modal
function closeResponseModal() {
    document.getElementById('responseModal').classList.remove('active');
    currentResponseId = null;
}

// Delete Current Response
async function deleteCurrentResponse() {
    if (!currentResponseId) return;

    if (!confirm('Tem a certeza que deseja eliminar esta resposta?')) return;

    try {
        showLoading();
        await ArmindoForms.Database.responses.delete(currentResponseId);
        closeResponseModal();
        await loadAnalytics();
        ArmindoForms.Utils.showToast('Resposta eliminada', 'success');
    } catch (error) {
        console.error('Error deleting response:', error);
        ArmindoForms.Utils.showToast('Erro ao eliminar resposta', 'error');
    } finally {
        hideLoading();
    }
}

// Export to CSV
function exportToCSV() {
    if (responses.length === 0) {
        ArmindoForms.Utils.showToast('Sem respostas para exportar', 'warning');
        return;
    }

    const questions = formData.questions || [];

    // Build CSV data
    const data = responses.map(response => {
        const row = {
            'Data': ArmindoForms.Utils.formatDate(response.submittedAt),
            'Tempo (s)': response.metadata?.completionTime || ''
        };

        questions.forEach((q, i) => {
            const answer = response.answers?.[q.id];

            if (Array.isArray(answer)) {
                row[q.title || `Pergunta ${i + 1} `] = answer.join('; ');
            } else if (typeof answer === 'object' && answer !== null) {
                // Handle matrix or other objects
                row[q.title || `Pergunta ${i + 1} `] = Object.entries(answer)
                    .map(([k, v]) => `${k}: ${v} `)
                    .join(' | ');
            } else {
                row[q.title || `Pergunta ${i + 1} `] = answer || '';
            }
        });

        return row;
    });

    const filename = `${formData.title.replace(/[^a-z0-9]/gi, '_')}_respostas_${new Date().toISOString().split('T')[0]}.csv`;
    ArmindoForms.Utils.downloadCSV(data, filename);

    ArmindoForms.Utils.showToast('Ficheiro CSV descarregado', 'success');
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

// Close modal on overlay click
document.getElementById('responseModal').addEventListener('click', (e) => {
    if (e.target.id === 'responseModal') closeResponseModal();
});

// Expose to window
window.viewResponse = viewResponse;
window.closeResponseModal = closeResponseModal;
