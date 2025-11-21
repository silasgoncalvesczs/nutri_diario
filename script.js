/* ============================================================
   Nutridiário - script.js (Versão Blindada v3.0)
   ============================================================ */

let currentIngredients = [];
let lastCalculatedTotals = null;

/* ============================================================
   TEMA & INICIALIZAÇÃO
   ============================================================ */
window.addEventListener("DOMContentLoaded", () => {
    initTheme();
    // Garante que existam metas padrão ao abrir
    ensureDefaultGoals();
    navigateTo("home");
});

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
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

/* ============================================================
   UTILITÁRIO DE LIMPEZA NUMÉRICA (A CORREÇÃO MÁGICA)
   ============================================================ */
// Transforma "20g", "20 g", "approx 20" em apenas 20.0
function safeParseFloat(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    // Remove tudo que não for número ou ponto decimal
    const clean = value.toString().replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
}

/* ============================================================
   NAVEGAÇÃO & ATUALIZAÇÃO
   ============================================================ */
function navigateTo(target) {
    document.querySelectorAll(".page-section").forEach(pg => pg.classList.remove("active"));
    const targetScreen = document.getElementById(`${target}-screen`);
    if (targetScreen) targetScreen.classList.add("active");

    document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-target="${target}-screen"]`);
    if (btn) btn.classList.add("active");

    if (target === 'history') loadHistory();
    if (target === 'home') updateDashboard();
    if (target === 'settings') loadSettingsInputs();
}

/* ============================================================
   DASHBOARD (HOME) - COM PROTEÇÃO CONTRA ERROS
   ============================================================ */

// 1. Adicione esta função NOVA auxiliar (ajuda a não travar o app)
function safeSetText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.innerText = text;
    } else {
        console.warn(`Aviso: Elemento '${id}' não encontrado no HTML.`);
    }
}

// 2. Substitua a função updateDashboard inteira por esta versão segura
function updateDashboard() {
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    const todayStr = new Date().toLocaleDateString("pt-BR");

    const todaysMeals = meals.filter(m => {
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

    const goals = getGoals();

    // --- Atualiza a Interface com SEGURANÇA (safeSetText) ---

    // Calorias e Metas
    animateValue("dashboard-cals", dailyTotals.calories);

    // Usa a função segura ao invés de acessar direto (isso que corrigirá seu erro)
    const goalCalDisplay = goals.calories > 0 ? goals.calories : 2000;
    safeSetText("dashboard-goal", goalCalDisplay);

    // Barra de Progresso
    let percent = 0;
    if (goalCalDisplay > 0) {
        percent = (dailyTotals.calories / goalCalDisplay) * 100;
    }
    const visualPercent = Math.min(percent, 100);

    const progressBar = document.getElementById("progress-bar-cals");
    if (progressBar) {
        progressBar.style.width = `${visualPercent}%`;

        // Lógica de cor da barra
        if (dailyTotals.calories > goalCalDisplay) {
            progressBar.classList.remove("bg-primary-500");
            progressBar.classList.add("bg-red-500");
        } else {
            progressBar.classList.add("bg-primary-500");
            progressBar.classList.remove("bg-red-500");
        }
    }

    safeSetText("dashboard-percent", `${Math.round(percent)}%`);

    // Macros
    updateMacroCard("dashboard-protein", dailyTotals.protein, goals.protein);
    updateMacroCard("dashboard-carbs", dailyTotals.carbs, goals.carbs);
    updateMacroCard("dashboard-fats", dailyTotals.fats, goals.fats);
    updateMacroCard("dashboard-fibers", dailyTotals.fiber, goals.fibers);
}

// 3. Atualize também a função updateMacroCard para usar o safeSetText
function updateMacroCard(elementId, current, goal) {
    safeSetText(elementId, Math.round(current));

    // Verifica se existe meta para mostrar
    const goalText = goal > 0 ? goal : '-';
    safeSetText(`${elementId}-goal`, goalText);
}

/* ============================================================
   CALCULAR (API)
   ============================================================ */
async function calculateNutrition() {
    if (currentIngredients.length === 0) {
        showToast("Adicione ingredientes!", "error");
        return;
    }

    const btn = document.getElementById("btn-calc");
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Calculando...';
    btn.disabled = true;

    try {
        const ingredientsText = currentIngredients.map(x => `- ${x.quantity} ${x.unit} de ${x.name}`).join("\n");

        const response = await fetch("https://nutri-diario.vercel.app/api/nutrition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: ingredientsText })
        });

        if (!response.ok) throw new Error("Erro servidor");

        const data = await response.json();
        let text = data.choices[0].message.content.replace(/```json|```/g, "").trim();
        const jsonStr = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
        const results = JSON.parse(jsonStr);

        let totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

        results.forEach(r => {
            totals.calories += safeParseFloat(r.calories);
            totals.protein += safeParseFloat(r.protein);
            totals.carbs += safeParseFloat(r.carbs);
            totals.fats += safeParseFloat(r.fats);
            totals.fiber += safeParseFloat(r.fiber);
        });

        lastCalculatedTotals = totals;

        // Atualiza UI do resultado
        document.getElementById("res-cals").innerText = Math.round(totals.calories);
        document.getElementById("res-prot").innerText = totals.protein.toFixed(1);
        document.getElementById("res-carbs").innerText = totals.carbs.toFixed(1);
        document.getElementById("res-fats").innerText = totals.fats.toFixed(1);
        document.getElementById("res-fibers").innerText = totals.fiber.toFixed(1);

        document.getElementById("calc-results").classList.remove("hidden");

        // Habilita botão salvar
        const btnSave = document.getElementById("btn-save");
        btnSave.disabled = false;
        btnSave.className = "bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 transition-all flex justify-center items-center gap-2 w-full cursor-pointer active:scale-95";

        showToast("Calculado!", "success");

    } catch (err) {
        console.error(err);
        showToast("Erro ao calcular. Tente novamente.", "error");
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

/* ============================================================
   SALVAR & HISTÓRICO
   ============================================================ */
function saveMeal() {
    if (!lastCalculatedTotals) return;

    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals.push({
        id: Date.now(),
        date: new Date().toLocaleString("pt-BR"),
        timestamp: Date.now(),
        ingredients: [...currentIngredients],
        totals: lastCalculatedTotals
    });

    localStorage.setItem("meals", JSON.stringify(meals));
    showToast("Salvo!", "success");

    clearIngredients();
    navigateTo("home");
}

function loadHistory() {
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals.sort((a, b) => b.timestamp - a.timestamp);
    const container = document.getElementById("history-list");

    if (meals.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-400 py-4">Histórico vazio.</p>';
        updateChart([]);
        return;
    }

    container.innerHTML = meals.map(m => `
        <div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm mb-3 dark:bg-dark-surface dark:border-dark-border">
            <div class="flex justify-between mb-2">
                <strong class="text-gray-800 dark:text-white">${m.date}</strong>
                <button onclick="deleteMeal(${m.id})" class="text-xs text-red-400 hover:text-red-600">Excluir</button>
            </div>
            <div class="text-xs text-gray-500 mb-2 italic truncate dark:text-gray-400">
                ${m.ingredients.map(i => `${i.quantity}${i.unit} ${i.name}`).join(", ")}
            </div>
            <div class="grid grid-cols-5 gap-1 text-center text-xs">
                <div class="bg-green-50 rounded p-1 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                    <b>${Math.round(safeParseFloat(m.totals.calories))}</b> Kcal
                </div>
                <div class="bg-blue-50 rounded p-1 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    <b>${Math.round(safeParseFloat(m.totals.protein))}</b> Prot
                </div>
                <div class="bg-orange-50 rounded p-1 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                    <b>${Math.round(safeParseFloat(m.totals.carbs))}</b> Carb
                </div>
                <div class="bg-yellow-50 rounded p-1 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                    <b>${Math.round(safeParseFloat(m.totals.fats))}</b> Gord
                </div>
                <div class="bg-gray-50 rounded p-1 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    <b>${Math.round(safeParseFloat(m.totals.fiber))}</b> Fib
                </div>
            </div>
        </div>
    `).join("");

    updateChart(meals);
}

function deleteMeal(id) {
    if (!confirm("Excluir refeição?")) return;
    let meals = JSON.parse(localStorage.getItem("meals") || "[]");
    meals = meals.filter(m => m.id !== id);
    localStorage.setItem("meals", JSON.stringify(meals));
    loadHistory(); // Recarrega a lista visualmente
}

/* ============================================================
   METAS & SETTINGS
   ============================================================ */
function ensureDefaultGoals() {
    const saved = localStorage.getItem("userGoals");
    // Se não tem metas salvas ou se as metas estão zeradas (bug antigo)
    if (!saved || saved.includes('"calories":0')) {
        const defaultGoals = { calories: 2000, protein: 150, carbs: 200, fats: 70, fibers: 30 };
        localStorage.setItem("userGoals", JSON.stringify(defaultGoals));
    }
}

function getGoals() {
    const saved = JSON.parse(localStorage.getItem("userGoals"));
    return saved || { calories: 2000, protein: 150, carbs: 200, fats: 70, fibers: 30 };
}

function saveSettings() {
    const goals = {
        calories: safeParseFloat(document.getElementById("goal-cals").value) || 2000,
        protein: safeParseFloat(document.getElementById("goal-prot").value) || 150,
        carbs: safeParseFloat(document.getElementById("goal-carbs").value) || 200,
        fats: safeParseFloat(document.getElementById("goal-fats").value) || 70,
        fibers: safeParseFloat(document.getElementById("goal-fibers").value) || 30
    };
    localStorage.setItem("userGoals", JSON.stringify(goals));
    showToast("Metas salvas!", "success");
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
    if (confirm("Apagar TUDO e reiniciar o app?")) {
        localStorage.clear();
        location.reload();
    }
}

/* ============================================================
   GRÁFICO (ATUALIZADO COM LINHAS DE FUNDO)
   ============================================================ */
let historyChart = null;

function updateChart(meals) {
    const ctx = document.getElementById('historyChart').getContext('2d');

    // Detecta se está em modo escuro para ajustar a cor das linhas
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#9ca3af' : '#6b7280'; // Cinza mais suave

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
            last7Days[dStr] += safeParseFloat(m.totals.calories);
        }
    });

    const labels = Object.keys(last7Days);
    const data = Object.values(last7Days);

    if (historyChart) {
        historyChart.destroy();
    }

    historyChart = new Chart(ctx, {
        type: 'bar', // Ou 'line' se preferir linha
        data: {
            labels: labels,
            datasets: [{
                label: 'Kcal',
                data: data,
                backgroundColor: '#8b5cf6',
                borderRadius: 4,
                barThickness: 20, // Barras um pouco mais finas e elegantes
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true, // AQUI: Liga as linhas
                        color: gridColor, // Cor adaptativa
                        borderDash: [5, 5], // Linha pontilhada (5px linha, 5px espaço)
                        drawBorder: false // Remove a linha grossa do eixo esquerda
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 10 }
                    }
                },
                x: {
                    grid: {
                        display: false // Mantém vertical limpo
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 10 }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: isDark ? '#374151' : '#fff',
                    titleColor: isDark ? '#fff' : '#111827',
                    bodyColor: isDark ? '#d1d5db' : '#4b5563',
                    borderColor: isDark ? '#4b5563' : '#e5e7eb',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false, // Remove o quadradinho de cor do tooltip
                    callbacks: {
                        label: function (context) {
                            return context.parsed.y + ' Kcal';
                        }
                    }
                }
            }
        }
    });
}

/* ============================================================
   AUXILIARES UI
   ============================================================ */
function addIngredient() {
    const name = document.getElementById("ing-name").value.trim();
    const quantity = document.getElementById("ing-qtd").value;
    const unit = document.getElementById("ing-unit").value;

    if (!name) return showToast("Digite o nome!", "error");

    currentIngredients.push({ name, quantity, unit });
    updateIngredientList();

    document.getElementById("ing-name").value = "";
    document.getElementById("ing-name").focus();
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
    const card = document.getElementById("current-recipe-card");

    if (currentIngredients.length === 0) {
        card.classList.add("hidden");
        return;
    }
    card.classList.remove("hidden");
    document.getElementById("ing-count").innerText = currentIngredients.length;

    list.innerHTML = currentIngredients.map((i, idx) => `
        <li class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
            <span class="dark:text-gray-300">
                <strong>${i.quantity}${i.unit}</strong> &nbsp; ${i.name}
            </span>
            <button onclick="removeIngredient(${idx})" class="text-red-400"><i class="fas fa-times"></i></button>
        </li>
    `).join("");
}

function removeIngredient(idx) {
    currentIngredients.splice(idx, 1);
    updateIngredientList();
    resetSaveButton();
}

function resetSaveButton() {
    const btn = document.getElementById("btn-save");
    btn.disabled = true;
    btn.className = "bg-gray-200 text-gray-400 py-3 rounded-xl font-bold cursor-not-allowed flex justify-center items-center gap-2 w-full dark:bg-gray-700 dark:text-gray-500";
    lastCalculatedTotals = null;
}

function showToast(msg, type) {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `px-4 py-3 rounded-lg shadow text-white animate-bounce-in ${type === "error" ? "bg-red-500" : "bg-green-600"}`;
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function animateValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = Math.round(val);
}