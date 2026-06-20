// app.js
import { isFirebaseConfigured, db, adminPasscode } from "./firebase-config.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  addDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Import admin handlers
import { initAdminPanel, dismantleAdminPanel } from "./admin.js";

// Active session state
export let currentWriter = {
  name: localStorage.getItem("writerName") || "",
  fingerprint: getLocalFingerprint(),
  ip: ""
};

export let storyConfig = {
  startDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  isActive: true,
  title: "Quem conta um conto acrescenta um ponto"
};

// --- SPA Routing & View Management ---
const views = {
  setup: document.getElementById("view-setup"),
  home: document.getElementById("view-home"),
  auth: document.getElementById("view-auth"),
  workbench: document.getElementById("view-workbench"),
  admin: document.getElementById("view-admin")
};

export function showView(viewId) {
  // Hide all views
  Object.values(views).forEach(view => {
    if (view) view.classList.add("hidden");
  });
  
  // Show target view
  if (views[viewId]) {
    views[viewId].classList.remove("hidden");
  }

  // Call admin initializers depending on view change
  if (viewId === "admin") {
    if (isAdminAuthorized()) {
      initAdminPanel();
    } else {
      showView("home");
    }
  } else {
    dismantleAdminPanel();
  }

  // Special view initialization logic
  if (viewId === "home") {
    loadHomeStats();
  } else if (viewId === "workbench") {
    loadWorkbenchData();
  }
}

// --- Toast Notifications Utility ---
export function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const toastMsg = document.getElementById("toast-message");
  const toastIcon = toast.querySelector(".toast-icon");
  
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.className = "toast show " + type;
  
  // Set icons dynamically
  if (type === "success") {
    toastIcon.className = "toast-icon fa-solid fa-circle-check";
  } else if (type === "error") {
    toastIcon.className = "toast-icon fa-solid fa-circle-xmark";
  } else {
    toastIcon.className = "toast-icon fa-solid fa-circle-info";
  }
  
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// --- Date Utilities ---
export function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getEventDay(startDateStr) {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// --- IP & Local Fingerprint Fallback Management ---
function getLocalFingerprint() {
  let fp = localStorage.getItem("writerFingerprint");
  if (!fp) {
    fp = "fp_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("writerFingerprint", fp);
  }
  return fp;
}

async function fetchUserIp() {
  try {
    const res = await fetch("https://api64.ipify.org?format=json");
    const data = await res.json();
    currentWriter.ip = data.ip;
  } catch (err) {
    console.warn("Não foi possível carregar o IP, a usar identificador local alternativo.", err);
    currentWriter.ip = currentWriter.fingerprint; // fallback
  }
}

// --- Admin Verification state ---
export function isAdminAuthorized() {
  return sessionStorage.getItem("adminAuthorized") === "true";
}

// --- Dynamic Canvas Favicon Generator (Fallback / Local visual boost) ---
function generateDynamicFavicon() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");

    // Background circle
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#0c0a0f";
    ctx.fill();

    // Glowing pride border
    const grad = ctx.createLinearGradient(0, 0, 64, 64);
    grad.addColorStop(0, "#ff3366");
    grad.addColorStop(0.5, "#9933ff");
    grad.addColorStop(1, "#3399ff");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Minimalist quill pen tip
    ctx.save();
    ctx.translate(32, 32);
    ctx.rotate(-Math.PI / 4);

    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(-8, 5, -5, -15);
    ctx.quadraticCurveTo(0, -22, 0, -22);
    ctx.quadraticCurveTo(0, -22, 5, -15);
    ctx.quadraticCurveTo(8, 5, 0, 18);
    ctx.closePath();

    const featherGrad = ctx.createLinearGradient(0, -22, 0, 18);
    featherGrad.addColorStop(0, "#3399ff");
    featherGrad.addColorStop(0.5, "#9933ff");
    featherGrad.addColorStop(1, "#ff3366");
    ctx.fillStyle = featherGrad;
    ctx.fill();

    // Center slit line
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(0, -10);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // Link update
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = "image/png";
    link.href = canvas.toDataURL("image/png");
  } catch (e) {
    console.warn("Could not generate dynamic canvas favicon:", e);
  }
}

