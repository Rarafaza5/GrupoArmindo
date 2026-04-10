import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8azNy6GEgD190y_fW91ahUbKa1w5veik",
  authDomain: "aawards.firebaseapp.com",
  databaseURL: "https://aawards-default-rtdb.firebaseio.com",
  projectId: "aawards",
  storageBucket: "aawards.firebasestorage.app",
  messagingSenderId: "839334918366",
  appId: "1:839334918366:web:454a259fa3e2665b46ea4f",
  measurementId: "G-NLLMB9THVX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs, doc, getDoc, query, orderBy, serverTimestamp };
