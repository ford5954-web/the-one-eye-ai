export const config = { runtime: 'edge' };

export default async function handler(req) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers });

    try {
        const { prompt, imageData, lang } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        const systemRole = `You are a Global Health & Product Safety AI. 
        Task: Scan product labels/ingredients.
        1. Search reliable sources (FDA, WHO, EFSA).
        2. Categorize: "Natural/Healthy" (Green), "Harmful/Carcinogenic" (Red), "Uncertain" (Orange).
        3. Output Language: ${lang || 'English'}.
        4. Return STRICT JSON ONLY:
        {"decision":"👍" or "👎" or "🤔", "pos_score":0, "neg_score":0, "uncertain_score":0, "summary":"..."}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemRole + "\nInput: " + (prompt || "Analyze this product") },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                generationConfig: { response_mime_type: "application/json", temperature: 0.2 }
            })
        });

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        return new Response(rawText, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Search Error" }), { status: 500, headers });
    }
}