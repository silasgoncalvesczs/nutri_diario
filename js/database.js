import { db } from './config.js';

export async function saveMealToCloud(userId, mealData) {
    return db.collection("users").doc(userId).collection("meals").add(mealData);
}

export async function deleteMealFromCloud(userId, mealId) {
    return db.collection("users").doc(userId).collection("meals").doc(mealId).delete();
}

export async function getUserData(userId) {
    const doc = await db.collection("users").doc(userId).get();
    return doc.exists ? doc.data() : null;
}

export async function saveUserGoals(userId, goals) {
    return db.collection("users").doc(userId).set({ goals }, { merge: true });
}

export function listenToMeals(userId, callback) {
    return db.collection("users").doc(userId).collection("meals")
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
            const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(meals);
        });
}