export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const apiKey = process.env.GEMINI_API_KEY;
    const { prompt, imageData } = req.body;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt + " . Return only a raw JSON object, no markdown, no backticks." },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }]
            })
        });

        const data = await response.json();
        // تصحيح: إرسال البيانات حتى لو كانت تحتوي على نصوص إضافية ليقوم index.html بمعالجتها
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Connection Refused" });
    }
}
