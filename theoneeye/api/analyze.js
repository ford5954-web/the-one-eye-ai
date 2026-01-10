export const config = { runtime: 'edge' };

export default async function handler(req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

    try {
        const { prompt, imageData } = await req.json();
        // تأمين المدخلات
        const safePrompt = prompt ? prompt.substring(0, 500) : "Visual Analysis";
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Analyze precisely. Return ONLY JSON format: {"decision":"YES/NO","pos_score":0,"neg_score":0,"summary":"...","advice":"..."}. Context: ${safePrompt}` },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: "Secure Connection Failed" }), { status: 500, headers });
    }
}