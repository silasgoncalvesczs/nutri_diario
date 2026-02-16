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
        // A MÁGICA 1: O .trim() limpa qualquer espaço ou quebra de linha invisível da sua chave
        const apiKey = (process.env.GEMINI_API_KEY || "").trim();

        if (!apiKey) {
            return res.status(500).json({ error: { message: "Chave da API do Gemini não configurada." } });
        }

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

        // A MÁGICA 2: Trocamos o 'v1beta' pelo 'v1' (versão oficial, estável e global)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
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

        const textResponse = data.candidates[0].content.parts[0].text;

        // Formata igual a OpenAI para o seu frontend não quebrar
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