import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById('commandments-grid');

async function loadCommandments() {
  try {
    const q = query(collection(db, "commandments"), orderBy("order", "asc")); // Changed to order by 'order'
    const querySnapshot = await getDocs(q);

    // Clear loading state
    grid.innerHTML = '';

    if (querySnapshot.empty) {
      grid.innerHTML = `
                <div class="glass-panel" style="grid-column: 1/-1; text-align: center;">
                    <h3>Nenhum mandamento encontrado.</h3>
                    <p>O Deus está em modo de repouso.</p>
                </div>
            `;
      return;
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'glass-panel';
      card.style.animation = 'float 6s ease-in-out infinite';
      card.style.animationDelay = `${Math.random() * 2}s`; // Random delay for float effect

      // Format Timestamp if it exists
      let dateStr = '';
      if (data.timestamp) {
        const date = data.timestamp.toDate();
        dateStr = date.toLocaleDateString('pt-BR');
      }

      card.innerHTML = `
                <h3 style="color: var(--joca-orange); margin-bottom: 0.5rem; font-size: 1.5rem;">#${data.order || '?'}</h3>
                <p style="font-size: 1.2rem; line-height: 1.5; margin-bottom: 1rem;">"${data.text}"</p>
                <div style="text-align: right; color: var(--text-secondary); font-size: 0.8rem;">
                    Recebido em: ${dateStr}
                </div>
            `;
      grid.appendChild(card);
    });

  } catch (error) {
    console.error("Erro ao carregar mandamentos:", error);
    grid.innerHTML = `
            <div class="glass-panel" style="grid-column: 1/-1; text-align: center; border-color: red;">
                <h3 style="color: red;">Erro de Conexão</h3>
                <p>Não foi possível contactar a nuvem sagrada. Verifique o console.</p>
            </div>
        `;
  }
}

// Initial Load
document.addEventListener('DOMContentLoaded', loadCommandments);
