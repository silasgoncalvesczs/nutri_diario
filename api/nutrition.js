export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const OPENAI_KEY = process.env.OPENAI_KEY;

    if (!OPENAI_KEY) {
        return res.status(500).json({ error: "OPENAI_KEY não configurada na Vercel." });
    }

    try {
        const { prompt } = req.body;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0
            })
        });

        const data = await response.json();
        return res.status(200).json(data);

    } catch (err) {
        console.error("Erro no backend:", err);
        return res.status(500).json({ error: "Erro interno." });
    }
}
