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

        if (!apiKey) throw new Error("API Key Missing");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: `Task: Professional biometric/visual analysis. 
                        Return ONLY a valid JSON object. No markdown, no backticks.
                        Format: {"decision":"YES/NO","pos_score":number,"neg_score":number,"uncertain_score":number,"summary":"text"}
                        Context: ${prompt || 'Visual Scan'}` },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
                generationConfig: { response_mime_type: "application/json", temperature: 0.1 }
            })
        });

        const data = await response.json();

        // صمام أمان لمنع انهيار السيرفر في حال عدم وجود رد
        if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return new Response(JSON.stringify({
                decision: "REJECTED",
                pos_score: 0,
                neg_score: 0,
                uncertain_score: 100,
                summary: "AI safety filter or quality issue blocked this scan. Please try a different angle."
            }), { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });
        }

        const rawText = data.candidates[0].content.parts[0].text;
        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

        return new Response(cleanJson, { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } });

    } catch (e) {
        return new Response(JSON.stringify({ error: "Edge Failure", details: e.message }), { status: 500, headers });
    }
}