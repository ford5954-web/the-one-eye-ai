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
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) throw new Error("Missing API Key");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Analyze the input. You MUST return ONLY a raw JSON object. No markdown, no comments.
                        Structure: {"decision":"YES/NO","pos_score":number,"neg_score":number,"uncertain_score":number,"summary":"text"}
                        Context: Facial expressions, codes, or: ${prompt || 'General Scan'}` },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                generationConfig: { response_mime_type: "application/json", temperature: 0.1 }
            })
        });

        const data = await response.json();
        
        // استخراج النص وتطهيره من أي شوائب برمجية
        let rawContent = data.candidates[0].content.parts[0].text;
        const cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(cleanJson, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (e) {
        console.error("Server Error:", e.message);
        return new Response(JSON.stringify({ error: "Sync Failed", details: e.message }), { status: 500, headers });
    }
}