// --- Initialization / App Loader ---
async function initApp() {
  // Generate favicon dynamically
  generateDynamicFavicon();

  // If Firebase config is not configured, show the setup wizard
  if (!isFirebaseConfigured()) {
    showView("setup");
    document.getElementById("btn-login-trigger").classList.add("hidden");
    
    document.getElementById("form-setup").addEventListener("submit", (e) => {
      e.preventDefault();
      const rawJson = document.getElementById("setup-config-json").value.trim();
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed.apiKey && parsed.projectId) {
          localStorage.setItem("firebaseConfig", JSON.stringify(parsed));
          showToast("Configuração salva com sucesso! Reiniciando...", "success");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast("Formato de configuração inválido. Verifique se contém 'apiKey' e 'projectId'.", "error");
        }
      } catch (err) {
        showToast("Erro a ler o JSON. Por favor, cole um objeto JSON válido.", "error");
      }
    });
    return;
  }

  // Register developer options reset
  document.getElementById("btn-reset-firebase").addEventListener("click", () => {
    if (confirm("Tens a certeza que queres apagar a configuração do Firebase? Terás de configurar novamente.")) {
      localStorage.removeItem("firebaseConfig");
      localStorage.removeItem("writerName");
      localStorage.removeItem("writerFingerprint");
      showToast("Configuração apagada. Reiniciando...", "success");
      setTimeout(() => window.location.reload(), 1000);
    }
  });

  // Load user data
  updateProfileWidget();
  setupUIEvents();
  loadStoryConfigListener();
  loadHomeStats();

  // Async retrieve IP
  await fetchUserIp();

  // Check URL parameters for direct Admin passcode opening
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("admin")) {
    showAdminPasscodeModal();
  }

}

// --- Live Story Config Fetcher ---
let configUnsubscribe = null;
function loadStoryConfigListener() {
  const configDocRef = doc(db, "config", "story");
  configUnsubscribe = onSnapshot(configDocRef, (docSnap) => {
    if (docSnap.exists()) {
      storyConfig = docSnap.data();
      updateEventProgressUI();
    } else {
      // Create defaults
      const defaults = {
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
        title: "Quem conta um conto acrescenta um ponto",
        adminPasscode: adminPasscode
      };
      setDoc(configDocRef, defaults)
        .then(() => console.log("Configurações iniciais criadas."))
        .catch(err => console.error("Erro ao inicializar configurações:", err));
    }
  }, (error) => {
    console.error("Erro ao ler configurações:", error);
  });
}

function updateEventProgressUI() {
  const day = getEventDay(storyConfig.startDate);
  const progressBar = document.getElementById("home-progress-bar");
  const progressText = document.getElementById("home-event-day");
  
  if (day < 1) {
    if (progressBar) progressBar.style.width = "0%";
    if (progressText) progressText.innerHTML = `<i class="fa-solid fa-clock"></i> O conto começará em breve (Início: ${storyConfig.startDate})`;
    document.getElementById("workbench-day-badge").textContent = "Pré-Evento";
  } else if (day > 7) {
    if (progressBar) progressBar.style.width = "100%";
    if (progressText) progressText.innerHTML = `<i class="fa-solid fa-flag-checkered"></i> A história está concluída!`;
    document.getElementById("workbench-day-badge").textContent = "Fim do Conto";
  } else {
    const percent = Math.round((day / 7) * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.innerHTML = `<i class="fa-solid fa-feather-pointed"></i> Dia ${day} de 7 em progresso`;
    document.getElementById("workbench-day-badge").textContent = `Dia ${day} de 7`;
  }
}

// --- Home Screen Live Statistics ---
async function loadHomeStats() {
  if (!isFirebaseConfigured() || !db) return;
  
  try {
    const paragraphsQuery = query(collection(db, "paragraphs"), orderBy("order", "asc"));
    const querySnapshot = await getDocs(paragraphsQuery);
    const totalParas = querySnapshot.size;
    
    // Count unique authors
    const authors = new Set();
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.authorName) {
        authors.add(data.authorName);
      }
    });

    document.getElementById("home-total-paragraphs").textContent = totalParas;
    document.getElementById("home-total-authors").textContent = authors.size;
  } catch (error) {
    console.error("Erro ao carregar estatísticas iniciais:", error);
  }
}

