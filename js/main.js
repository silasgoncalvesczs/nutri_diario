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
let currentDashboardDate = new Date(); // Controle de data do painel
let globalProfileData = {}; // Dados físicos (Idade, Peso, etc)
let tempAvatarBase64 = null; // Guarda a foto comprimida antes de salvar
let editingMealId = null; // Controle de edição de refeição

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
        console.error("Erro no login:", error);

        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            showToast("Senha incorreta. Se você usou o Google antes, clique em 'Entrar com Google'.", "error");
        } else if (error.code === 'auth/user-not-found') {
            showToast("Conta não encontrada. Clique em 'Cadastre-se agora'.", "error");
        } else {
            showToast("Erro ao fazer login. Verifique seus dados.", "error");
        }
    }
};

window.registerWithEmail = async () => {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!email || !password) return showToast("Preencha e-mail e senha.", "error");
    if (password.length < 6) return showToast("A senha deve ter no mínimo 6 caracteres.", "error");

    document.getElementById("login-loading").classList.remove("hidden");
    try {
        await Auth.registerWithEmail(email, password);
        showToast("Conta criada com sucesso!", "success");
        document.getElementById("login-email").value = "";
        document.getElementById("login-password").value = "";
    } catch (error) {
        document.getElementById("login-loading").classList.add("hidden");
        console.error("Erro no cadastro:", error);

        if (error.code === 'auth/email-already-in-use') {
            showToast("Este e-mail já está em uso! Tente 'Entrar com Google'.", "error");
        } else if (error.code === 'auth/invalid-email') {
            showToast("Formato de e-mail inválido.", "error");
        } else {
            showToast("Erro ao criar conta. Tente novamente.", "error");
        }
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

// ATUALIZADO: Limpa a lista e sai do modo de edição
window.clearIngredients = () => {
    currentIngredients = [];
    editingMealId = null; // Sai do modo de edição
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

// ATUALIZADO: Salva ou Atualiza a refeição baseada na variável editingMealId
window.saveMeal = async () => {
    if (!lastCalculatedTotals || !currentUser) return;
    const btnSave = document.getElementById("btn-save");
    btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btnSave.disabled = true;

    try {
        const originalMeal = editingMealId ? globalMeals.find(m => m.id === editingMealId) : null;

        const mealData = {
            timestamp: originalMeal ? originalMeal.timestamp : Date.now(),
            date: originalMeal ? originalMeal.date : new Date().toLocaleString("pt-BR"),
            ingredients: [...currentIngredients],
            totals: lastCalculatedTotals
        };

        if (editingMealId) {
            await DB.updateMealInCloud(currentUser.uid, editingMealId, mealData);
            showToast("Refeição atualizada!", "success");
        } else {
            await DB.saveMealToCloud(currentUser.uid, mealData);
            showToast("Salvo na nuvem!", "success");
        }

        window.clearIngredients();
        await loadDataFromCloud();
        window.navigateTo("home");
    } catch (err) {
        showToast("Erro ao salvar refeição.", "error");
        resetSaveButton();
    }
};

// NOVO: Função para colocar o app no Modo de Edição
window.editMeal = (mealId) => {
    const mealToEdit = globalMeals.find(m => m.id === mealId);
    if (!mealToEdit) return;

    // Joga os ingredientes de volta pra tela
    currentIngredients = [...mealToEdit.ingredients];
    updateIngredientList();

    // Entra no modo de edição
    editingMealId = mealId;

    document.getElementById("calc-results").classList.add("hidden");
    resetSaveButton();
    window.navigateTo('calculator');

    showToast("Edite as quantidades e calcule novamente.", "success");
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

window.changeDashboardDate = (offset) => {
    currentDashboardDate.setDate(currentDashboardDate.getDate() + offset);
    updateDashboard();
};

window.generateAITip = async () => {
    const tipText = document.getElementById("ai-tip-text");
    if (!tipText) return;

    const currentMacros = {
        calories: safeParseFloat(document.getElementById("dashboard-cals").innerText),
        protein: safeParseFloat(document.getElementById("dashboard-protein").innerText),
        carbs: safeParseFloat(document.getElementById("dashboard-carbs").innerText),
        fats: safeParseFloat(document.getElementById("dashboard-fats").innerText)
    };

    tipText.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Analisando seus macros...';

    try {
        const dica = await API.getAITipFromAPI(currentMacros, globalGoals);
        tipText.innerHTML = dica;
    } catch (error) {
        console.error(error);
        tipText.innerHTML = "Ops! A IA precisou de uma pausa. Tente novamente mais tarde.";
    }
};

// --- LÓGICA DO PERFIL E IMC ---
window.previewAvatar = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            tempAvatarBase64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('settings-avatar').src = tempAvatarBase64;
            document.getElementById('settings-avatar').classList.remove('hidden');
            document.getElementById('settings-avatar-fallback').classList.add('hidden');
        }
    };
};

