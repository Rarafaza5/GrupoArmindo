import { db, collection, getDocs, query, orderBy } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('articles-grid');
    const loader = document.getElementById('loader');

    try {
        const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            loader.classList.add('hidden');
            grid.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1; padding: 3rem;">Ainda não existem publicações. Seja o primeiro a escrever!</p>';
            grid.classList.remove('hidden');
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Data desconhecida';
            
            const card = document.createElement('a');
            card.href = `artigo.html?id=${doc.id}`;
            card.className = 'card';
            
            card.innerHTML = `
                <span class="card-category">${data.category || 'Notícia'}</span>
                <h3 class="card-title">${escapeHTML(data.title)}</h3>
                <p class="card-excerpt">${escapeHTML(data.content)}</p>
                <div class="card-meta">
                    <span class="author">Por ${escapeHTML(data.author || 'Anónimo')}</span>
                    <span class="date">${date}</span>
                </div>
            `;
            
            grid.appendChild(card);
        });

        loader.classList.add('hidden');
        grid.classList.remove('hidden');
    } catch (error) {
        console.error("Erro ao carregar artigos:", error);
        loader.classList.add('hidden');
        grid.innerHTML = '<p style="color: #ef4444; grid-column: 1/-1; text-align: center;">Ocorreu um erro ao carregar as publicações. Verifique a configuração do seu Firebase Firestore.</p>';
        grid.classList.remove('hidden');
    }
});

// Utility to escape HTML and prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
