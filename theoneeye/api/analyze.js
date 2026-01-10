export const config = {
  runtime: 'edge', // هذا السطر يجعل الكود يعمل في أقرب سيرفر للمستخدم (Edge)
};

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: { 
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type'
        }});
    }

    try {
        const { prompt, imageData } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt + " . Return JSON only." },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }]
            })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}