window.calculateIMC = () => {
    const weightInput = document.getElementById("profile-weight");
    const heightInput = document.getElementById("profile-height");
    if (!weightInput || !heightInput) return;

    const weight = safeParseFloat(weightInput.value);
    const heightCm = safeParseFloat(heightInput.value);
    const imcCard = document.getElementById("imc-card");
    const imcValue = document.getElementById("imc-value");
    const imcStatus = document.getElementById("imc-status");

    if (weight > 0 && heightCm > 0 && imcCard && imcValue && imcStatus) {
        const heightM = heightCm / 100;
        const imc = weight / (heightM * heightM);

        imcValue.innerText = imc.toFixed(1);

        let status = "";
        let colorClass = "";
        if (imc < 18.5) { status = "Abaixo do peso"; colorClass = "text-yellow-600 dark:text-yellow-400"; }
        else if (imc >= 18.5 && imc < 24.9) { status = "Peso normal"; colorClass = "text-green-600 dark:text-green-400"; }
        else if (imc >= 25 && imc < 29.9) { status = "Sobrepeso"; colorClass = "text-orange-600 dark:text-orange-400"; }
        else { status = "Obesidade"; colorClass = "text-red-600 dark:text-red-400"; }

        imcStatus.innerText = status;
        imcStatus.className = `text-xs font-bold mt-1 ${colorClass}`;
        imcCard.classList.remove("hidden");
    } else if (imcCard) {
        imcCard.classList.add("hidden");
    }
};

