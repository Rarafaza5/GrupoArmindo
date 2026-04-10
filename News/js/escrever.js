import { db, collection, addDoc, serverTimestamp } from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('write-form');
    const submitBtn = document.getElementById('submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'A Publicar...';
        submitBtn.disabled = true;

        const titulo = document.getElementById('titulo').value.trim();
        const autor = document.getElementById('autor').value.trim();
        const categoria = document.getElementById('categoria').value;
        const conteudo = document.getElementById('conteudo').value.trim();

        if (!titulo || !autor || !conteudo) {
            Swal.fire({
                icon: 'error',
                title: 'Campos em falta',
                text: 'Por favor, preencha todos os campos obrigatórios.',
                background: '#1e293b',
                color: '#f8fafc',
                confirmButtonColor: '#3b82f6'
            });
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            return;
        }

        try {
            const docRef = await addDoc(collection(db, "articles"), {
                title: titulo,
                author: autor,
                category: categoria,
                content: conteudo,
                createdAt: serverTimestamp()
            });

            form.reset();
            
            Swal.fire({
                icon: 'success',
                title: 'Publicado com sucesso!',
                text: 'O seu artigo já está disponível no Shaaare.',
                background: '#1e293b',
                color: '#f8fafc',
                confirmButtonColor: '#3b82f6'
            }).then(() => {
                window.location.href = `artigo.html?id=${docRef.id}`;
            });

        } catch (error) {
            console.error("Erro a adicionar doc: ", error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao publicar',
                text: 'Houve um problema ao guardar o seu artigo no servidor. Tente novamente mais tarde.',
                background: '#1e293b',
                color: '#f8fafc',
                confirmButtonColor: '#3b82f6'
            });
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
});
