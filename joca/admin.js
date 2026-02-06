import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('add-commandment-form');
const statusMsg = document.getElementById('status-msg');
const adminList = document.getElementById('admin-list');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const docIdInput = document.getElementById('doc-id');
const orderInput = document.getElementById('order-input');
const textInput = document.getElementById('text-input');

let isEditing = false;

// Real-time Listener for List
const q = query(collection(db, "commandments"), orderBy("order", "asc"));
const unsubscribe = onSnapshot(q, (snapshot) => {
  adminList.innerHTML = '';

  if (snapshot.empty) {
    adminList.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">Nenhum mandamento encontrado.</p>`;
    return;
  }

  snapshot.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const id = docSnapshot.id;

    const item = document.createElement('div');
    item.className = 'glass-panel';
    item.style.padding = '1rem';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';

    item.innerHTML = `
            <div>
                <strong style="color: var(--joca-orange); margin-right: 0.5rem;">#${data.order}</strong>
                <span style="color: var(--text-primary);">${data.text.substring(0, 50)}${data.text.length > 50 ? '...' : ''}</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn edit-btn" data-id="${id}" data-order="${data.order}" data-text="${data.text}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: var(--joca-silver);">✏️</button>
                <button class="btn delete-btn" data-id="${id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: #e74c3c; color: #e74c3c;">🗑️</button>
            </div>
        `;
    adminList.appendChild(item);
  });

  // Attach Event Listeners to dynamic buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', deleteCommandment);
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', startEdit);
  });
});

// Add / Update Handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const order = orderInput.value;
  const text = textInput.value;
  const id = docIdInput.value;

  if (!order || !text) return;

  setLoading(true);

  try {
    if (isEditing && id) {
      // UPDATE
      await updateDoc(doc(db, "commandments", id), {
        order: parseInt(order),
        text: text,
        updatedAt: serverTimestamp()
      });
      showStatus("Mandamento atualizado!", "var(--joca-green)");
    } else {
      // CREATE
      await addDoc(collection(db, "commandments"), {
        order: parseInt(order),
        text: text,
        timestamp: serverTimestamp()
      });
      showStatus("Mandamento gravado na eternidade!", "var(--joca-green)");
    }
    resetForm();
  } catch (error) {
    console.error("Erro:", error);
    showStatus("Erro ao salvar. Tente novamente.", "red");
  } finally {
    setLoading(false);
  }
});

// Delete Handler
async function deleteCommandment(e) {
  if (!confirm("Tem certeza que deseja apagar este mandamento sagrado?")) return;

  const id = e.target.closest('button').dataset.id;
  try {
    await deleteDoc(doc(db, "commandments", id));
    showStatus("Mandamento apagado.", "var(--joca-silver)");
  } catch (error) {
    console.error("Erro ao deletar:", error);
    showStatus("Erro ao deletar.", "red");
  }
}

// Start Edit Mode
function startEdit(e) {
  const btn = e.target.closest('button');
  const id = btn.dataset.id;
  const order = btn.dataset.order;
  const text = btn.dataset.text;

  docIdInput.value = id;
  orderInput.value = order;
  textInput.value = text;

  isEditing = true;
  submitBtn.innerText = "💾 Atualizar";
  cancelBtn.style.display = "inline-block";

  // Scroll to form
  form.scrollIntoView({ behavior: 'smooth' });
}

// Cancel Edit
cancelBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  isEditing = false;
  docIdInput.value = '';
  submitBtn.innerText = "⚡ Enviar para a Nuvem";
  cancelBtn.style.display = "none";
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  if (loading) {
    submitBtn.innerHTML = `<div class="loader" style="width: 20px; height: 20px; margin: 0 auto; border-width: 2px;"></div>`;
  } else {
    submitBtn.innerText = isEditing ? "💾 Atualizar" : "⚡ Enviar para a Nuvem";
  }
}

function showStatus(msg, color) {
  statusMsg.innerText = msg;
  statusMsg.style.color = color;
  setTimeout(() => {
    statusMsg.innerText = "";
  }, 3000);
}
