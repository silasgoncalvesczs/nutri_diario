/* ============================================================
   Nutridiário - script.js (compatível com GitHub Pages)
   Frontend → GitHub Pages
   Backend → https://nutridiario.vercel.app/api/nutrition
   ============================================================ */

// Estado da aplicação
let currentIngredients = [];
let lastCalculatedTotals = null;

/* ============================================================
   FUNÇÃO DE NAVEGAÇÃO (AGORA COMPATÍVEL COM O HTML)
   ============================================================ */
function navigateTo(target) {
    document.querySelectorAll(".page-section").forEach(pg => pg.classList.remove("active"));
    document.getElementById(`${target}-screen`).classList.add("active");

    // Atualiza botões do rodapé
    document.querySelectorAll(".bottom-nav-item").forEach(b => b.classList.remove("active"));
    const btn = document.querySelector(`[data-target="${target}-screen"]`);
    if (btn) btn.classList.add("active");
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type = "info") {
    const container = document.getElementById("toast-container");

    const el = document.createElement("div");
    el.className = `px-4 py-3 rounded-lg shadow text-white ${
        type === "error" ? "bg-red-500" :
        type === "success" ? "bg-green-600" :
        "bg-gray-800"
    }`;

    el.textContent = msg;
    container.appendChild(el);

    setTimeout(() => el.remove(), 3000);
}

/* ============================================================
   ADICIONAR INGREDIENTE
   ============================================================ */
function addIngredient() {
    const name = document.getElementById("ing-name").value.trim();
    const quantity = document.getElementById("ing-qtd").value.trim();
    const unit = document.getElementById("ing-unit").value.trim();

    if (!name || !quantity || !unit) {
        showToast("Preencha todos os campos!", "error");
        return;
    }

    currentIngredients.push({ name, quantity, unit });

    document.getElementById("ing-list").innerHTML = currentIngredients
        .map(i => `<li class="py-1">• ${i.quantity} ${i.unit} de ${i.name}</li>`)
        .join("");

    document.getElementById("current-recipe-card").classList.remove("hidden");
    document.getElementById("ing-count").innerText = currentIngredients.length;

    document.getElementById("ing-name").value = "";
    document.getElementById("ing-qtd").value = "100";

    showToast("Ingrediente adicionado!", "success");
}

/* ============================================================
   CALCULAR NUTRIÇÃO (API VERCEL)
   ============================================================ */
async function calculateNutrition() {
    if (currentIngredients.length === 0) {
        showToast("Adicione ingredientes antes de calcular.", "error");
        return;
    }

    const btn = document.getElementById("btn-calc");
    const original = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Calculando...';
    btn.disabled = true;

    try {
        const ingredientsText = currentIngredients
            .map(x => `- ${x.name}: ${x.quantity} ${x.unit}`)
            .join("\n");

        const response = await fetch("https://nutridiario.vercel.app/api/nutrition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: ingredientsText })
        });

        if (!response.ok) {
            throw new Error("Erro ao conectar ao servidor");
        }

        const data = await response.json();
        let text = data.choices[0].message.content;

        // Remove marcação de código
        text = text.replace(/```json|```/g, "");
        const jsonStr = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
        const results = JSON.parse(jsonStr);

        let totals = { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };

        results.forEach(r => {
            totals.calories += r.calories || 0;
            totals.protein += r.protein || 0;
            totals.carbs += r.carbs || 0;
            totals.fats += r.fats || 0;
            totals.fiber += r.fiber || 0;
        });

        lastCalculatedTotals = totals;

        document.getElementById("res-cals").innerHTML = Math.round(totals.calories);
        document.getElementById("res-prot").innerHTML = totals.protein.toFixed(1);
        document.getElementById("res-carbs").innerHTML = totals.carbs.toFixed(1);
        document.getElementById("res-fats").innerHTML = totals.fats.toFixed(1);
        document.getElementById("res-fibers").innerHTML = totals.fiber.toFixed(1);

        document.getElementById("calc-results").classList.remove("hidden");
        document.getElementById("btn-save").disabled = false;

        showToast("Cálculo concluído!", "success");

    } catch (err) {
        console.error(err);
        showToast("Erro no cálculo: " + err.message, "error");
    }

    btn.innerHTML = original;
    btn.disabled = false;
}

/* ============================================================
   SALVAR
   ============================================================ */
function saveMeal() {
    if (!lastCalculatedTotals) {
        showToast("Calcule antes de salvar!", "error");
        return;
    }

    const meals = JSON.parse(localStorage.getItem("meals") || "[]");

    meals.push({
        date: new Date().toLocaleString("pt-BR"),
        ingredients: currentIngredients,
        totals: lastCalculatedTotals
    });

    localStorage.setItem("meals", JSON.stringify(meals));

    showToast("Refeição salva!", "success");
}

/* ============================================================
   HISTÓRICO
   ============================================================ */
function loadHistory() {
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");

    document.getElementById("history-list").innerHTML = meals
        .map(m => `
            <div class="p-4 bg-gray-100 rounded-xl">
                <strong>${m.date}</strong>
                <p class="text-sm">
                    Calorias: ${m.totals.calories}<br>
                    Proteína: ${m.totals.protein}<br>
                    Carbo: ${m.totals.carbs}<br>
                    Gorduras: ${m.totals.fats}<br>
                    Fibras: ${m.totals.fiber}
                </p>
            </div>
        `)
        .join("");
}

/* ============================================================
   INICIAR NA TELA HOME
   ============================================================ */
navigateTo("home");
