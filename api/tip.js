export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

    const { prompt } = req.body;
    const apiKey = (process.env.GROQ_API_KEY || "").trim();

    try {
        const systemPrompt = `Você é um nutricionista amigável de um aplicativo. O usuário vai te mandar o que consumiu hoje e as metas dele.
        Sua tarefa: Dar UMA ÚNICA DICA super curta e direta (máximo 2 frases) de qual tipo de alimento focar ou evitar na próxima refeição. 
        Não use formatação grossa, seja encorajador e prático. NÃO responda em JSON, responda apenas o texto normal.`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                temperature: 0.5 // Um pouco mais de criatividade para a dica
            })
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        return res.status(500).json({ error: "Erro no servidor." });
    }
}