window.saveProfile = async () => {
    if (!currentUser) return;
    const newName = document.getElementById("profile-name").value.trim();
    const btn = document.getElementById("btn-save-profile");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    btn.disabled = true;

    try {
        if (newName && newName !== currentUser.displayName) {
            await currentUser.updateProfile({ displayName: newName });
        }

        const newProfileData = {
            age: parseInt(document.getElementById("profile-age").value) || null,
            gender: document.getElementById("profile-gender").value || "",
            weight: safeParseFloat(document.getElementById("profile-weight").value) || null,
            height: safeParseFloat(document.getElementById("profile-height").value) || null
        };

        await DB.saveUserProfileData(currentUser.uid, newProfileData);
        globalProfileData = newProfileData;

        if (tempAvatarBase64) {
            await DB.saveUserProfilePhoto(currentUser.uid, tempAvatarBase64);

            const avatarEl = document.getElementById('user-avatar');
            if (avatarEl) {
                avatarEl.src = tempAvatarBase64;
                avatarEl.classList.remove('hidden');
                document.getElementById('user-avatar-fallback').classList.add('hidden');
            }
        }

        showToast("Perfil atualizado com sucesso!", "success");
    } catch (error) {
        console.error(error);
        showToast("Erro ao atualizar o perfil. Tente novamente.", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

/* ============================================================
   LÓGICA INTERNA E INICIALIZAÇÃO
   ============================================================ */
window.addEventListener("DOMContentLoaded", async () => {
    await UI.loadComponents();

    initTheme();

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
            window.navigateTo("home");
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

    // 1. Carrega Metas
    const goals = await DB.getUserGoals(currentUser.uid);
    if (goals) globalGoals = goals;
    else await DB.saveUserGoals(currentUser.uid, globalGoals);

    // 2. Busca Dados Físicos
    const savedProfile = await DB.getUserProfileData(currentUser.uid);
    if (savedProfile) globalProfileData = savedProfile;

    // 3. Busca a Foto do Banco de Dados
    const savedPhoto = await DB.getUserProfilePhoto(currentUser.uid);
    if (savedPhoto) {
        tempAvatarBase64 = savedPhoto;

        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            avatarEl.src = savedPhoto;
            avatarEl.classList.remove('hidden');
            document.getElementById('user-avatar-fallback').classList.add('hidden');
        }
    } else if (currentUser.photoURL) {
        const avatarEl = document.getElementById('user-avatar');
        if (avatarEl) {
            avatarEl.src = currentUser.photoURL;
            avatarEl.classList.remove('hidden');
            document.getElementById('user-avatar-fallback').classList.add('hidden');
        }
    }

    // 4. Carrega Refeições
    globalMeals = await DB.getMeals(currentUser.uid);
    updateDashboard();
    loadHistory();
    loadSettingsInputs();
}

function updateDashboard() {
    const today = new Date();
    const dateStr = currentDashboardDate.toLocaleDateString("pt-BR");
    const todayStr = today.toLocaleDateString("pt-BR");

    let label = "Hoje";
    if (dateStr !== todayStr) {
        let yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (dateStr === yesterday.toLocaleDateString("pt-BR")) {
            label = "Ontem";
        } else {
            label = dateStr.substring(0, 5);
        }
    }
    safeSetText("dashboard-date-display", label);

    const targetMeals = globalMeals.filter(m => {
        const dateToCheck = m.timestamp ? new Date(m.timestamp) : new Date();
        return dateToCheck.toLocaleDateString("pt-BR") === dateStr;
    });

    let dailyTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
    targetMeals.forEach(m => {
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

// ATUALIZADO: Renderização do histórico com botão Editar
function loadHistory() {
    const container = document.getElementById("history-list");
    if (globalMeals.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 opacity-50">
                <i class="fas fa-utensils text-4xl mb-3 text-gray-300 dark:text-gray-600"></i>
                <p class="text-center text-gray-400 dark:text-gray-500 font-medium">Histórico vazio.</p>
            </div>`;
        updateChart([]);
        return;
    }

    container.innerHTML = globalMeals.map(m => `
        <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 dark:bg-dark-surface dark:border-dark-border transition-colors duration-300">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center gap-3">
                    <div class="bg-primary-50 dark:bg-primary-900/20 p-2.5 rounded-xl text-primary-600 dark:text-primary-400">
                        <i class="fas fa-clock text-sm"></i>
                    </div>
                    <strong class="text-gray-800 dark:text-white font-bold tracking-wide">${m.date}</strong>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="editMeal('${m.id}')" class="text-gray-400 hover:text-blue-500 transition-colors bg-gray-50 hover:bg-blue-50 dark:bg-dark-bg dark:hover:bg-blue-900/20 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95">
                        Editar
                    </button>
                    <button onclick="deleteMeal('${m.id}')" class="text-gray-400 hover:text-red-500 transition-colors bg-gray-50 hover:bg-red-50 dark:bg-dark-bg dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-xs font-bold active:scale-95">
                        Excluir
                    </button>
                </div>
            </div>
            <div class="text-sm text-gray-500 mb-5 dark:text-gray-400 px-1 leading-relaxed border-l-2 border-gray-100 dark:border-dark-border pl-3">
                ${m.ingredients.map(i => `<span class="font-medium text-gray-600 dark:text-gray-300">${i.quantity}${i.unit}</span> ${i.name}`).join(" &bull; ")}
            </div>
            <div class="grid grid-cols-5 gap-2">
                <div class="flex flex-col items-center justify-center bg-gray-50 dark:bg-dark-bg py-2 rounded-xl border border-gray-100 dark:border-dark-border">
                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Kcal</span>
                    <span class="font-extrabold text-gray-700 dark:text-gray-200">${Math.round(safeParseFloat(m.totals.calories))}</span>
                </div>
                <div class="flex flex-col items-center justify-center bg-blue-50/50 dark:bg-blue-900/10 py-2 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                    <span class="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-0.5">Prot</span>
                    <span class="font-extrabold text-blue-700 dark:text-blue-400">${Math.round(safeParseFloat(m.totals.protein))}g</span>
                </div>
                <div class="flex flex-col items-center justify-center bg-orange-50/50 dark:bg-orange-900/10 py-2 rounded-xl border border-orange-100/50 dark:border-orange-900/30">
                    <span class="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-0.5">Carb</span>
                    <span class="font-extrabold text-orange-700 dark:text-orange-400">${Math.round(safeParseFloat(m.totals.carbs))}g</span>
                </div>
                <div class="flex flex-col items-center justify-center bg-yellow-50/50 dark:bg-yellow-900/10 py-2 rounded-xl border border-yellow-100/50 dark:border-yellow-900/30">
                    <span class="text-[10px] text-yellow-600 font-bold uppercase tracking-wider mb-0.5">Gord</span>
                    <span class="font-extrabold text-yellow-700 dark:text-yellow-500">${Math.round(safeParseFloat(m.totals.fats))}g</span>
                </div>
                <div class="flex flex-col items-center justify-center bg-green-50/50 dark:bg-green-900/10 py-2 rounded-xl border border-green-100/50 dark:border-green-900/30">
                    <span class="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-0.5">Fib</span>
                    <span class="font-extrabold text-green-700 dark:text-green-400">${Math.round(safeParseFloat(m.totals.fiber))}g</span>
                </div>
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
    // 1. Preenche as Metas
    document.getElementById("goal-cals").value = globalGoals.calories;
    document.getElementById("goal-prot").value = globalGoals.protein;
    document.getElementById("goal-carbs").value = globalGoals.carbs;
    document.getElementById("goal-fats").value = globalGoals.fats;
    document.getElementById("goal-fibers").value = globalGoals.fibers;

    // 2. Preenche Nome e Foto
    if (currentUser) {
        document.getElementById("profile-name").value = currentUser.displayName || "";
        const photoToShow = tempAvatarBase64 || currentUser.photoURL;
        if (photoToShow) {
            const settingsAvatar = document.getElementById("settings-avatar");
            if (settingsAvatar) {
                settingsAvatar.src = photoToShow;
                settingsAvatar.classList.remove("hidden");
                document.getElementById("settings-avatar-fallback").classList.add("hidden");
            }
        }
    }

    // 3. Preenche Dados Físicos
    if (globalProfileData) {
        const ageEl = document.getElementById("profile-age");
        const genderEl = document.getElementById("profile-gender");
        const weightEl = document.getElementById("profile-weight");
        const heightEl = document.getElementById("profile-height");

        if (ageEl && globalProfileData.age) ageEl.value = globalProfileData.age;
        if (genderEl && globalProfileData.gender) genderEl.value = globalProfileData.gender;
        if (weightEl && globalProfileData.weight) weightEl.value = globalProfileData.weight;
        if (heightEl && globalProfileData.height) heightEl.value = globalProfileData.height;

        window.calculateIMC();
    }
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