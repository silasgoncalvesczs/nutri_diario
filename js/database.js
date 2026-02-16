// js/database.js
import { db } from './config.js';

// Busca as metas do usuário
export async function getUserGoals(userId) {
    const docSnap = await db.collection("users").doc(userId).get();
    return docSnap.exists ? docSnap.data().goals : null;
}

// Salva as metas do usuário
export async function saveUserGoals(userId, goals) {
    return db.collection("users").doc(userId).set({ goals }, { merge: true });
}

// Busca o histórico de refeições
export async function getMeals(userId) {
    const snapshot = await db.collection("users").doc(userId).collection("meals")
        .orderBy("timestamp", "desc").get();
    const meals = [];
    snapshot.forEach(doc => {
        meals.push({ id: doc.id, ...doc.data() });
    });
    return meals;
}

// Salva uma nova refeição
export async function saveMealToCloud(userId, mealData) {
    return db.collection("users").doc(userId).collection("meals").add(mealData);
}

// Deleta uma refeição
export async function deleteMealFromCloud(userId, mealId) {
    return db.collection("users").doc(userId).collection("meals").doc(mealId).delete();
}

// Busca a foto de perfil do banco de dados
export async function getUserProfilePhoto(userId) {
    const docSnap = await db.collection("users").doc(userId).get();
    return docSnap.exists ? docSnap.data().photoBase64 : null;
}

// Salva a foto de perfil gigante no banco de dados
export async function saveUserProfilePhoto(userId, photoBase64) {
    return db.collection("users").doc(userId).set({ photoBase64 }, { merge: true });
}