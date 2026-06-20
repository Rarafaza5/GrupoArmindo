// admin.js
import { db } from "./firebase-config.js";
import { showToast, getEventDay } from "./app.js";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let adminParagraphsUnsubscribe = null;
let adminConfigUnsubscribe = null;
let allParagraphs = [];

// --- Initialize Admin Panel listeners & bindings ---
export function initAdminPanel() {
  console.log("Painel de Administração Inicializado.");
  
  // Set up listeners for the config inputs and buttons
  setupAdminUIEvents();
  
  // 1. Subscribe to Live Config updates
  if (adminConfigUnsubscribe) adminConfigUnsubscribe();
  
  adminConfigUnsubscribe = onSnapshot(doc(db, "config", "story"), (docSnap) => {
    if (docSnap.exists()) {
      const configData = docSnap.data();
      
      // Populate form controls
      const dateInput = document.getElementById("admin-config-start-date");
      const passcodeInput = document.getElementById("admin-config-passcode");
      const activeInput = document.getElementById("admin-config-active");
      
      if (dateInput) dateInput.value = configData.startDate || "";
      if (passcodeInput) passcodeInput.value = configData.adminPasscode || "pride2026";
      if (activeInput) activeInput.checked = configData.isActive !== false;
      
      // Render stats
      const day = getEventDay(configData.startDate);
      const statDay = document.getElementById("admin-stat-day");
      if (statDay) {
        if (day < 1) statDay.textContent = "A aguardar início";
        else if (day > 7) statDay.textContent = "Terminado";
        else statDay.textContent = `Dia ${day} de 7`;
      }
    }
  }, (err) => {
    console.error("Erro ao escutar configurações no Admin:", err);
  });

  // 2. Subscribe to Live Story paragraphs feed
  if (adminParagraphsUnsubscribe) adminParagraphsUnsubscribe();
  
  const qStory = query(collection(db, "paragraphs"), orderBy("order", "asc"));
  const liveStoryContent = document.getElementById("live-story-content");
  
  adminParagraphsUnsubscribe = onSnapshot(qStory, (snapshot) => {
    liveStoryContent.innerHTML = "";
    allParagraphs = [];
    
    if (snapshot.empty) {
      liveStoryContent.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-book-open"></i>
          <p>A história ainda não tem nenhum parágrafo. Divulga o site para os escritores começarem a escrever!</p>
        </div>
      `;
      updateAdminStats(0, 0);
      populatePDFData([], new Set());
    } else {
      const authors = new Set();
      
      snapshot.forEach(docSnap => {
        const para = docSnap.data();
        allParagraphs.push(para);
        authors.add(para.authorName || "Anónimo");
        
        // Build live element
        const paraEl = document.createElement("div");
        paraEl.className = "admin-paragraph pdf-paragraph-block animate-fade-in";
        paraEl.innerHTML = `
          <p class="admin-paragraph-text pdf-paragraph-text story-font">${para.text}</p>
          <div class="admin-paragraph-meta pdf-paragraph-meta">
            <span class="admin-paragraph-author"><i class="fa-solid fa-feather"></i> ${para.authorName || "Anónimo"}</span>
            <span class="admin-paragraph-num">Ponto #${para.order}</span>
          </div>
        `;
        liveStoryContent.appendChild(paraEl);
      });
      
      updateAdminStats(allParagraphs.length, authors.size);
      populatePDFData(allParagraphs, authors);
    }
  }, (err) => {
    console.error("Erro ao escutar parágrafos no Admin:", err);
    liveStoryContent.innerHTML = `<p class="error-badge">Erro ao carregar o conto ao vivo.</p>`;
  });
}

export function dismantleAdminPanel() {
  if (adminParagraphsUnsubscribe) {
    adminParagraphsUnsubscribe();
    adminParagraphsUnsubscribe = null;
  }
  if (adminConfigUnsubscribe) {
    adminConfigUnsubscribe();
    adminConfigUnsubscribe = null;
  }
}

// --- Update Stats Card ---
function updateAdminStats(totalParas, totalWriters) {
  const statParas = document.getElementById("admin-stat-paragraphs");
  const statWriters = document.getElementById("admin-stat-writers");
  
  if (statParas) statParas.textContent = totalParas;
  if (statWriters) statWriters.textContent = totalWriters;
}

// --- Populate hidden elements for PDF export ---
function populatePDFData(paragraphs, authorsSet) {
  // 1. Author credits list
  const listEl = document.getElementById("pdf-contributors-list");
  if (listEl) {
    listEl.innerHTML = "";
    if (authorsSet.size === 0) {
      listEl.innerHTML = "<li>Sem participantes registados</li>";
    } else {
      authorsSet.forEach(author => {
        const li = document.createElement("li");
        li.textContent = author;
        listEl.appendChild(li);
      });
    }
  }

  // 2. Format PDF metadata date
  const metaDate = document.getElementById("pdf-meta-date");
  if (metaDate) {
    const today = new Date();
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    metaDate.innerHTML = `<strong>Data:</strong> ${months[today.getMonth()]} de ${today.getFullYear()}`;
  }
}

// --- Setup Click handlers ---
function setupAdminUIEvents() {
  // Config save
  const configForm = document.getElementById("form-admin-config");
  configForm.onsubmit = async (e) => {
    e.preventDefault();
    
    const startDateVal = document.getElementById("admin-config-start-date").value;
    const passcodeVal = document.getElementById("admin-config-passcode").value.trim();
    const isActiveVal = document.getElementById("admin-config-active").checked;
    
    const btnSave = document.getElementById("btn-save-admin-config");
    btnSave.disabled = true;
    btnSave.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`;
    
    try {
      await updateDoc(doc(db, "config", "story"), {
        startDate: startDateVal,
        adminPasscode: passcodeVal,
        isActive: isActiveVal
      });
      showToast("Definições da história atualizadas!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao guardar definições.", "error");
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = `<i class="fa-solid fa-save"></i> Guardar Definições`;
    }
  };

  // Reset Story (Clear collection)
  const resetBtn = document.getElementById("btn-admin-reset-story");
  resetBtn.onclick = async () => {
    if (!confirm("⚠️ AVISO CRÍTICO:\nIsto irá apagar permanentemente TODOS os parágrafos escritos até ao momento na base de dados.\nEsta ação NÃO pode ser desfeita!\n\nQueres prosseguir?")) {
      return;
    }
    
    resetBtn.disabled = true;
    resetBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Apagando...`;
    
    try {
      const q = query(collection(db, "paragraphs"));
      const querySnap = await getDocs(q);
      
      if (querySnap.empty) {
        showToast("A história já está vazia.", "info");
        return;
      }
      
      const batch = writeBatch(db);
      querySnap.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      
      await batch.commit();
      showToast("História reiniciada com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao apagar parágrafos da base de dados.", "error");
    } finally {
      resetBtn.disabled = false;
      resetBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Reiniciar História`;
    }
  };

  // PDF Export Trigger
  const exportBtn = document.getElementById("btn-export-pdf");
  exportBtn.onclick = () => {
    if (allParagraphs.length === 0) {
      showToast("Não podes exportar uma história vazia.", "error");
      return;
    }
    
    exportBtn.disabled = true;
    exportBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Gerando PDF...`;
    showToast("A compilar a história e a formatar livro digital...", "info");
    
    const container = document.getElementById("pdf-export-container");
    const cover = container.querySelector(".pdf-cover");
    const contributors = container.querySelector(".pdf-contributors");
    
    // Prepare layouts for PDF render
    container.classList.add("pdf-export-mode");
    cover.classList.remove("hidden-screen");
    contributors.classList.remove("hidden-screen");
    
    // Configure html2pdf parameters
    const opt = {
      margin:       [0.75, 0.75, 0.75, 0.75], // Clean page borders
      filename:     'Quem_Conta_um_Conto_Acrescenta_um_Ponto_Pride_Book.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Execute export
    window.html2pdf().set(opt).from(container).save().then(() => {
      // Revert classes back
      container.classList.remove("pdf-export-mode");
      cover.classList.add("hidden-screen");
      contributors.classList.add("hidden-screen");
      
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Exportar para PDF`;
      showToast("História exportada com sucesso em PDF!", "success");
    }).catch(err => {
      console.error("Erro na geração do PDF:", err);
      
      // Clean up states
      container.classList.remove("pdf-export-mode");
      cover.classList.add("hidden-screen");
      contributors.classList.add("hidden-screen");
      
      exportBtn.disabled = false;
      exportBtn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Exportar para PDF`;
      showToast("Falha ao exportar PDF. Tente novamente.", "error");
    });
  };
}
