export const config = { runtime: 'edge' };

export default async function handler(req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

    try {
        const body = await req.json();
        const { prompt, imageData } = body;

        // تنقية المدخلات أمنياً
        const sanitizedPrompt = prompt.substring(0, 500).replace(/[<>]/g, ''); 

        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Strict Rule: Return ONLY JSON. Decision must be YES/NO. Context: ${sanitizedPrompt}` },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (error) {
        return new Response(JSON.stringify({ error: "Secure Connection Failed" }), { status: 500, headers });
    }
}