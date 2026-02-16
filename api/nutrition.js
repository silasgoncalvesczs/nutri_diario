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
        // Pega a chave do Groq que configuramos na Vercel
        const apiKey = (process.env.GROQ_API_KEY || "").trim();

        if (!apiKey) {
            return res.status(500).json({ error: { message: "Chave da API do Groq não configurada no servidor (GROQ_API_KEY)." } });
        }

        const systemPrompt = `Você é um nutricionista técnico. Analise os ingredientes e retorne APENAS um array JSON cru.
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
Use números para os macros.`;

        // URL oficial da API do Groq (que simula a OpenAI)
        const url = `https://api.groq.com/openai/v1/chat/completions`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192", // Modelo gratuito e ultrarrápido do Groq
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Ingredientes:\n${prompt}` }
                ],
                temperature: 0.1 // Mantém a IA focada apenas em dados, sem inventar texto
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("ERRO GROQ:", data);
            return res.status(response.status).json({ error: { message: data.error?.message || "Erro na API do Groq" } });
        }

        // Como o Groq devolve no formato idêntico ao da OpenAI, 
        // basta repassar a resposta direto para o seu script.js!
        return res.status(200).json(data);

    } catch (err) {
        console.error("ERRO BACKEND:", err);
        return res.status(500).json({ error: { message: "Erro interno do servidor backend." } });
    }
}