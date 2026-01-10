export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const body = await req.json();
    const { prompt, imageData } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key missing in Vercel settings" }), { status: 500, headers });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `Analyze this. Return ONLY valid JSON.
    Format: {"decision":"YES/NO","pos_score":0,"neg_score":0,"uncertain_score":0,"summary":"..."}
    Note: Sum of scores must be 100.
    Context: ${prompt || 'Visual Analysis'}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.1
        }
      })
    });

    const data = await response.json();

    // التأكد من استخراج النص بشكل صحيح حتى لو تغير هيكل الرد
    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
        throw new Error("Invalid response from AI Engine");
    }

    let rawText = data.candidates[0].content.parts[0].text;
    
    // تنظيف النص من أي علامات Markdown قد يضيفها الذكاء الاصطناعي بالخطأ
    const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    return new Response(cleanJson, {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Vercel Edge Error:", error.message);
    return new Response(
      JSON.stringify({ error: "Server logic failed", details: error.message }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}