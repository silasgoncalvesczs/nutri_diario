export default async function handler(req, res) {
    // 1. Configuração de CORS (Permite que o app acesse este backend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responde rápido ao "preflight" do navegador
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
            return res.status(500).json({ error: { message: "Chave da API do Gemini não configurada no servidor." } });
        }

        // 2. Prompt do Sistema
        const systemPrompt = `
            Você é um nutricionista técnico. Analise os ingredientes e retorne APENAS um array JSON cru.
            NÃO use markdown (sem \`\`\`json). NÃO explique nada.
            Formato obrigatório:
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
            Use números (inteiros ou decimais) para os macros. Se for unidade vaga (ex: "1 maçã"), estime a média.
        `;

        // Usamos o modelo gemini-1.5-flash, que é extremamente rápido e excelente para JSON
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                },
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    responseMimeType: "application/json", // Força o Gemini a cuspir um JSON perfeito
                    temperature: 0.1
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("ERRO GEMINI:", data);
            return res.status(500).json({ error: { message: data.error?.message || "Erro na API do Gemini" } });
        }

        // 3. Extrai o texto da resposta do Gemini
        const textResponse = data.candidates[0].content.parts[0].text;

        // 4. TRUQUE DE MESTRE: Formatar a resposta igual à da OpenAI!
        // Assim o seu arquivo script.js (frontend) não precisa ser alterado de jeito nenhum.
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