/* ============================================================
   Nutridiário - script.js (Versão Final Corrigida)
   Frontend → GitHub Pages
   Backend → Vercel
   ============================================================ */

// Estado da aplicação
let currentIngredients = [];
let lastCalculatedTotals = null;

/* ============================================================
   TEMA ESCURO (DARK MODE) - Lógica Adicionada
   ============================================================ */
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

function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        // Troca o ícone: Lua (dark) ou Sol (light)
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

/* ============================================================
   FUNÇÃO DE NAVEGAÇÃO (CORRIGIDA)
   ============================================================ */
function navigateTo(target) {
    // 1. Troca a tela visível
    document.querySelectorAll(".page-section").forEach(pg => pg.classList.remove("active"));
    const targetScreen = document.getElementById(`${target}-screen`);
    if (targetScreen) targetScreen.classList.add("active");

    // 2. Atualiza os botões do rodapé
    document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-target="${target}-screen"]`);
    if (btn) btn.classList.add("active");

    // 3. ATUALIZA OS DADOS DA TELA ESPECÍFICA (O Pulo do Gato)
    if (target === 'history') {
        loadHistory(); // Recarrega a lista sempre que entrar no histórico
    } 
    else if (target === 'home') {
        updateDashboard(); // Garante que os totais de hoje estejam certos
    }
}

/* ============================================================
   TOAST (NOTIFICAÇÕES)
   ============================================================ */
function showToast(msg, type = "info") {
    const container = document.getElementById("toast-container");

    const el = document.createElement("div");
    el.className = `px-4 py-3 rounded-lg shadow text-white flex items-center gap-2 animate-bounce-in ${
        type === "error" ? "bg-red-500" :
        type === "success" ? "bg-green-600" :
        "bg-gray-800 dark:bg-gray-700"
    }`;

    el.innerHTML = `<span>${msg}</span>`;
    container.appendChild(el);

    setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

/* ============================================================
   ADICIONAR INGREDIENTE
   ============================================================ */
function addIngredient() {
    const nameInput = document.getElementById("ing-name");
    const qtdInput = document.getElementById("ing-qtd");
    const unitInput = document.getElementById("ing-unit");

    const name = nameInput.value.trim();
    const quantity = qtdInput.value.trim();
    const unit = unitInput.value.trim();

    if (!name || !quantity || !unit) {
        showToast("Preencha todos os campos!", "error");
        return;
    }

    currentIngredients.push({ name, quantity, unit });
    updateIngredientList();

    // Resetar campos
    nameInput.value = "";
    qtdInput.value = "100";
    nameInput.focus();

    showToast("Ingrediente adicionado!", "success");
    
    // Reseta o botão salvar se houver mudança
    resetSaveButton();
}

function clearIngredients() {
    currentIngredients = [];
    updateIngredientList();
    document.getElementById("calc-results").classList.add("hidden");
    resetSaveButton();
}

function updateIngredientList() {
    const list = document.getElementById("ing-list");
    const count = document.getElementById("ing-count");
    const card = document.getElementById("current-recipe-card");

    if (currentIngredients.length === 0) {
        card.classList.add("hidden");
        return;
    }

    card.classList.remove("hidden");
    count.innerText = currentIngredients.length;

    list.innerHTML = currentIngredients
        .map((i, index) => `
            <li class="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span class="text-sm text-gray-700 dark:text-gray-300">
                    <strong>${i.quantity}${i.unit}</strong> ${i.name}
                </span>
                <button onclick="removeIngredient(${index})" class="text-red-400 hover:text-red-600">
                    <i class="fas fa-times"></i>
                </button>
            </li>`)
        .join("");
}

function removeIngredient(index) {
    currentIngredients.splice(index, 1);
    updateIngredientList();
    resetSaveButton();
}

function resetSaveButton() {
    const btn = document.getElementById("btn-save");
    btn.disabled = true;
    // Volta para estilo cinza (desabilitado)
    btn.className = "bg-gray-200 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed transition-all flex justify-center items-center gap-2 dark:bg-gray-700 dark:text-gray-500 w-full";
    lastCalculatedTotals = null;
}

/* ============================================================
   CALCULAR NUTRIÇÃO (API)
   ============================================================ */
async function calculateNutrition() {
    if (currentIngredients.length === 0) {
        showToast("Adicione ingredientes antes de calcular.", "error");
        return;
    }

    const btn = document.getElementById("btn-calc");
    const originalContent = btn.innerHTML;

    // Estado de Carregamento
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Calculando...';
    btn.disabled = true;
    btn.classList.add("opacity-75");

    try {
        const ingredientsText = currentIngredients
            .map(x => `- ${x.name}: ${x.quantity} ${x.unit}`)
            .join("\n");

        // LEMBRETE: A URL do fetch deve ser a do seu Vercel
        const response = await fetch("https://nutri-diario.vercel.app/api/nutrition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: ingredientsText })
        });

        if (!response.ok) {
            throw new Error("Erro ao conectar ao servidor");
        }

        const data = await response.json();
        let text = data.choices[0].message.content;

        // Limpeza extra para garantir JSON puro
        text = text.replace(/```json|```/g, "").trim();
        const jsonStr = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
        
        const results = JSON.parse(jsonStr);

        // Soma os totais
        let totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

        results.forEach(r => {
            totals.calories += Number(r.calories) || 0;
            totals.protein += Number(r.protein) || 0;
            totals.carbs += Number(r.carbs) || 0;
            totals.fats += Number(r.fats) || 0;
            totals.fiber += Number(r.fiber) || 0;
        });

        lastCalculatedTotals = totals;

        // Atualiza UI
        document.getElementById("res-cals").innerText = Math.round(totals.calories);
        document.getElementById("res-prot").innerText = totals.protein.toFixed(1);
        document.getElementById("res-carbs").innerText = totals.carbs.toFixed(1);
        document.getElementById("res-fats").innerText = totals.fats.toFixed(1);
        document.getElementById("res-fibers").innerText = totals.fiber.toFixed(1);

        document.getElementById("calc-results").classList.remove("hidden");

        // ============================================================
        // CORREÇÃO DO BOTÃO SALVAR (Muda a cor para verde)
        // ============================================================
        const btnSave = document.getElementById("btn-save");
        btnSave.disabled = false;
        btnSave.className = "bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-all flex justify-center items-center gap-2 w-full cursor-pointer active:scale-95";
        
        showToast("Cálculo concluído com sucesso!", "success");

    } catch (err) {
        console.error(err);
        showToast("Erro: Tente novamente.", "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        btn.classList.remove("opacity-75");
    }
}

/* ============================================================
   SALVAR REFEIÇÃO
   ============================================================ */
function saveMeal() {
    if (!lastCalculatedTotals) {
        showToast("Calcule antes de salvar!", "error");
        return;
    }

    const meals = JSON.parse(localStorage.getItem("meals") || "[]");

    meals.push({
        id: Date.now(),
        date: new Date().toLocaleString("pt-BR"),
        timestamp: Date.now(), // Bom para ordenação
        ingredients: [...currentIngredients], // Cópia do array
        totals: lastCalculatedTotals
    });

    localStorage.setItem("meals", JSON.stringify(meals));

    showToast("Refeição salva no histórico!", "success");
    
    // Limpa a tela após salvar para nova inserção
    clearIngredients();
    updateDashboard(); // Atualiza a Home
    navigateTo("home");
}

/* ============================================================
   DASHBOARD (HOME) - CORRIGIDO E BLINDADO
   ============================================================ */
function updateDashboard() {
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    
    // Define a data de hoje
    const todayStr = new Date().toLocaleDateString("pt-BR");

    // Filtra apenas refeições de hoje com segurança
    const todaysMeals = meals.filter(m => {
        // Se não tiver timestamp (dados antigos), usa a data atual para não quebrar
        const dateToCheck = m.timestamp ? new Date(m.timestamp) : new Date();
        return dateToCheck.toLocaleDateString("pt-BR") === todayStr;
    });

    let dailyTotals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

    // Soma os valores convertendo explicitamente para Number (evita erro de texto)
    todaysMeals.forEach(m => {
        if (m.totals) {
            dailyTotals.calories += Number(m.totals.calories) || 0;
            dailyTotals.protein += Number(m.totals.protein) || 0;
            dailyTotals.carbs += Number(m.totals.carbs) || 0;
            dailyTotals.fats += Number(m.totals.fats) || 0;
            dailyTotals.fiber += Number(m.totals.fiber) || 0;
        }
    });

    // Carrega as metas (ou usa padrão se não existir)
    const goals = getGoals();

    // --- Atualiza a Interface (DOM) ---

    // 1. Calorias e Barra de Progresso
    animateValue("dashboard-cals", dailyTotals.calories);
    document.getElementById("dashboard-goal").innerText = goals.calories;

    // Cálculo da porcentagem (proteção contra divisão por zero)
    let percent = 0;
    if (goals.calories > 0) {
        percent = (dailyTotals.calories / goals.calories) * 100;
    }
    // Trava em 100% visualmente para a barra não estourar a tela
    const visualPercent = Math.min(percent, 100);
    
    document.getElementById("progress-bar-cals").style.width = `${visualPercent}%`;
    document.getElementById("dashboard-percent").innerText = `${Math.round(percent)}%`; // Mostra o real (ex: 120%)

    // Muda cor da barra se ultrapassar a meta
    const bar = document.getElementById("progress-bar-cals");
    if (dailyTotals.calories > goals.calories) {
        bar.classList.remove("bg-primary-500");
        bar.classList.add("bg-red-500");
    } else {
        bar.classList.add("bg-primary-500");
        bar.classList.remove("bg-red-500");
    }

    // 2. Macros (Arredondando para inteiros)
    document.getElementById("dashboard-protein").innerText = Math.round(dailyTotals.protein);
    document.getElementById("dashboard-protein-goal").innerText = goals.protein;

    document.getElementById("dashboard-carbs").innerText = Math.round(dailyTotals.carbs);
    document.getElementById("dashboard-carbs-goal").innerText = goals.carbs;

    document.getElementById("dashboard-fats").innerText = Math.round(dailyTotals.fats);
    document.getElementById("dashboard-fats-goal").innerText = goals.fats;

    document.getElementById("dashboard-fibers").innerText = Math.round(dailyTotals.fiber);
    document.getElementById("dashboard-fibers-goal").innerText = goals.fibers;
}

function loadHistory() {
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    // Ordena do mais recente para o mais antigo
    meals.sort((a, b) => b.timestamp - a.timestamp);

    const container = document.getElementById("history-list");
    
    if (meals.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">Nenhuma refeição registrada ainda.</p>';
        return;
    }

    container.innerHTML = meals.map(m => `
        <div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm dark:bg-dark-surface dark:border-dark-border">
            <div class="flex justify-between mb-2">
                <strong class="text-gray-800 dark:text-white">${m.date}</strong>
                <button onclick="deleteMeal(${m.id})" class="text-xs text-red-400 hover:text-red-600">Excluir</button>
            </div>
            <div class="text-xs text-gray-500 mb-2 italic dark:text-gray-400">
                ${m.ingredients.map(i => `${i.quantity}${i.unit} ${i.name}`).join(", ")}
            </div>
            <div class="grid grid-cols-5 gap-1 text-center text-xs">
                <div class="bg-green-50 rounded p-1 dark:bg-green-900/30">
                    <div class="font-bold text-green-700 dark:text-green-400">${Math.round(m.totals.calories)}</div>
                    <div class="text-[9px] text-green-600">Kcal</div>
                </div>
                <div class="bg-blue-50 rounded p-1 dark:bg-blue-900/30">
                    <div class="font-bold text-blue-700 dark:text-blue-400">${Math.round(m.totals.protein)}g</div>
                    <div class="text-[9px] text-blue-600">Prot</div>
                </div>
                <div class="bg-orange-50 rounded p-1 dark:bg-orange-900/30">
                    <div class="font-bold text-orange-700 dark:text-orange-400">${Math.round(m.totals.carbs)}g</div>
                    <div class="text-[9px] text-orange-600">Carb</div>
                </div>
                <div class="bg-yellow-50 rounded p-1 dark:bg-yellow-900/30">
                    <div class="font-bold text-yellow-700 dark:text-yellow-400">${Math.round(m.totals.fats)}g</div>
                    <div class="text-[9px] text-yellow-600">Gord</div>
                </div>
                 <div class="bg-gray-50 rounded p-1 dark:bg-gray-700">
                    <div class="font-bold text-gray-700 dark:text-gray-300">${Math.round(m.totals.fiber)}g</div>
                    <div class="text-[9px] text-gray-500">Fib</div>
                </div>
            </div>
        </div>
    `).join("");
    
    updateChart(meals);
}

function deleteMeal(id) {
    if(!confirm("Tem certeza que deseja excluir esta refeição?")) return;
    
    let meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals = meals.filter(m => m.id !== id);
    localStorage.setItem("meals", JSON.stringify(meals));
    
    loadHistory();
    updateDashboard();
    showToast("Refeição excluída.", "info");
}

/* ============================================================
   METAS E CONFIGURAÇÕES
   ============================================================ */
function getGoals() {
    const defaultGoals = { calories: 2000, protein: 150, carbs: 200, fats: 70, fibers: 30 };
    const saved = JSON.parse(localStorage.getItem("userGoals"));
    return saved || defaultGoals;
}

function saveSettings() {
    const goals = {
        calories: Number(document.getElementById("goal-cals").value) || 2000,
        protein: Number(document.getElementById("goal-prot").value) || 150,
        carbs: Number(document.getElementById("goal-carbs").value) || 200,
        fats: Number(document.getElementById("goal-fats").value) || 70,
        fibers: Number(document.getElementById("goal-fibers").value) || 30
    };

    localStorage.setItem("userGoals", JSON.stringify(goals));
    showToast("Metas atualizadas!", "success");
    updateDashboard();
}

function loadSettingsInputs() {
    const goals = getGoals();
    document.getElementById("goal-cals").value = goals.calories;
    document.getElementById("goal-prot").value = goals.protein;
    document.getElementById("goal-carbs").value = goals.carbs;
    document.getElementById("goal-fats").value = goals.fats;
    document.getElementById("goal-fibers").value = goals.fibers;
}

function clearAllData() {
    if(confirm("Isso apagará TODO o seu histórico e configurações. Continuar?")) {
        localStorage.clear();
        location.reload();
    }
}

/* ============================================================
   GRÁFICO (CHART.JS)
   ============================================================ */
let historyChart = null;

function updateChart(meals) {
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    // Agrupar por dia (últimos 7 dias)
    const last7Days = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("pt-BR").substring(0, 5); // "dd/mm"
        last7Days[dateStr] = 0;
    }

    meals.forEach(m => {
        const dStr = new Date(m.timestamp).toLocaleDateString("pt-BR").substring(0, 5);
        if (last7Days.hasOwnProperty(dStr)) {
            last7Days[dStr] += m.totals.calories;
        }
    });

    const labels = Object.keys(last7Days);
    const data = Object.values(last7Days);

    if (historyChart) {
        historyChart.destroy();
    }

    historyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Kcal',
                data: data,
                backgroundColor: '#8b5cf6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */
function animateValue(id, end) {
    const obj = document.getElementById(id);
    // Simples atualização, poderia ser uma animação numérica
    obj.innerText = Math.round(end);
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    navigateTo("home");
    updateDashboard();
    loadHistory(); // Prepara histórico se o usuário for para lá
    loadSettingsInputs(); // Prepara inputs da tela de settings
});