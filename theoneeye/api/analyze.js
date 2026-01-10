export const config = {
  runtime: 'edge', // تشغيل الكود على أقرب سيرفر للمستخدم لتقليل التأخير (Latency)
};

export default async function handler(req) {
    // إعدادات الرأس للتعامل مع طلبات المتصفح (CORS)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // التعامل مع طلبات التحقق المسبق (Preflight requests)
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers });
    }

    try {
        const { prompt, imageData } = await req.json();

        // تأمين وتطهير النص المدخل
        const sanitizedPrompt = prompt ? prompt.substring(0, 500).replace(/[<>]/g, '') : "General Analysis";

        // التعليمات الصارمة للذكاء الاصطناعي لضمان تحليل احترافي
        const systemInstruction = `
            Act as an elite AI multi-scanner. Your mission:
            1. Facial Analysis: If a face is detected, analyze micro-expressions, reliability, and emotional state.
            2. Code Decoding: If a Barcode or QR code is present, extract all embedded data.
            3. Logic Comparison: Compare positive, negative, and uncertain (doubtful) factors.
            
            Return ONLY a valid JSON object with these exact keys:
            {
                "decision": "YES/NO",
                "pos_score": number (0-100),
                "neg_score": number (0-100),
                "uncertain_score": number (0-100),
                "summary": "Short professional technical report",
                "advice": "Strategic recommendation"
            }
            Note: The sum of pos_score, neg_score, and uncertain_score MUST equal 100.
            Context: ${sanitizedPrompt}
        `;

        const apiKey = process.env.GEMINI_API_KEY;
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // إرسال الطلب إلى محرك Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemInstruction },
                        ...(imageData ? [{ inline_data: { mime_type: "image/jpeg", data: imageData } }] : [])
                    ]
                }],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.2 // درجة حرارة منخفضة لضمان دقة النتائج التقنية
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // استخراج الرد بصيغة JSON نظيفة
        const aiResponseText = data.candidates[0].content.parts[0].text;

        return new Response(aiResponseText, {
            status: 200,
            headers: { ...headers, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Server Error:", error);
        return new Response(
            JSON.stringify({ error: "Neural Link Failure", details: error.message }), 
            { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
        );
    }
}