/* ============================================
   ARMINDO FORMS - Templates Logic
   ============================================ */

// Predefined Templates
const TEMPLATES = [
    {
        id: 'feedback-servico',
        title: 'Feedback de Serviço',
        description: 'Recolha opiniões sobre a qualidade do seu serviço ou produto. Perfeito para melhorar a experiência do cliente.',
        icon: '⭐',
        category: 'feedback',
        popular: true,
        questions: [
            {
                id: 'q1',
                type: 'rating',
                title: 'Como avalia a sua experiência geral connosco?',
                required: true,
                options: { max: 5 }
            },
            {
                id: 'q2',
                type: 'matrix',
                title: 'Avalie os seguintes aspetos do nosso serviço:',
                required: true,
                options: {
                    rows: ['Qualidade do atendimento', 'Rapidez do serviço', 'Relação qualidade/preço', 'Simpatia da equipa', 'Instalações/Ambiente'],
                    columns: ['Muito Insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito Satisfeito']
                }
            },
            {
                id: 'q3',
                type: 'nps',
                title: 'Qual a probabilidade de nos recomendar a um amigo ou colega?',
                required: true
            },
            {
                id: 'q4',
                type: 'long_text',
                title: 'O que podemos fazer para melhorar?',
                required: false
            },
            {
                id: 'q5',
                type: 'single_choice',
                title: 'Voltaria a utilizar os nossos serviços?',
                required: true,
                options: { options: ['Sim, com certeza', 'Provavelmente sim', 'Talvez', 'Provavelmente não', 'Não'] }
            }
        ]
    },
    {
        id: 'avaliacao-evento',
        title: 'Avaliação de Evento',
        description: 'Avalie a satisfação dos participantes após conferências, workshops, festas ou qualquer tipo de evento.',
        icon: '🎉',
        category: 'event',
        popular: true,
        questions: [
            {
                id: 'q1',
                type: 'rating',
                title: 'Como avalia o evento no geral?',
                required: true,
                options: { max: 5 }
            },
            {
                id: 'q2',
                type: 'matrix',
                title: 'Avalie os seguintes aspetos do evento:',
                required: true,
                options: {
                    rows: ['Organização', 'Local/Espaço', 'Conteúdo/Programa', 'Oradores/Animação', 'Catering/Comida', 'Networking'],
                    columns: ['Muito Fraco', 'Fraco', 'Razoável', 'Bom', 'Excelente']
                }
            },
            {
                id: 'q3',
                type: 'single_choice',
                title: 'Como soube deste evento?',
                required: true,
                options: { options: ['Redes sociais', 'Email/Newsletter', 'Amigo/Colega', 'Website', 'Outro'] }
            },
            {
                id: 'q4',
                type: 'multiple_choice',
                title: 'Que tipo de eventos gostaria de ver no futuro?',
                required: false,
                options: { options: ['Workshops práticos', 'Conferências', 'Networking events', 'Festas/Celebrações', 'Formações', 'Team building'] }
            },
            {
                id: 'q5',
                type: 'long_text',
                title: 'Comentários ou sugestões adicionais',
                required: false
            }
        ]
    },
    {
        id: 'satisfacao-cliente',
        title: 'Satisfação do Cliente',
        description: 'Inquérito completo para medir a satisfação dos seus clientes com múltiplos pontos de avaliação.',
        icon: '😊',
        category: 'feedback',
        questions: [
            {
                id: 'q1',
                type: 'single_choice',
                title: 'Há quanto tempo é nosso cliente?',
                required: true,
                options: { options: ['Menos de 1 mês', '1-6 meses', '6-12 meses', '1-2 anos', 'Mais de 2 anos'] }
            },
            {
                id: 'q2',
                type: 'matrix',
                title: 'Avalie a sua satisfação com os seguintes aspetos:',
                required: true,
                options: {
                    rows: ['Qualidade dos produtos/serviços', 'Atendimento ao cliente', 'Preços praticados', 'Facilidade de contacto', 'Resolução de problemas', 'Website/App'],
                    columns: ['Muito Insatisfeito', 'Insatisfeito', 'Neutro', 'Satisfeito', 'Muito Satisfeito']
                }
            },
            {
                id: 'q3',
                type: 'nps',
                title: 'De 0 a 10, qual a probabilidade de nos recomendar?',
                required: true
            },
            {
                id: 'q4',
                type: 'long_text',
                title: 'O que mais gosta em nós?',
                required: false
            },
            {
                id: 'q5',
                type: 'long_text',
                title: 'O que devemos melhorar?',
                required: false
            }
        ]
    },
    {
        id: 'candidatura-emprego',
        title: 'Formulário de Candidatura',
        description: 'Recolha candidaturas para posições de emprego com informações pessoais, experiência e motivação.',
        icon: '💼',
        category: 'hr',
        questions: [
            {
                id: 'q1',
                type: 'short_text',
                title: 'Nome completo',
                required: true
            },
            {
                id: 'q2',
                type: 'email',
                title: 'Email',
                required: true
            },
            {
                id: 'q3',
                type: 'phone',
                title: 'Telefone',
                required: true
            },
            {
                id: 'q4',
                type: 'dropdown',
                title: 'Posição a que se candidata',
                required: true,
                options: { options: ['Assistente Administrativo', 'Técnico de Marketing', 'Programador', 'Designer', 'Gestor de Projetos', 'Outro'] }
            },
            {
                id: 'q5',
                type: 'single_choice',
                title: 'Anos de experiência na área',
                required: true,
                options: { options: ['Sem experiência', '1-2 anos', '3-5 anos', '5-10 anos', 'Mais de 10 anos'] }
            },
            {
                id: 'q6',
                type: 'long_text',
                title: 'Fale-nos um pouco sobre si e a sua experiência',
                required: true
            },
            {
                id: 'q7',
                type: 'long_text',
                title: 'Porque gostaria de trabalhar connosco?',
                required: true
            },
            {
                id: 'q8',
                type: 'single_choice',
                title: 'Disponibilidade para começar',
                required: true,
                options: { options: ['Imediata', 'Em 1-2 semanas', 'Em 1 mês', 'Em 2-3 meses', 'A combinar'] }
            }
        ]
    },
    {
        id: 'inscricao-evento',
        title: 'Inscrição em Evento',
        description: 'Formulário para registar participantes em eventos, workshops, conferências ou formações.',
        icon: '📝',
        category: 'event',
        questions: [
            {
                id: 'q1',
                type: 'short_text',
                title: 'Nome completo',
                required: true
            },
            {
                id: 'q2',
                type: 'email',
                title: 'Email',
                required: true
            },
            {
                id: 'q3',
                type: 'phone',
                title: 'Telefone',
                required: false
            },
            {
                id: 'q4',
                type: 'short_text',
                title: 'Organização/Empresa',
                required: false
            },
            {
                id: 'q5',
                type: 'single_choice',
                title: 'Tem restrições alimentares?',
                required: true,
                options: { options: ['Não', 'Vegetariano', 'Vegan', 'Sem glúten', 'Sem lactose', 'Outra'] }
            },
            {
                id: 'q6',
                type: 'single_choice',
                title: 'Como soube deste evento?',
                required: true,
                options: { options: ['Redes sociais', 'Email', 'Amigo/Colega', 'Website', 'Outro'] }
            },
            {
                id: 'q7',
                type: 'long_text',
                title: 'Questões ou comentários',
                required: false
            }
        ]
    },
    {
        id: 'avaliacao-formacao',
        title: 'Avaliação de Formação',
        description: 'Avalie a qualidade de cursos, workshops ou sessões de formação com feedback detalhado.',
        icon: '📚',
        category: 'education',
        questions: [
            {
                id: 'q1',
                type: 'short_text',
                title: 'Nome da formação que frequentou',
                required: true
            },
            {
                id: 'q2',
                type: 'matrix',
                title: 'Avalie os seguintes aspetos da formação:',
                required: true,
                options: {
                    rows: ['Conteúdo programático', 'Qualidade dos materiais', 'Competência do formador', 'Metodologia de ensino', 'Aplicabilidade prática', 'Duração da formação'],
                    columns: ['Muito Fraco', 'Fraco', 'Satisfatório', 'Bom', 'Excelente']
                }
            },
            {
                id: 'q3',
                type: 'rating',
                title: 'Avaliação geral da formação',
                required: true,
                options: { max: 5 }
            },
            {
                id: 'q4',
                type: 'single_choice',
                title: 'Os objetivos da formação foram atingidos?',
                required: true,
                options: { options: ['Sim, totalmente', 'Sim, parcialmente', 'Não'] }
            },
            {
                id: 'q5',
                type: 'long_text',
                title: 'O que mais gostou na formação?',
                required: false
            },
            {
                id: 'q6',
                type: 'long_text',
                title: 'O que pode ser melhorado?',
                required: false
            },
            {
                id: 'q7',
                type: 'single_choice',
                title: 'Recomendaria esta formação a colegas?',
                required: true,
                options: { options: ['Sim, com certeza', 'Provavelmente sim', 'Talvez', 'Provavelmente não', 'Não'] }
            }
        ]
    },
    {
        id: 'pesquisa-mercado',
        title: 'Pesquisa de Mercado',
        description: 'Recolha insights sobre o mercado, concorrência e preferências dos consumidores.',
        icon: '📊',
        category: 'survey',
        questions: [
            {
                id: 'q1',
                type: 'single_choice',
                title: 'Qual a sua faixa etária?',
                required: true,
                options: { options: ['18-24 anos', '25-34 anos', '35-44 anos', '45-54 anos', '55-64 anos', '65+ anos'] }
            },
            {
                id: 'q2',
                type: 'single_choice',
                title: 'Qual o seu género?',
                required: false,
                options: { options: ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'] }
            },
            {
                id: 'q3',
                type: 'multiple_choice',
                title: 'Quais os canais que utiliza para descobrir novos produtos/serviços?',
                required: true,
                options: { options: ['Instagram', 'Facebook', 'TikTok', 'Google', 'YouTube', 'Recomendações de amigos', 'Publicidade tradicional', 'Outro'] }
            },
            {
                id: 'q4',
                type: 'matrix',
                title: 'Qual a importância dos seguintes fatores na sua decisão de compra?',
                required: true,
                options: {
                    rows: ['Preço', 'Qualidade', 'Marca', 'Sustentabilidade', 'Conveniência', 'Recomendações'],
                    columns: ['Nada Importante', 'Pouco Importante', 'Neutro', 'Importante', 'Muito Importante']
                }
            },
            {
                id: 'q5',
                type: 'scale',
                title: 'Qual o seu orçamento mensal médio para este tipo de produto/serviço?',
                required: true,
                options: { min: 1, max: 5, minLabel: '< 50€', maxLabel: '> 500€' }
            },
            {
                id: 'q6',
                type: 'long_text',
                title: 'Que funcionalidades/características gostaria de ver num produto ideal?',
                required: false
            }
        ]
    },
    {
        id: 'votacao',
        title: 'Votação / Eleição',
        description: 'Sistema simples de votação para escolher entre opções, eleger representantes ou decidir questões.',
        icon: '🗳️',
        category: 'survey',
        questions: [
            {
                id: 'q1',
                type: 'email',
                title: 'Email (para validar o voto)',
                required: true
            },
            {
                id: 'q2',
                type: 'single_choice',
                title: 'Qual a sua escolha?',
                description: 'Selecione apenas uma opção',
                required: true,
                options: { options: ['Opção A', 'Opção B', 'Opção C', 'Abstenção'] }
            },
            {
                id: 'q3',
                type: 'long_text',
                title: 'Comentário ou justificação (opcional)',
                required: false
            }
        ]
    },
    {
        id: 'avaliacao-colaborador',
        title: 'Avaliação de Desempenho',
        description: 'Avalie o desempenho de colaboradores com métricas detalhadas e feedback construtivo.',
        icon: '👔',
        category: 'hr',
        questions: [
            {
                id: 'q1',
                type: 'short_text',
                title: 'Nome do colaborador avaliado',
                required: true
            },
            {
                id: 'q2',
                type: 'short_text',
                title: 'Departamento',
                required: true
            },
            {
                id: 'q3',
                type: 'matrix',
                title: 'Avalie o desempenho nas seguintes competências:',
                required: true,
                options: {
                    rows: ['Qualidade do trabalho', 'Produtividade', 'Pontualidade', 'Trabalho em equipa', 'Comunicação', 'Iniciativa', 'Resolução de problemas', 'Adaptabilidade'],
                    columns: ['Insuficiente', 'Precisa Melhorar', 'Satisfatório', 'Bom', 'Excelente']
                }
            },
            {
                id: 'q4',
                type: 'rating',
                title: 'Avaliação global de desempenho',
                required: true,
                options: { max: 5 }
            },
            {
                id: 'q5',
                type: 'long_text',
                title: 'Pontos fortes do colaborador',
                required: true
            },
            {
                id: 'q6',
                type: 'long_text',
                title: 'Áreas a desenvolver/melhorar',
                required: true
            },
            {
                id: 'q7',
                type: 'long_text',
                title: 'Objetivos para o próximo período',
                required: false
            }
        ]
    },
    {
        id: 'quiz-conhecimentos',
        title: 'Quiz de Conhecimentos',
        description: 'Crie quizzes para testar conhecimentos, avaliar formações ou fazer jogos educativos.',
        icon: '🧠',
        category: 'education',
        questions: [
            {
                id: 'q1',
                type: 'short_text',
                title: 'Nome do participante',
                required: true
            },
            {
                id: 'q2',
                type: 'single_choice',
                title: 'Pergunta 1: Qual é a capital de Portugal?',
                required: true,
                options: { options: ['Porto', 'Lisboa', 'Coimbra', 'Faro'] }
            },
            {
                id: 'q3',
                type: 'single_choice',
                title: 'Pergunta 2: Qual o ano da Revolução dos Cravos?',
                required: true,
                options: { options: ['1970', '1974', '1976', '1980'] }
            },
            {
                id: 'q4',
                type: 'multiple_choice',
                title: 'Pergunta 3: Quais são países lusófonos?',
                description: 'Selecione todas as opções corretas',
                required: true,
                options: { options: ['Brasil', 'Angola', 'Espanha', 'Moçambique', 'Cabo Verde', 'Argentina'] }
            },
            {
                id: 'q5',
                type: 'short_text',
                title: 'Pergunta 4: Quem escreveu "Os Lusíadas"?',
                required: true
            }
        ]
    }
];

// State
let currentUser = null;
let selectedTemplate = null;
let currentCategory = 'all';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ArmindoForms.initFirebase();

    // Check auth state
    ArmindoForms.Auth.onAuthStateChanged((user) => {
        currentUser = user;
    });

    // Setup event listeners
    setupEventListeners();

    // Render templates
    renderTemplates();
});

