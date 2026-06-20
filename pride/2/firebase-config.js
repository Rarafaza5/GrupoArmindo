// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Default Firebase Configuration
// Replace these placeholders with your actual Firebase project settings
const defaultFirebaseConfig = {
  apiKey: "AIzaSyA8azNy6GEgD190y_fW91ahUbKa1w5veik",
  authDomain: "aawards.firebaseapp.com",
  databaseURL: "https://aawards-default-rtdb.firebaseio.com",
  projectId: "aawards",
  storageBucket: "aawards.firebasestorage.app",
  messagingSenderId: "839334918366",
  appId: "1:839334918366:web:454a259fa3e2665b46ea4f",
  measurementId: "G-NLLMB9THVX"
};

// Admin Passcode
// Edit this string to change the passcode for the Admin Dashboard
export const adminPasscode = "pride2026";

// Check if there is a config saved in localStorage (useful for quick web setup)
let config = { ...defaultFirebaseConfig };
const savedConfig = localStorage.getItem("firebaseConfig");
if (savedConfig) {
  try {
    config = JSON.parse(savedConfig);
  } catch (e) {
    console.error("Erro a ler o Firebase Config do localStorage", e);
  }
}

// Function to check if config is valid (i.e. not placeholders)
export function isFirebaseConfigured() {
  return config && config.apiKey && config.apiKey !== "YOUR_API_KEY" && config.projectId && config.projectId !== "YOUR_PROJECT_ID";
}

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Erro ao inicializar o Firebase com as credenciais atuais:", error);
  }
}

export { app, auth, db, config };
