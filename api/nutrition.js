export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt ausente." });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
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
