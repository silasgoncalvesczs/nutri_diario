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