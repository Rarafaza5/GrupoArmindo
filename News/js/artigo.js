import { db, doc, getDoc } from './firebase.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('loader');
    const container = document.getElementById('article-container');
    const errorContainer = document.getElementById('error-container');

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        loader.classList.add('hidden');
        errorContainer.classList.remove('hidden');
        return;
    }

    try {
        const docRef = doc(db, "articles", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Data desconhecida';

            document.title = `${data.title} | Shaaare`;

            document.getElementById('art-category').innerText = data.category || 'Notícia';
            document.getElementById('art-title').innerText = data.title;
            document.getElementById('art-author').innerText = `Por ${data.author || 'Anónimo'}`;
            document.getElementById('art-date').innerText = date;
            document.getElementById('art-content').innerHTML = escapeHTML(data.content);

            loader.classList.add('hidden');
            container.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
            errorContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Erro a buscar documento:", error);
        loader.classList.add('hidden');
        errorContainer.classList.remove('hidden');
        document.querySelector('#error-container p').innerText = "Houve um problema de ligação. Tente novamente mais tarde.";
    }
});

// Utility to escape HTML and prevent XSS (but respect line breaks for reading)
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
