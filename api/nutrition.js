export default async function handler(req, res) {
    // 1. Configuração de CORS (Permite que o app no GitHub Pages acesse este backend)
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
        // 2. Prompt do Sistema: Garante que a IA responda APENAS o JSON numérico
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

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini", // Modelo mais rápido e barato
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: data });
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error("ERRO BACKEND:", err);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}