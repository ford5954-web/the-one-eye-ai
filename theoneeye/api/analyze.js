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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Analyze precisely. Return ONLY a JSON object. No Markdown. No backticks.
                        Format: {"decision":"YES/NO","pos_score":0,"neg_score":0,"uncertain_score":0,"summary":"..."}.
                        Task: Analyze faces for micro-expressions or decode any visible QR/Barcodes.
                        Context: ${prompt || 'Visual Scan'}` },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                generationConfig: { response_mime_type: "application/json", temperature: 0.1 }
            })
        });

        const data = await response.json();
        
        // استخراج النص وتأمين عملية التحويل
        let content = data.candidates[0].content.parts[0].text;
        // تنظيف أي علامات برمجية زائدة قد تسبب الخطأ
        const sanitizedContent = content.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(sanitizedContent, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ error: "AI Engine Sync Failed", details: e.message }), { status: 500, headers });
    }
}