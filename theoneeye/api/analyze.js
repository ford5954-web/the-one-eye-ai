export default async function handler(req, res) {
    // 1. إعدادات الوصول (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST method' });

    // 2. التحقق من المفتاح والبيانات
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API_KEY_MISSING' });
    }

    const { prompt, imageData } = req.body;

    try {
        // 3. الاتصال بجوجل (باستخدام fetch المدمج في Node.js 18+)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [
                    { text: prompt + " . Return JSON only: {\"decision\":\"YES/NO\",\"pos_score\":50,\"neg_score\":50,\"summary\":\"...\",\"advice\":\"...\"}" },
                    ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                ]
            }]
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 4. إرسال النتيجة بأمان
        if (data.error) {
            return res.status(400).json({ error: 'AI_PROVIDER_ERROR', details: data.error.message });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Crash Detail:', error.message);
        return res.status(500).json({ 
            error: 'SERVER_CRASHED', 
            msg: error.message 
        });
    }
}