// Setup Event Listeners
function setupEventListeners() {
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.dataset.category;
            renderTemplates();
        });
    });

    // Use template button
    document.getElementById('useTemplateBtn').addEventListener('click', useSelectedTemplate);

    // Search listener
    document.getElementById('searchTemplate').addEventListener('input', (e) => {
        renderTemplates(e.target.value);
    });
}

// Render Templates
function renderTemplates(searchQuery = '') {
    const grid = document.getElementById('templatesGrid');
    const query = searchQuery.toLowerCase();

    // Filter by category and search
    const filteredTemplates = TEMPLATES.filter(t => {
        const matchesCategory = currentCategory === 'all' || t.category === currentCategory;
        const matchesSearch = t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
    });

    // Start with "Blank Form" card if showing all and no search (or if explicitly desired)
    let html = '';

    if (currentCategory === 'all' && !query) {
        html += `
        <div class="template-card blank-card" onclick="window.location.href='editor.html'">
            <div class="template-preview">
                <span>➕</span>
            </div>
            <div class="template-content">
                <h3 class="template-title">Começar do Zero</h3>
                <p class="template-description">Crie um formulário totalmente personalizado sem contéudo pré-definido.</p>
                <div class="template-meta">
                    <span class="template-meta-item">
                        <span>📄</span>
                        Formulário em branco
                    </span>
                </div>
            </div>
            <div class="template-actions">
                <div style="grid-column: 1 / -1;">
                    <a href="editor.html" class="btn btn-primary" style="width: 100%; display: flex; justify-content: center;">
                        <span>🚀</span>
                        <span>Criar Agora</span>
                    </a>
                </div>
            </div>
        </div>`;
    }

    if (filteredTemplates.length === 0 && !html) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <h3 style="color: var(--text-secondary);">Nenhum template encontrado</h3>
                <p class="text-muted">Tente outra categoria ou termo de pesquisa</p>
            </div>
        `;
        return;
    }

    html += filteredTemplates.map(template => `
        <div class="template-card" data-id="${template.id}">
            <div class="template-preview">
                <span>${template.icon}</span>
                ${template.popular ? '<span class="template-badge">Popular</span>' : ''}
            </div>
            <div class="template-content">
                <h3 class="template-title">${template.title}</h3>
                <p class="template-description">${template.description}</p>
                <div class="template-meta">
                    <span class="template-meta-item">
                        <span>📝</span>
                        ${template.questions.length} perguntas
                    </span>
                </div>
            </div>
            <div class="template-actions">
                <button class="btn btn-secondary preview-btn" data-id="${template.id}">
                    <span>👁️</span>
                    <span>Ver</span>
                </button>
                <button class="btn btn-primary use-btn" data-id="${template.id}">
                    <span>✨</span>
                    <span>Usar</span>
                </button>
            </div>
        </div>
    `).join('');

    grid.innerHTML = html;

    // Add event listeners to buttons
    grid.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            previewTemplate(btn.dataset.id);
        });
    });

    grid.querySelectorAll('.use-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedTemplate = TEMPLATES.find(t => t.id === btn.dataset.id);
            useSelectedTemplate();
        });
    });

    grid.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            previewTemplate(card.dataset.id);
        });
    });
}

// Preview Template
function previewTemplate(templateId) {
    selectedTemplate = TEMPLATES.find(t => t.id === templateId);
    if (!selectedTemplate) return;

    document.getElementById('previewTitle').textContent = selectedTemplate.title;
    document.getElementById('previewDescription').textContent = selectedTemplate.description;

    const questionsContainer = document.getElementById('previewQuestions');
    questionsContainer.innerHTML = selectedTemplate.questions.map((q, i) => {
        const type = ArmindoForms.QuestionTypes[q.type] || { name: q.type, icon: '❓' };
        return `
            <div class="preview-question">
                <div class="preview-question-header">
                    <span class="preview-question-number">${i + 1}</span>
                    <span class="preview-question-type">${type.icon} ${type.name}</span>
                    ${q.required ? '<span class="badge badge-primary">Obrigatória</span>' : ''}
                </div>
                <p class="preview-question-title">${q.title}</p>
            </div>
        `;
    }).join('');

    document.getElementById('previewModal').classList.add('active');
}

// Close Preview Modal
function closePreviewModal() {
    document.getElementById('previewModal').classList.remove('active');
}

// Use Selected Template
async function useSelectedTemplate() {
    if (!selectedTemplate) return;

    if (!currentUser) {
        ArmindoForms.Utils.showToast('Faça login para criar um formulário', 'warning');
        window.location.href = 'index.html';
        return;
    }

    try {
        document.getElementById('loadingOverlay').style.display = 'flex';

        // Create form from template
        const formData = {
            ...ArmindoForms.DefaultForm,
            title: selectedTemplate.title,
            description: selectedTemplate.description,
            creatorId: currentUser.uid,
            questions: selectedTemplate.questions.map(q => ({
                ...q,
                id: ArmindoForms.Utils.generateId()
            }))
        };

        const formId = await ArmindoForms.Database.forms.create(formData);

        // Redirect to editor
        window.location.href = `editor.html?id=${formId}`;

    } catch (error) {
        console.error('Error creating form from template:', error);
        ArmindoForms.Utils.showToast('Erro ao criar formulário', 'error');
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// Close modal on overlay click
document.getElementById('previewModal').addEventListener('click', (e) => {
    if (e.target.id === 'previewModal') closePreviewModal();
});

// Escape key to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreviewModal();
});

// Expose functions
window.closePreviewModal = closePreviewModal;
