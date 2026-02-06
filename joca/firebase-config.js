import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyA8azNy6GEgD190y_fW91ahUbKa1w5veik",
    authDomain: "aawards.firebaseapp.com",
    databaseURL: "https://aawards-default-rtdb.firebaseio.com",
    projectId: "aawards",
    storageBucket: "aawards.firebasestorage.app",
    messagingSenderId: "839334918366",
    appId: "1:839334918366:web:454a259fa3e2665b46ea4f",
    measurementId: "G-NLLMB9THVX"
};

function isConfigPlaceholder(config) {
    return (
        !config ||
        typeof config !== "object" ||
        String(config.apiKey || "").startsWith("SUA_") ||
        String(config.projectId || "").startsWith("SEU_")
    );
}

export const hasValidFirebaseConfig = !isConfigPlaceholder(firebaseConfig);

export const app = hasValidFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const db = hasValidFirebaseConfig ? getFirestore(app) : null;
export const auth = hasValidFirebaseConfig ? getAuth(app) : null;
