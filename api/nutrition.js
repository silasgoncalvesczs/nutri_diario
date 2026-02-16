export default async function handler(req, res) {
    // 1. Configuração de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt ausente." });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: { message: "Chave da API do Gemini não configurada." } });
        }

        // 2. Juntamos tudo num texto só, sem usar o "systemInstruction" que estava causando o bug
        const promptText = `
Você é um nutricionista técnico. Analise os ingredientes abaixo e retorne APENAS um array JSON cru.
NÃO use markdown (sem \`\`\`json). NÃO explique nada.
Formato obrigatório exato:
[
    {
        "name": "Nome alimento",
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fats": 0,
        "fiber": 0
    }
]
Use números (inteiros ou decimais) para os macros.

Ingredientes para analisar:
${prompt}
        `;

        // URL padrão, simples e direta
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // Corpo da requisição super simples
                contents: [{
                    parts: [{ text: promptText }]
                }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("ERRO GEMINI:", data);
            return res.status(500).json({ error: { message: data.error?.message || "Erro na API do Gemini" } });
        }

        // 3. Extrai a resposta
        const textResponse = data.candidates[0].content.parts[0].text;

        // 4. Formata igual a OpenAI para o frontend do NutriDiário não perceber a diferença
        const formatForFrontend = {
            choices: [
                {
                    message: {
                        content: textResponse
                    }
                }
            ]
        };

        return res.status(200).json(formatForFrontend);

    } catch (err) {
        console.error("ERRO BACKEND:", err);
        return res.status(500).json({ error: { message: "Erro interno do servidor backend." } });
    }
}