// --- User Profile Widget update ---
function updateProfileWidget() {
  const workbenchUserProfile = document.getElementById("workbench-user-profile");
  const workbenchDisplayName = document.getElementById("workbench-display-name");
  
  if (currentWriter.name) {
    if (workbenchUserProfile) workbenchUserProfile.classList.remove("hidden");
    if (workbenchDisplayName) workbenchDisplayName.textContent = currentWriter.name;
    
    const heroActionBtn = document.getElementById("btn-hero-action");
    if (heroActionBtn) {
      heroActionBtn.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Escrever Hoje`;
    }
  } else {
    if (workbenchUserProfile) workbenchUserProfile.classList.add("hidden");
    
    const heroActionBtn = document.getElementById("btn-hero-action");
    if (heroActionBtn) {
      heroActionBtn.innerHTML = `<i class="fa-solid fa-pen-nib"></i> Deixar o Meu Ponto`;
    }
    
    // Lock workbench if user is not identified and tries to access it
    const activeView = document.querySelector(".app-view:not(.hidden)");
    if (activeView && activeView.id === "view-workbench") {
      showView("home");
    }
  }
}

// --- Setup Nav and Form Button Clicks ---
function setupUIEvents() {
  // Navigation Back buttons
  document.getElementById("btn-back-home-workbench").addEventListener("click", () => showView("home"));
  document.getElementById("btn-back-home-admin").addEventListener("click", () => showView("home"));

  // Hero section actions
  document.getElementById("btn-hero-action").addEventListener("click", () => {
    if (currentWriter.name) {
      showView("workbench");
    } else {
      showView("auth");
    }
  });

  // Edit nickname trigger (workbench)
  document.getElementById("btn-change-identity-workbench").addEventListener("click", () => {
    const input = document.getElementById("identity-name");
    if (input) input.value = currentWriter.name;
    showView("auth");
  });

  // Identity Form Submit
  const formIdentity = document.getElementById("form-identity");
  formIdentity.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("identity-name").value.trim();
    const acceptTerms = document.getElementById("identity-terms").checked;
    
    if (!name) {
      showToast("Por favor, introduz o teu nome ou pseudónimo.", "error");
      return;
    }
    
    if (!acceptTerms) {
      showToast("Precisas de aceitar os Termos e Condições para participar.", "error");
      return;
    }
    
    // Save to localStorage
    localStorage.setItem("writerName", name);
    currentWriter.name = name;
    
    showToast("Perfil guardado! Bem-vindo ao conto.", "success");
    updateProfileWidget();
    showView("workbench");
  });

  // Character counter for paragraph textarea
  const pTextarea = document.getElementById("paragraph-text");
  const charCounter = document.getElementById("char-count");
  const charWarning = document.getElementById("char-limit-warning");

  pTextarea.addEventListener("input", () => {
    const len = pTextarea.value.length;
    charCounter.textContent = len;
    
    if (len >= 950) {
      charCounter.style.color = "var(--accent-red)";
      charWarning.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Limite quase atingido!`;
      charWarning.style.color = "var(--accent-red)";
      charWarning.classList.remove("hidden");
    } else if (len >= 850) {
      charCounter.style.color = "var(--accent-orange)";
      charWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Aproximas-te do limite!`;
      charWarning.style.color = "var(--accent-orange)";
      charWarning.classList.remove("hidden");
    } else {
      charCounter.style.color = "var(--text-muted)";
      charWarning.classList.add("hidden");
    }
  });

  // Submit Paragraph Form
  document.getElementById("form-paragraph").addEventListener("submit", handleSubmitParagraph);

  // Terms and Conditions Modal Hooks
  const termsModal = document.getElementById("modal-terms");
  const linkOpenTerms = document.getElementById("link-open-terms");
  const btnCloseTerms = document.getElementById("btn-close-terms");
  const btnAgreeTerms = document.getElementById("btn-agree-terms");
  
  linkOpenTerms.onclick = (e) => {
    e.preventDefault();
    termsModal.classList.remove("hidden");
  };
  btnCloseTerms.onclick = () => {
    termsModal.classList.add("hidden");
  };
  btnAgreeTerms.onclick = () => {
    const check = document.getElementById("identity-terms");
    if (check) check.checked = true;
    termsModal.classList.add("hidden");
  };

  // Secret Admin lock icon triggers passcode
  document.getElementById("btn-secret-admin").onclick = () => {
    showAdminPasscodeModal();
  };

  // Admin Passcode Modal hooks
  const passcodeModal = document.getElementById("modal-passcode");
  const btnClosePasscode = document.getElementById("btn-close-passcode");
  btnClosePasscode.onclick = () => {
    passcodeModal.classList.add("hidden");
  };

  const formPasscode = document.getElementById("form-admin-passcode");
  formPasscode.onsubmit = async (e) => {
    e.preventDefault();
    const rawVal = document.getElementById("admin-passcode-input").value;
    
    // Fetch passcode from DB config
    try {
      const configDocRef = doc(db, "config", "story");
      const configSnap = await getDoc(configDocRef);
      const dbPass = (configSnap.exists() && configSnap.data().adminPasscode) ? configSnap.data().adminPasscode : adminPasscode;
      
      if (rawVal === dbPass) {
        sessionStorage.setItem("adminAuthorized", "true");
        passcodeModal.classList.add("hidden");
        showToast("Chave correta. Acesso ao painel administrativo ativado!", "success");
        showView("admin");
        formPasscode.reset();
      } else {
        showToast("Chave incorreta. Tenta novamente.", "error");
      }
    } catch (err) {
      console.error(err);
      // Hardcoded fallback logic
      if (rawVal === "pride2026") {
        sessionStorage.setItem("adminAuthorized", "true");
        passcodeModal.classList.add("hidden");
        showToast("Chave correta (Ligação Local). Acesso ativado!", "success");
        showView("admin");
        formPasscode.reset();
      } else {
        showToast("Chave incorreta ou erro ao ligar à BD.", "error");
      }
    }
  };
}

function showAdminPasscodeModal() {
  const passcodeModal = document.getElementById("modal-passcode");
  if (passcodeModal) passcodeModal.classList.remove("hidden");
}

// UI button loader
function toggleButtonLoading(formId, isLoading) {
  const form = document.getElementById(formId);
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  const btnText = btn.querySelector('.btn-text') || btn.querySelector('span');
  const spinner = btn.querySelector('.spinner');
  
  if (isLoading) {
    btn.disabled = true;
    if (btnText) btnText.classList.add("hidden");
    if (spinner) spinner.classList.remove("hidden");
  } else {
    btn.disabled = false;
    if (btnText) btnText.classList.remove("hidden");
    if (spinner) spinner.classList.add("hidden");
  }
}

// --- Workbench Operations & Daily Locks ---
let workbenchPrevUnsubscribe = null;
let workbenchHistoryUnsubscribe = null;

async function loadWorkbenchData() {
  if (!currentWriter.name || !db) return;
  
  const writeLockedContainer = document.getElementById("write-locked-container");
  const btnSubmit = document.getElementById("btn-submit-paragraph");
  const textarea = document.getElementById("paragraph-text");

  // Step 1: Check daily contribution lock across IP or Fingerprint
  const todayStr = getLocalDateString();
  const fp = getLocalFingerprint();
  
  let alreadySubmittedToday = false;
  
  try {
    // Check IP
    if (currentWriter.ip) {
      const qIp = query(
        collection(db, "paragraphs"), 
        where("dateStr", "==", todayStr),
        where("ipAddress", "==", currentWriter.ip)
      );
      const snapIp = await getDocs(qIp);
      if (!snapIp.empty) alreadySubmittedToday = true;
    }
    
    // Check Fingerprint
    if (!alreadySubmittedToday && fp) {
      const qFp = query(
        collection(db, "paragraphs"), 
        where("dateStr", "==", todayStr),
        where("fingerprint", "==", fp)
      );
      const snapFp = await getDocs(qFp);
      if (!snapFp.empty) alreadySubmittedToday = true;
    }

    const eventDay = getEventDay(storyConfig.startDate);
    
    // Check constraints
    if (!storyConfig.isActive) {
      // Closed by Admin
      writeLockedContainer.classList.remove("hidden");
      writeLockedContainer.querySelector('strong').textContent = "Escrita Pausada";
      writeLockedContainer.querySelector('p').textContent = "A escrita comunitária encontra-se temporariamente pausada pela moderação.";
      btnSubmit.disabled = true;
      textarea.disabled = true;
      textarea.placeholder = "O conto está pausado.";
    } else if (eventDay < 1) {
      // Event hasn't started
      writeLockedContainer.classList.remove("hidden");
      writeLockedContainer.querySelector('strong').textContent = "O Desafio Ainda Não Começou";
      writeLockedContainer.querySelector('p').textContent = `O primeiro ponto será adicionado no dia ${storyConfig.startDate}. Guarda as tuas ideias até lá!`;
      btnSubmit.disabled = true;
      textarea.disabled = true;
      textarea.placeholder = "O conto começará em breve.";
    } else if (eventDay > 7) {
      // Event has ended
      writeLockedContainer.classList.remove("hidden");
      writeLockedContainer.querySelector('strong').textContent = "A história terminou!";
      writeLockedContainer.querySelector('p').textContent = "O desafio de 7 dias chegou ao fim. Obrigado pela tua colaboração e carinho. A história completa será revelada em breve!";
      btnSubmit.disabled = true;
      textarea.disabled = true;
      textarea.placeholder = "História encerrada.";
    } else if (alreadySubmittedToday) {
      // Locked for today
      writeLockedContainer.classList.remove("hidden");
      writeLockedContainer.querySelector('strong').textContent = "Já deixaste a tua marca hoje!";
      writeLockedContainer.querySelector('p').textContent = `Submeteste com sucesso um parágrafo hoje. O conto continua amanhã, volta para ver o novo elo!`;
      btnSubmit.disabled = true;
      textarea.disabled = true;
      textarea.placeholder = "O teu parágrafo de hoje já foi gravado. Até amanhã!";
    } else {
      // Open
      writeLockedContainer.classList.add("hidden");
      btnSubmit.disabled = false;
      textarea.disabled = false;
      textarea.placeholder = "Sussurra aqui a continuação desta história...";
    }
  } catch (err) {
    console.error("Erro ao verificar restrições diárias:", err);
  }

  // Step 2: Listen for the LAST paragraph (Previous paragraph context)
  if (workbenchPrevUnsubscribe) workbenchPrevUnsubscribe();
  
  const qLast = query(collection(db, "paragraphs"), orderBy("order", "desc"), limit(1));
  
  const prevParagraphText = document.getElementById("prev-paragraph-text");
  const prevParagraphMeta = document.getElementById("prev-paragraph-meta");
  const prevAuthorName = document.getElementById("prev-author-name");
  
  workbenchPrevUnsubscribe = onSnapshot(qLast, (snapshot) => {
    if (snapshot.empty) {
      prevParagraphText.textContent = "A história está silenciosa. Tu tens o privilégio de escrever o parágrafo inicial!";
      prevParagraphMeta.classList.add("hidden");
    } else {
      const docData = snapshot.docs[0].data();
      const currentText = prevParagraphText.textContent;
      
      // Update warning highlight
      if (currentText !== "A carregar o elo anterior..." && currentText !== docData.text) {
        showToast("Atenção: Um novo ponto foi adicionado por outro escritor! O elo anterior foi atualizado.", "info");
        prevParagraphText.style.transition = "none";
        prevParagraphText.style.color = "#ffcc00"; // Flash yellow
        setTimeout(() => {
          prevParagraphText.style.transition = "color 0.8s ease";
          prevParagraphText.style.color = "var(--text-primary)";
        }, 1000);
      }
      
      prevParagraphText.textContent = docData.text;
      prevAuthorName.textContent = docData.authorName || "Alguém";
      prevParagraphMeta.classList.remove("hidden");
    }
  }, (err) => {
    console.error("Erro ao ler parágrafo anterior:", err);
    prevParagraphText.textContent = "Erro ao carregar o elo de ligação.";
  });

  // Step 3: Listen for User's past contributions (filtered by browser fingerprint)
  if (workbenchHistoryUnsubscribe) workbenchHistoryUnsubscribe();
  
  const qHistory = query(
    collection(db, "paragraphs"),
    where("fingerprint", "==", fp),
    orderBy("createdAt", "asc")
  );
  
  const listContainer = document.getElementById("user-paragraphs-list");
  
  workbenchHistoryUnsubscribe = onSnapshot(qHistory, (snapshot) => {
    listContainer.innerHTML = "";
    
    if (snapshot.empty) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-feather"></i>
          <p>Ainda não escreveste nenhum parágrafo nesta história.</p>
        </div>
      `;
    } else {
      snapshot.forEach(docSnap => {
        const para = docSnap.data();
        const date = para.createdAt ? para.createdAt.toDate().toLocaleDateString("pt-PT", {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        }) : "Pendente...";
        
        const card = document.createElement("div");
        card.className = "history-item animate-fade-in";
        card.innerHTML = `
          <div class="history-item-header">
            <span class="history-item-badge">Ponto #${para.order}</span>
            <span class="history-item-date">${date}</span>
          </div>
          <div class="history-item-text story-font">${para.text}</div>
        `;
        listContainer.appendChild(card);
      });
    }
  }, (err) => {
    console.error("Erro ao carregar histórico pessoal:", err);
    listContainer.innerHTML = `<p class="error-badge">Erro ao carregar histórico pessoal.</p>`;
  });
}

