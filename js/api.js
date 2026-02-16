export async function fetchNutrition(ingredientsList) {
    const ingredientsText = ingredientsList.map(x => `- ${x.quantity} ${x.unit} de ${x.name}`).join("\n");

    const response = await fetch("https://nutri-diario.vercel.app/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: ingredientsText })
    });

    if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Erro na API");
    }

    return response.json();
}