/* =========================================
   HUB ADMIN LOGIC
   © 2026 Grupo Armindo
   ========================================= */

const HubAdmin = (function () {
    let db;

    const ROLE_EMOJIS = {
        'Presidente': '👑',
        'Vice Presidente': '⚜️',
        'Fundador': '🚩',
        'Membro': '⭐',
        'Colaborador': '🤝'
    };

    // =========================================
    // INITIALIZATION & SECURITY
    // =========================================

    async function init() {
        console.log("🛠️ Admin Panel Init...");
        await ArmindoAccount.init();

        let authStateFinalized = false;

        // Give it a longer window/listener to be sure
        ArmindoAccount.onAuthStateChanged((user) => {
            if (authStateFinalized) return;

            if (!user) {
                // Wait a bit more because Firebase sometimes takes a second "auth change" to confirm
                setTimeout(() => {
                    const currentUser = ArmindoAccount.getCurrentUser();
                    if (!currentUser) {
                        console.warn("Admin: No user found after delay, redirecting.");
                        window.location.href = '/?login=true';
                    } else {
                        verifyAndLoad(currentUser);
                    }
                }, 1500);
                return;
            }

            verifyAndLoad(user);
        });

        function verifyAndLoad(user) {
            authStateFinalized = true;
            // Basic Admin Check - ADD YOUR EMAIL HERE
            const adminEmails = ['rafaelcarvalhodiogo@gmail.com', 'jlfigueira3@gmail.com'];

            if (!adminEmails.includes(user.email)) {
                console.error("Admin: Access denied for", user.email);
                alert("Acesso restrito. O seu email (" + user.email + ") não está na lista de administradores.");
                window.location.href = '/';
                return;
            }

            console.log("✅ Admin access granted for:", user.email);
            document.getElementById('admin-name').textContent = user.displayName || user.email.split('@')[0];
            db = firebase.firestore();

            // Load Data
            loadGlobalConfig();
            loadProjects();
            loadTeam();
        }
    }

    // =========================================
    // SECTION SWITCHING
    // =========================================

    window.switchSection = (sectionId) => {
        document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
        document.getElementById(`section-${sectionId}`).style.display = 'block';

        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.nav-item[onclick*="${sectionId}"]`).classList.add('active');
    };

    // =========================================
    // GLOBAL CONFIG
    // =========================================

    async function loadGlobalConfig() {
        const doc = await db.collection('hub_config').doc('global').get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('motto-input').value = data.motto || '';
            document.getElementById('ticker-input').value = (data.ticker || []).join(', ');
        }
    }

    document.getElementById('global-config-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const motto = document.getElementById('motto-input').value;
        const ticker = document.getElementById('ticker-input').value.split(',').map(s => s.trim()).filter(s => s);

        try {
            await db.collection('hub_config').doc('global').set({ motto, ticker }, { merge: true });
            alert("✅ Configuração global atualizada!");
        } catch (err) {
            alert("❌ Erro ao guardar: " + err.message);
        }
    });

    // =========================================
    // PROJECTS MANAGEMENT
    // =========================================

    async function loadProjects() {
        const snapshot = await db.collection('hub_projects').orderBy('order', 'asc').get();
        const container = document.getElementById('projects-table-body');
        container.innerHTML = '';

        snapshot.forEach(doc => {
            const p = doc.data();
            const id = doc.id;
            const row = `
                <tr>
                    <td style="font-size: 1.5rem;">${p.icon}</td>
                    <td><strong>${p.title}</strong></td>
                    <td>${(p.badges || []).map(b => `<span class="card-badge">${b}</span>`).join('')}</td>
                    <td>
                        <button class="action-btn" onclick="HubAdmin.editProject('${id}')">✏️</button>
                        <button class="action-btn danger" onclick="HubAdmin.deleteProject('${id}')">🗑️</button>
                    </td>
                </tr>
            `;
            container.insertAdjacentHTML('beforeend', row);
        });
    }

    window.openProjectModal = () => {
        document.getElementById('project-modal-title').textContent = 'Novo Projeto';
        document.getElementById('project-form').reset();
        document.getElementById('project-id').value = '';
        document.getElementById('projectModal').classList.add('active');
    };

    window.editProject = async (id) => {
        const doc = await db.collection('hub_projects').doc(id).get();
        if (!doc.exists) return;
        const p = doc.data();

        document.getElementById('project-modal-title').textContent = 'Editar Projeto';
        document.getElementById('project-id').value = id;
        document.getElementById('proj-title').value = p.title;
        document.getElementById('proj-icon').value = p.icon;
        document.getElementById('proj-desc').value = p.description;
        document.getElementById('proj-link').value = p.link;
        document.getElementById('proj-badges').value = (p.badges || []).join(', ');

        document.getElementById('projectModal').classList.add('active');
    };

    document.getElementById('project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('project-id').value || document.getElementById('proj-title').value.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const projectData = {
            title: document.getElementById('proj-title').value,
            icon: document.getElementById('proj-icon').value,
            description: document.getElementById('proj-desc').value,
            link: document.getElementById('proj-link').value,
            badges: document.getElementById('proj-badges').value.split(',').map(s => s.trim()).filter(s => s),
            order: 99 // default order for now
        };

        try {
            await db.collection('hub_projects').doc(id).set(projectData, { merge: true });
            closeModal('projectModal');
            loadProjects();
        } catch (err) { alert(err.message); }
    });

    window.deleteProject = async (id) => {
        if (!confirm("Tem certeza que deseja apagar este projeto?")) return;
        await db.collection('hub_projects').doc(id).delete();
        loadProjects();
    };

    // =========================================
    // TEAM MANAGEMENT
    // =========================================

    async function loadTeam() {
        const snapshot = await db.collection('hub_team').orderBy('order', 'asc').get();
        const container = document.getElementById('team-table-body');
        container.innerHTML = '';

        snapshot.forEach(doc => {
            const m = doc.data();
            const id = doc.id;
            const row = `
                <tr>
                    <td style="font-size: 1.5rem;">${m.icon || '👤'}</td>
                    <td><strong>${m.name}</strong></td>
                    <td style="color: var(--primary);">${m.role}</td>
                    <td>
                        <button class="action-btn" onclick="HubAdmin.editMember('${id}')">✏️</button>
                        <button class="action-btn danger" onclick="HubAdmin.deleteMember('${id}')">🗑️</button>
                    </td>
                </tr>
            `;
            container.insertAdjacentHTML('beforeend', row);
        });
    }

    window.openMemberModal = () => {
        document.getElementById('member-modal-title').textContent = 'Novo Membro';
        document.getElementById('member-form').reset();
        document.getElementById('member-id').value = '';
        document.getElementById('memberModal').classList.add('active');
    };

    window.editMember = async (id) => {
        const doc = await db.collection('hub_team').doc(id).get();
        if (!doc.exists) return;
        const m = doc.data();

        document.getElementById('member-modal-title').textContent = 'Editar Membro';
        document.getElementById('member-id').value = id;
        document.getElementById('mem-name').value = m.name;
        document.getElementById('mem-role').value = m.role;
        document.getElementById('mem-badges').value = (m.badges || []).join(', ');

        document.getElementById('memberModal').classList.add('active');
    };

    document.getElementById('member-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('member-id').value || document.getElementById('mem-name').value.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const role = document.getElementById('mem-role').value;
        const autoEmoji = ROLE_EMOJIS[role] || '⭐';

        const memberData = {
            name: document.getElementById('mem-name').value,
            role: role,
            icon: autoEmoji, // AUTO ASSIGN EMOJI BASED ON ROLE
            badges: document.getElementById('mem-badges').value.split(',').map(s => s.trim()).filter(s => s),
            order: 99
        };

        try {
            await db.collection('hub_team').doc(id).set(memberData, { merge: true });
            closeModal('memberModal');
            loadTeam();
        } catch (err) { alert(err.message); }
    });

    window.deleteMember = async (id) => {
        if (!confirm("Tem certeza que deseja remover este membro?")) return;
        await db.collection('hub_team').doc(id).delete();
        loadTeam();
    };

    // =========================================
    // UTILS
    // =========================================

    window.closeModal = (id) => {
        document.getElementById(id).classList.remove('active');
    };

    return {
        init,
        editProject,
        deleteProject,
        editMember,
        deleteMember
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    HubAdmin.init();
});
