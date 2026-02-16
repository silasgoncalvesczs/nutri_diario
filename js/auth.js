// js/auth.js
import { auth } from './config.js';

export function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

export function loginWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

export function registerWithEmail(email, password) {
    return auth.createUserWithEmailAndPassword(email, password);
}

export function logout() {
    return auth.signOut();
}

// Exporta o "ouvinte" que avisa se o usuário logou ou deslogou
export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
}