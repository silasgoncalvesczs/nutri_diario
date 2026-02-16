// js/main.js
import * as UI from './ui.js';
import * as Auth from './auth.js';
import * as DB from './database.js';
import * as API from './api.js';

// --- VARIÁVEIS GLOBAIS ---
let currentUser = null;
let currentIngredients = [];
let lastCalculatedTotals = null;
let globalMeals = [];
let globalGoals = { calories: 2000, protein: 150, carbs: 200, fats: 70, fibers: 30 };
let historyChart = null;

/* ============================================================
   EXPOSIÇÃO DE FUNÇÕES AO WINDOW (Para o HTML conseguir clicar)
   ============================================================ */
window.loginWithGoogle = async () => {
    document.getElementById("login-loading").classList.remove("hidden");
    try {
        await Auth.loginWithGoogle();
    } catch (error) {
        console.error(error);
        showToast("Erro ao fazer login", "error");
        document.getElementById("login-loading").classList.add("hidden");
    }
};

window.loginWithEmail = async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!email || !password) return showToast("Preencha e-mail e senha.", "error");

    document.getElementById("login-loading").classList.remove("hidden");
    try {
        await Auth.loginWithEmail(email, password);
        document.getElementById("login-email").value = "";
        document.getElementById("login-password").value = "";
    } catch (error) {
        document.getElementById("login-loading").classList.add("hidden");
        showToast("Erro ao fazer login. Verifique suas credenciais.", "error");
    }
};

window.registerWithEmail = async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!email || !password) return showToast("Preencha e-mail e senha.", "error");
    if (password.length < 6) return showToast("Mínimo 6 caracteres.", "error");

    document.getElementById("login-loading").classList.remove("hidden");
    try {
        await Auth.registerWithEmail(email, password);
        showToast("Conta criada com sucesso!", "success");
        document.getElementById("login-email").value = "";
        document.getElementById("login-password").value = "";
    } catch (error) {
        document.getElementById("login-loading").classList.add("hidden");
        showToast("Erro ao criar conta.", "error");
    }
};

window.logout = () => {
    if (confirm("Deseja realmente sair?")) Auth.logout();
};

window.toggleDarkMode = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
};

