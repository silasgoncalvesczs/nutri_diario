// js/api.js
export async function calculateNutritionFromAPI(ingredientsList) {
    // Transforma a lista de ingredientes em um texto para o prompt
    const ingredientsText = ingredientsList.map(x => `- ${x.quantity} ${x.unit} de ${x.name}`).join("\n");

    const response = await fetch("https://nutri-diario.vercel.app/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: ingredientsText })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error?.message || "Erro desconhecido no servidor");
    }
    if (!data.choices || data.choices.length === 0) {
        throw new Error("A Inteligência Artificial não retornou os dados.");
    }

    // Limpa a resposta para garantir que o JSON será lido corretamente
    let text = data.choices[0].message.content.replace(/```json|```/g, "").trim();
    const jsonStr = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);

    return JSON.parse(jsonStr);
}

// Busca a dica do Nutricionista IA
export async function getAITipFromAPI(macros, goals) {
    // Monta a mensagem que será enviada para a IA
    const prompt = `Consumi hoje: ${macros.calories}kcal, ${macros.protein}g prot, ${macros.carbs}g carb, ${macros.fats}g gordura. 
    Minha meta é: ${goals.calories}kcal, ${goals.protein}g prot, ${goals.carbs}g carb, ${goals.fats}g gordura.`;

    const response = await fetch("https://nutri-diario.vercel.app/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error?.message || "Erro na IA");

    return data.choices[0].message.content;
}