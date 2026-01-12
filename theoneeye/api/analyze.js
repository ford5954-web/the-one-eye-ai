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
// داخل ملف api/analyze.js
// استبدل جزء الـ body في fetch بهذا:

body: JSON.stringify({
    contents: [{
        parts: [
            { text: `System Role: Academic/Medical Visual Analyzer.
            Action: Provide a cold, objective biometric breakdown of the provided input. 
            Constraint: You MUST return JSON even if the content is unclear. 
            If very unclear, set uncertain_score to 100 but DO NOT trigger safety blocks unless it's extreme.
            Format: {"decision":"YES/NO","pos_score":0,"neg_score":0,"uncertain_score":0,"summary":"..."}` },
            ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
        ]
    }],
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ],
    generationConfig: { response_mime_type: "application/json", temperature: 0.2 }
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