// --- Submit Paragraph Trigger ---
async function handleSubmitParagraph(e) {
  e.preventDefault();
  
  const textarea = document.getElementById("paragraph-text");
  const text = textarea.value.trim();
  
  if (text.length === 0) return;
  if (text.length > 1000) {
    showToast("O teu parágrafo ultrapassa os 1000 caracteres limite.", "error");
    return;
  }
  
  toggleButtonLoading("form-paragraph", true);
  textarea.disabled = true;
  
  try {
    const todayStr = getLocalDateString();
    const fp = getLocalFingerprint();
    
    // Check limits again
    let alreadySubmittedToday = false;
    if (currentWriter.ip) {
      const qIp = query(
        collection(db, "paragraphs"), 
        where("dateStr", "==", todayStr),
        where("ipAddress", "==", currentWriter.ip)
      );
      const snapIp = await getDocs(qIp);
      if (!snapIp.empty) alreadySubmittedToday = true;
    }
    
    if (!alreadySubmittedToday && fp) {
      const qFp = query(
        collection(db, "paragraphs"), 
        where("dateStr", "==", todayStr),
        where("fingerprint", "==", fp)
      );
      const snapFp = await getDocs(qFp);
      if (!snapFp.empty) alreadySubmittedToday = true;
    }
    
    if (alreadySubmittedToday) {
      showToast("Já adicionaste o teu parágrafo por hoje. Tenta amanhã!", "error");
      loadWorkbenchData();
      return;
    }
    
    const eventDay = getEventDay(storyConfig.startDate);
    if (!storyConfig.isActive || eventDay < 1 || eventDay > 7) {
      showToast("O evento não aceita submissões no momento.", "error");
      loadWorkbenchData();
      return;
    }
    
    // Fetch last paragraph order for sequential numbering
    const qLast = query(collection(db, "paragraphs"), orderBy("order", "desc"), limit(1));
    const snapshot = await getDocs(qLast);
    let nextOrder = 1;
    if (!snapshot.empty) {
      nextOrder = snapshot.docs[0].data().order + 1;
    }
    
    // Add new paragraph doc
    const paraDoc = {
      text: text,
      authorName: currentWriter.name || "Anónimo",
      ipAddress: currentWriter.ip || "local",
      fingerprint: fp,
      order: nextOrder,
      dateStr: todayStr,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, "paragraphs"), paraDoc);
    
    // Confetti celebration!
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#ff3366', '#ff6633', '#ffcc00', '#33cc66', '#3399ff', '#9933ff']
      });
    }
    
    textarea.value = "";
    document.getElementById("char-count").textContent = "0";
    showToast("Parágrafo adicionado com sucesso! Obrigado pelo teu ponto.", "success");
    
    // Recheck limits & locks
    loadWorkbenchData();
    loadHomeStats();
  } catch (err) {
    console.error("Erro a guardar parágrafo:", err);
    showToast("Houve um problema a adicionar o teu parágrafo. Tenta novamente.", "error");
    textarea.disabled = false;
  } finally {
    toggleButtonLoading("form-paragraph", false);
  }
}

// Start application
initApp();