window.navigateTo = (target) => {
    document.querySelectorAll(".page-section").forEach(pg => pg.classList.remove("active"));
    const targetScreen = document.getElementById(`${target}-screen`);
    if (targetScreen) targetScreen.classList.add("active");

    document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-target="${target}-screen"]`);
    if (btn) btn.classList.add("active");

    if (target === 'history') loadHistory();
    if (target === 'home') updateDashboard();
    if (target === 'settings') loadSettingsInputs();
};

window.addIngredient = () => {
    const name = document.getElementById("ing-name").value.trim();
    const quantity = document.getElementById("ing-qtd").value;
    const unit = document.getElementById("ing-unit").value;
    if (!name) return showToast("Digite o nome!", "error");

    currentIngredients.push({ name, quantity, unit });
    updateIngredientList();
    document.getElementById("ing-name").value = "";
    document.getElementById("ing-name").focus();
    resetSaveButton();
};

window.removeIngredient = (idx) => {
    currentIngredients.splice(idx, 1);
    updateIngredientList();
    resetSaveButton();
};

window.clearIngredients = () => {
    currentIngredients = [];
    updateIngredientList();
    document.getElementById("calc-results").classList.add("hidden");
    resetSaveButton();
};

window.calculateNutrition = async () => {
    if (currentIngredients.length === 0) return showToast("Adicione ingredientes!", "error");

    const btn = document.getElementById("btn-calc");
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Calculando...';
    btn.disabled = true;

    try {
        const results = await API.calculateNutritionFromAPI(currentIngredients);

        let totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
        results.forEach(r => {
            totals.calories += safeParseFloat(r.calories);
            totals.protein += safeParseFloat(r.protein);
            totals.carbs += safeParseFloat(r.carbs);
            totals.fats += safeParseFloat(r.fats);
            totals.fiber += safeParseFloat(r.fiber);
        });

        lastCalculatedTotals = totals;

        document.getElementById("res-cals").innerText = Math.round(totals.calories);
        document.getElementById("res-prot").innerText = totals.protein.toFixed(1);
        document.getElementById("res-carbs").innerText = totals.carbs.toFixed(1);
        document.getElementById("res-fats").innerText = totals.fats.toFixed(1);
        document.getElementById("res-fibers").innerText = totals.fiber.toFixed(1);
        document.getElementById("calc-results").classList.remove("hidden");

        const btnSave = document.getElementById("btn-save");
        btnSave.disabled = false;
        btnSave.className = "bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-all flex justify-center items-center gap-2 w-full cursor-pointer active:scale-95";

        showToast("Calculado com sucesso!", "success");
    } catch (err) {
        showToast("Erro: " + err.message, "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
};

window.saveMeal = async () => {
    if (!lastCalculatedTotals || !currentUser) return;
    const btnSave = document.getElementById("btn-save");
    btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSave.disabled = true;

    try {
        const mealData = {
            timestamp: Date.now(),
            date: new Date().toLocaleString("pt-BR"),
            ingredients: [...currentIngredients],
            totals: lastCalculatedTotals
        };
        await DB.saveMealToCloud(currentUser.uid, mealData);
        showToast("Salvo na nuvem!", "success");
        window.clearIngredients();
        await loadDataFromCloud();
        window.navigateTo("home");
    } catch (err) {
        showToast("Erro ao salvar refeição.", "error");
        resetSaveButton();
    }
};

window.deleteMeal = async (mealId) => {
    if (!confirm("Excluir refeição definitivamente?")) return;
    try {
        await DB.deleteMealFromCloud(currentUser.uid, mealId);
        showToast("Refeição excluída.", "success");
        await loadDataFromCloud();
    } catch (err) {
        showToast("Erro ao excluir.", "error");
    }
};

window.saveSettings = async () => {
    if (!currentUser) return;
    globalGoals = {
        calories: safeParseFloat(document.getElementById("goal-cals").value) || 2000,
        protein: safeParseFloat(document.getElementById("goal-prot").value) || 150,
        carbs: safeParseFloat(document.getElementById("goal-carbs").value) || 200,
        fats: safeParseFloat(document.getElementById("goal-fats").value) || 70,
        fibers: safeParseFloat(document.getElementById("goal-fibers").value) || 30
    };
    try {
        await DB.saveUserGoals(currentUser.uid, globalGoals);
        showToast("Metas salvas na nuvem!", "success");
        updateDashboard();
    } catch (err) {
        showToast("Erro ao salvar metas.", "error");
    }
};

/* ============================================================
   LÓGICA INTERNA E INICIALIZAÇÃO
   ============================================================ */
window.addEventListener("DOMContentLoaded", async () => {
    // 1. PRIMEIRO: Carrega todos os pedaços de HTML
    await UI.loadComponents();

    // 2. SEGUNDO: Aplica o tema escuro/claro
    initTheme();

    // 3. TERCEIRO: Liga o monitor de Autenticação
    Auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            if (user.photoURL) {
                document.getElementById('user-avatar').src = user.photoURL;
                document.getElementById('user-avatar').classList.remove('hidden');
                document.getElementById('user-avatar-fallback').classList.add('hidden');
            }

            const loginScreen = document.getElementById("login-screen");
            if (loginScreen) loginScreen.classList.add("hidden");

            document.getElementById("app-wrapper").classList.remove("hidden");
            document.getElementById("app-wrapper").classList.add("flex");

            loadDataFromCloud();
            window.navigateTo("home"); // Garante que vai pra home
        } else {
            currentUser = null;
            globalMeals = [];

            const loginScreen = document.getElementById("login-screen");
            if (loginScreen) loginScreen.classList.remove("hidden");

            document.getElementById("app-wrapper").classList.add("hidden");
            document.getElementById("app-wrapper").classList.remove("flex");

            const loginLoading = document.getElementById("login-loading");
            if (loginLoading) loginLoading.classList.add("hidden");
        }
    });
});

async function loadDataFromCloud() {
    if (!currentUser) return;
    const goals = await DB.getUserGoals(currentUser.uid);
    if (goals) globalGoals = goals;
    else await DB.saveUserGoals(currentUser.uid, globalGoals);

    globalMeals = await DB.getMeals(currentUser.uid);
    updateDashboard();
    loadHistory();
    loadSettingsInputs();
}

function updateDashboard() {
    const todayStr = new Date().toLocaleDateString("pt-BR");
    const todaysMeals = globalMeals.filter(m => {
        const dateToCheck = m.timestamp ? new Date(m.timestamp) : new Date();
        return dateToCheck.toLocaleDateString("pt-BR") === todayStr;
    });

    let dailyTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    todaysMeals.forEach(m => {
        if (m.totals) {
            dailyTotals.calories += safeParseFloat(m.totals.calories);
            dailyTotals.protein += safeParseFloat(m.totals.protein);
            dailyTotals.carbs += safeParseFloat(m.totals.carbs);
            dailyTotals.fats += safeParseFloat(m.totals.fats);
            dailyTotals.fiber += safeParseFloat(m.totals.fiber);
        }
    });

    animateValue("dashboard-cals", dailyTotals.calories);
    const goalCalDisplay = globalGoals.calories > 0 ? globalGoals.calories : 2000;
    safeSetText("dashboard-goal", goalCalDisplay);

    let percent = goalCalDisplay > 0 ? (dailyTotals.calories / goalCalDisplay) * 100 : 0;
    const progressBar = document.getElementById("progress-bar-cals");
    if (progressBar) {
        progressBar.style.width = `${Math.min(percent, 100)}%`;
        progressBar.classList.toggle("bg-red-500", dailyTotals.calories > goalCalDisplay);
        progressBar.classList.toggle("bg-primary-500", dailyTotals.calories <= goalCalDisplay);
    }
    safeSetText("dashboard-percent", `${Math.round(percent)}%`);

    updateMacroCard("dashboard-protein", dailyTotals.protein, globalGoals.protein);
    updateMacroCard("dashboard-carbs", dailyTotals.carbs, globalGoals.carbs);
    updateMacroCard("dashboard-fats", dailyTotals.fats, globalGoals.fats);
    updateMacroCard("dashboard-fibers", dailyTotals.fiber, globalGoals.fibers);
}

function updateMacroCard(elementId, current, goal) {
    safeSetText(elementId, Math.round(current));
    safeSetText(`${elementId}-goal`, goal > 0 ? goal : '-');
}

function loadHistory() {
    const container = document.getElementById("history-list");
    if (globalMeals.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">Histórico vazio.</p>';
        updateChart([]);
        return;
    }

    container.innerHTML = globalMeals.map(m => `
        <div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm mb-3 dark:bg-dark-surface dark:border-dark-border">
            <div class="flex justify-between mb-2">
                <strong class="text-gray-800 dark:text-white">${m.date}</strong>
                <button onclick="deleteMeal('${m.id}')" class="text-xs text-red-400 hover:text-red-600">Excluir</button>
            </div>
            <div class="text-xs text-gray-500 mb-2 italic truncate dark:text-gray-400">
                ${m.ingredients.map(i => `${i.quantity}${i.unit} ${i.name}`).join(", ")}
            </div>
            <div class="grid grid-cols-5 gap-1 text-center text-xs">
                <div class="bg-green-50 rounded p-1 dark:bg-green-900/30 text-green-700 dark:text-green-400"><b>${Math.round(safeParseFloat(m.totals.calories))}</b> Kcal</div>
                <div class="bg-blue-50 rounded p-1 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"><b>${Math.round(safeParseFloat(m.totals.protein))}</b> Prot</div>
                <div class="bg-orange-50 rounded p-1 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"><b>${Math.round(safeParseFloat(m.totals.carbs))}</b> Carb</div>
                <div class="bg-yellow-50 rounded p-1 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"><b>${Math.round(safeParseFloat(m.totals.fats))}</b> Gord</div>
                <div class="bg-gray-50 rounded p-1 dark:bg-gray-700 text-gray-700 dark:text-gray-300"><b>${Math.round(safeParseFloat(m.totals.fiber))}</b> Fib</div>
            </div>
        </div>
    `).join("");

    updateChart(globalMeals);
}

function updateChart(meals) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    const last7Days = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days[d.toLocaleDateString("pt-BR").substring(0, 5)] = 0;
    }

    meals.forEach(m => {
        const dStr = new Date(m.timestamp).toLocaleDateString("pt-BR").substring(0, 5);
        if (last7Days.hasOwnProperty(dStr)) last7Days[dStr] += safeParseFloat(m.totals.calories);
    });

    if (historyChart) historyChart.destroy();
    historyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(last7Days),
            datasets: [{ label: 'Kcal', data: Object.values(last7Days), backgroundColor: '#8b5cf6', borderRadius: 4, barThickness: 20 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { display: true, color: gridColor, borderDash: [5, 5] }, ticks: { color: textColor, font: { size: 10 } } },
                x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function loadSettingsInputs() {
    document.getElementById("goal-cals").value = globalGoals.calories;
    document.getElementById("goal-prot").value = globalGoals.protein;
    document.getElementById("goal-carbs").value = globalGoals.carbs;
    document.getElementById("goal-fats").value = globalGoals.fats;
    document.getElementById("goal-fibers").value = globalGoals.fibers;
}

function updateIngredientList() {
    const list = document.getElementById("ing-list");
    const card = document.getElementById("current-recipe-card");
    if (currentIngredients.length === 0) return card.classList.add("hidden");
    card.classList.remove("hidden");
    document.getElementById("ing-count").innerText = currentIngredients.length;
    list.innerHTML = currentIngredients.map((i, idx) => `
        <li class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="dark:text-gray-300">${i.quantity}${i.unit} ${i.name}</span>
            <button onclick="removeIngredient(${idx})" class="text-red-400"><i class="fas fa-times"></i></button>
        </li>
    `).join("");
}

function resetSaveButton() {
    const btn = document.getElementById("btn-save");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-check"></i> Gravar';
    btn.className = "bg-gray-200 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed flex justify-center items-center gap-2 w-full dark:bg-gray-700 dark:text-gray-500";
    lastCalculatedTotals = null;
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        document.documentElement.classList.add('dark');
        updateThemeIcon(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcon(false);
    }
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function showToast(msg, type) {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `px-4 py-3 rounded-lg shadow text-white animate-bounce-in ${type === "error" ? "bg-red-500" : "bg-green-600"}`;
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function safeParseFloat(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    const clean = value.toString().replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
}

function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function animateValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = Math.round(val);
}