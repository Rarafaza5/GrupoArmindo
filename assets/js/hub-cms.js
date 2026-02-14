/* =========================================
   HUB CMS - Dynamic Content Manager
   © 2026 Grupo Armindo
   ========================================= */

const CMS = (function () {
    // Firebase Config (Shared)
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

    let db;

    // =========================================
    // INITIAL DATA (For Seeding)
    // =========================================

    const initialProjects = [
        {
            title: "Risco Coletivo 2025",
            description: "Participe do maior canvas colaborativo da comunidade. Crie pixel art em tempo real, colabore em eventos e deixe sua marca no mural infinito.",
            icon: "🎨",
            link: "https://grupoarmindo.site/RiscoColetivo/",
            badges: ["Interativo", "200x200 Canvas"],
            style: { colSpan: 8, rowSpan: 2 },
            order: 1
        },
        {
            title: "Armindo News",
            description: "Jornalismo independente e cultura digital.",
            icon: "📰",
            link: "/armindonews",
            badges: ["Live"],
            style: { colSpan: 4, rowSpan: 1 },
            order: 2
        },
        {
            title: "LifeVerse",
            description: "Simulador de vida real. Crie sua história.",
            icon: "🧬",
            link: "/life-verse",
            badges: ["Beta"],
            style: { colSpan: 4, rowSpan: 1 },
            order: 3
        },
        {
            title: "Eurovisão 2026",
            description: "Cobertura completa, previsões e votações da comunidade para o maior evento musical da Europa.",
            icon: "🎤",
            link: "#", // Placeholder/modal if needed, or link to article
            badges: ["Em Breve"],
            style: { colSpan: 6, rowSpan: 1 },
            order: 4
        },
        {
            title: "Armindo Forms",
            description: "Crie formulários inteligentes e responsivos com analytics integrados.",
            icon: "📝",
            link: "/forms/",
            badges: ["Ferramenta"],
            style: { colSpan: 6, rowSpan: 1 },
            order: 5
        },
        {
            title: "Armindo-Cast",
            description: "O podcast oficial. Debates semanais sobre tecnologia, cultura e o universo Grupo Armindo.",
            icon: "🎙️",
            link: "/armindocast",
            badges: ["Podcast", "Novos episódios às sextas"],
            style: { colSpan: 12, rowSpan: 1 },
            order: 6
        }
    ];

    const initialTeam = [
        { name: "Rafael Diogo", role: "Presidente", icon: "👑", badges: [], style: { colSpan: 4 } },
        { name: "Jorge Figueira", role: "Vice-Presidente", icon: "⚜️", badges: ["Liderança"], style: { colSpan: 4 } },
        { name: "Ana Ferreira", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Xavier Silva", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "André Gonçalves", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Camile Hasse", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Haku Fortunato", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Melissa Figueiredo", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Mila Loureiro", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Eduardo Pessoa", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Nico Guedes", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Afonso Martins", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Cecília Fernández", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 4 } },
        { name: "Eya Daghfous", role: "Membro", icon: "⭐", badges: [], style: { colSpan: 8 } }
    ];

    // =========================================
    // INITIALIZATION
    // =========================================

    function init() {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();

        // Detect page and load content
        if (document.getElementById('cms-projects-container')) {
            loadProjects();
        }
        if (document.getElementById('cms-team-container')) {
            loadTeam();
        }

        // Always load global config (Motto, Ticker)
        loadGlobalConfig();
    }

    // =========================================
    // CORE FUNCTIONS
    // =========================================

    async function loadProjects() {
        const container = document.getElementById('cms-projects-container');
        // Skeleton / Loading state could go here

        try {
            const snapshot = await db.collection('hub_projects').orderBy('order').get();

            if (snapshot.empty) {
                console.warn('CMS: No projects found. Using fallback/seeding.');
                // Optionally auto-seed or show static backup
                renderProjects(container, initialProjects);
                return;
            }

            const projects = snapshot.docs.map(doc => doc.data());
            renderProjects(container, projects);

            // Re-trigger animations
            if (window.initScrollReveal) window.initScrollReveal();
            if (window.initTiltEffect) window.initTiltEffect();

        } catch (error) {
            console.error("CMS Error loading projects:", error);
            renderProjects(container, initialProjects); // Fallback
        }
    }

    async function loadTeam() {
        const container = document.getElementById('cms-team-container');

        try {
            const snapshot = await db.collection('hub_team').orderBy('order').get();

            if (snapshot.empty) {
                renderTeam(container, initialTeam); // Fallback
                return;
            }

            const members = snapshot.docs.map(doc => doc.data());
            renderTeam(container, members);

            // Re-trigger animations
            if (window.initScrollReveal) window.initScrollReveal();
            if (window.initTiltEffect) window.initTiltEffect();

        } catch (error) {
            console.error("CMS Error loading team:", error);
            renderTeam(container, initialTeam);
        }
    }

    // =========================================
    // RENDERERS
    // =========================================

    function renderProjects(container, projects) {
        container.innerHTML = projects.map(p => {
            const colClass = `col-span-${p.style?.colSpan || 4}`;
            const rowClass = p.style?.rowSpan ? `row-span-${p.style.rowSpan}` : '';
            const badgesHtml = p.badges ? p.badges.map(b => `<span class="card-badge">${b}</span>`).join('') : '';
            const linkTarget = p.link && p.link.startsWith('http') ? 'target="_blank"' : '';

            // If it's a link (has href)
            if (p.link && p.link !== '#') {
                return `
                <a href="${p.link}" ${linkTarget} class="bento-card ${colClass} ${rowClass}">
                    <div class="highlight-bg"></div>
                    <div class="card-icon">${p.icon}</div>
                    <div>
                        <h3 class="card-title">${p.title}</h3>
                        <p class="card-desc">${p.description}</p>
                    </div>
                    <div class="card-meta">
                        ${badgesHtml}
                    </div>
                </a>`;
            } else {
                // Non-clickable card
                return `
                <div class="bento-card ${colClass} ${rowClass}">
                    <div class="highlight-bg"></div>
                    <div class="card-icon">${p.icon}</div>
                    <div>
                        <h3 class="card-title">${p.title}</h3>
                        <p class="card-desc">${p.description}</p>
                    </div>
                    <div class="card-meta">
                        ${badgesHtml}
                    </div>
                </div>`;
            }
        }).join('');
    }

    function renderTeam(container, members) {
        // Sort Logic: Importance (Role) > Alphabetical (Name)
        const ROLE_RANK = {
            'presidente': 1,
            'vice-presidente': 2,
            'membro': 3
        };

        const getRank = (role = '') => {
            const r = role.toLowerCase();
            if (r.includes('presidente') && !r.includes('vice')) return 1;
            if (r.includes('vice')) return 2;
            if (r.includes('membro')) return 3;
            return 10;
        };

        const sortedMembers = [...members].sort((a, b) => {
            const rankA = getRank(a.role);
            const rankB = getRank(b.role);

            if (rankA !== rankB) return rankA - rankB;
            return (a.name || '').localeCompare(b.name || '');
        });

        // Change container class for better grid behavior
        container.className = "team-grid reveal active";

        container.innerHTML = sortedMembers.map(m => {
            if (!m || !m.name) return '';
            const badgesHtml = m.badges ? m.badges.map(b => `<span class="card-badge">${b}</span>`).join('') : '';

            return `
            <div class="member-card">
                <div class="highlight-bg"></div>
                <div class="card-icon">${m.icon || '👤'}</div>
                <div>
                    <h3 class="card-title">${m.name}</h3>
                    <p class="card-desc">${m.role || 'Membro'}</p>
                </div>
                ${badgesHtml ? `<div class="card-meta" style="margin-top: 16px;">${badgesHtml}</div>` : ''}
            </div>`;
        }).join('');
    }


    // =========================================
    // GLOBAL CONFIG (MOTTO / TICKER)
    // =========================================

    async function loadGlobalConfig() {
        try {
            const doc = await db.collection('hub_config').doc('global').get();
            if (doc.exists) {
                const data = doc.data();

                // 1. Update Motto
                if (data.motto) {
                    const mottoEl = document.getElementById('hub-motto');
                    if (mottoEl) mottoEl.textContent = data.motto;
                }

                // 2. Update Ticker
                if (data.ticker && Array.isArray(data.ticker) && data.ticker.length > 0) {
                    const tickerContainer = document.getElementById('hub-ticker');
                    if (tickerContainer) {
                        // Rebuild ticker HTML
                        // Assuming valid tickers are strings
                        const tickerHtml = data.ticker.map(item => `
                            <span style="font-family: 'Outfit'; font-weight: 700; font-size: 1.2rem; letter-spacing: 0.1em; margin-right: 40px; color: rgba(255,255,255,0.4);">
                                ${item.toUpperCase()}
                            </span>
                             <span style="font-family: 'Outfit'; font-weight: 700; font-size: 1.2rem; letter-spacing: 0.1em; margin-right: 40px; color: rgba(255,255,255,0.4);">•</span>
                        `).join('');

                        // Duplicate for smoother infinite scroll effect if needed, 
                        // but CSS animation usually handles "wrap around" if content is long enough.
                        // For now just set it.
                        tickerContainer.innerHTML = tickerHtml;
                    }
                }
            }
        } catch (e) {
            console.error("CMS Config Error:", e);
        }
    }

    // =========================================
    // ADMIN / SEEDING UTILS
    // =========================================

    async function seedDatabase() {
        if (!confirm("⚠️ This will OVERWRITE the database with the initial hardcoded data. Continue?")) return;

        console.log("🌱 Seeding Projects...");
        const batch = db.batch();

        // Projects
        const projectsRef = db.collection('hub_projects');

        initialProjects.forEach((p, idx) => {
            const id = p.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const docRef = projectsRef.doc(id);
            batch.set(docRef, p);
        });

        // Team
        console.log("🌱 Seeding Team...");
        const teamRef = db.collection('hub_team');
        initialTeam.forEach((m, idx) => {
            const id = m.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const docRef = teamRef.doc(id);
            // Add order
            const memberWithOrder = { ...m, order: idx + 1 };
            batch.set(docRef, memberWithOrder);
        });

        // Seed Default Config if not exists
        const configRef = db.collection('hub_config').doc('global');
        const configDoc = await configRef.get();
        if (!configDoc.exists) {
            batch.set(configRef, {
                motto: "✨ Juntos pela Liberdade Criativa",
                ticker: ["INOVAÇÃO", "CULTURA", "COMUNIDADE", "TECNOLOGIA", "ARTE"]
            });
        }

        await batch.commit();
        console.log("✅ Database Seeded Successfully! Refresh data to see changes.");
    }

    // Public API
    return {
        init,
        seedDatabase
    };

})();

// Auto Init
document.addEventListener('DOMContentLoaded', () => {
    if (typeof firebase !== 'undefined') {
        CMS.init();
    } else {
        window.addEventListener('load', () => {
            if (typeof firebase !== 'undefined') CMS.init();
        });
    }
});
