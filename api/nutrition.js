export default async function handler(req, res) {
    // 1. Configuração de CORS (Permite que seu GitHub Pages acesse este backend)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // Em produção, troque '*' pela URL do seu GitHub Pages
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Trata requisição OPTIONS (preflight do navegador)
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
        // 2. Prompt do Sistema: Ensina a IA como formatar a resposta
        const systemPrompt = `
            Você é um nutricionista experiente.
            Analise os ingredientes fornecidos e retorne APENAS um array JSON.
            Não use markdown, não use explicações. Apenas o JSON cru.
            Formato exigido para cada item:
            [
                {
                    "name": "Nome do alimento",
                    "calories": 0 (número),
                    "protein": 0 (número em gramas),
                    "carbs": 0 (número em gramas),
                    "fats": 0 (número em gramas),
                    "fiber": 0 (número em gramas)
                }
            ]
            Se não souber a quantidade exata, estime com base em porções médias.
        `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1 // Baixa temperatura para dados mais consistentes
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(500).json({ error: data });
        }

        // Retorna o conteúdo da mensagem da IA
        return res.status(200).json(data);

    } catch (err) {
        console.error("ERRO BACKEND:", err);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
}