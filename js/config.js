// js/config.js
export const firebaseConfig = {
    apiKey: "AIzaSyAq8JHIp3kE4-jhabLP2Gj1YwEBY9VS-EI",
    authDomain: "nutridiario-8ff78.firebaseapp.com",
    projectId: "nutridiario-8ff78",
    storageBucket: "nutridiario-8ff78.firebasestorage.app",
    messagingSenderId: "910270482923",
    appId: "1:910270482923:web:de0cffcfdf09b09eba71ae",
    measurementId: "G-G967ZD1H3E"
};

// Inicializa o Firebase (usando o SDK compat que está no HTML)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Exporta as instâncias para usarmos nos outros arquivos
export const auth = firebase.auth();
export const db = firebase.firestore();