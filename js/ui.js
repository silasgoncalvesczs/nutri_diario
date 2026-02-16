/* ============================================================
   js/ui.js - Gerenciamento de Interface e Elementos Visuais
   ============================================================ */

let historyChart = null; // Variável interna para controle do gráfico

/**
 * Injeta o conteúdo HTML de um componente na div principal
 */
export async function loadComponent(name) {
    try {
        const response = await fetch(`./components/${name}.html`);
        if (!response.ok) throw new Error(`Erro ao carregar componente: ${name}`);
        const html = await response.text();
        document.getElementById('app-view').innerHTML = html;
        console.log(`✅ Componente ${name} injetado.`);
    } catch (err) {
        console.error("🔴 Falha na injeção:", err);
    }
}

/**
 * Exibe notificações (Toasts) na tela
 */
export function showToast(msg, type) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = `px-4 py-3 rounded-lg shadow text-white animate-bounce-in ${type === "error" ? "bg-red-500" : "bg-green-600"}`;
    el.innerText = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

/**
 * Atualiza o gráfico de histórico (destruindo o anterior se existir)
 */
export function updateHistoryChart(dataLabels, dataValues) {
    const canvas = document.getElementById('historyChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    // A MÁGICA: Destrói o gráfico anterior para não acumular lixo na memória
    if (historyChart) {
        historyChart.destroy();
    }

    historyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dataLabels,
            datasets: [{
                label: 'Kcal',
                data: dataValues,
                backgroundColor: '#8b5cf6',
                borderRadius: 4,
                barThickness: 20,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor, borderDash: [5, 5] },
                    ticks: { color: textColor, font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor, font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

/**
 * Animação simples para valores numéricos
 */
export function animateValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = Math.round(val);
}