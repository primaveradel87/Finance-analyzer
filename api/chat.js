// /api/chat.js - Función serverless para Vercel
// Actúa como proxy seguro entre tu app y la API de Anthropic

export default async function handler(req, res) {
  // ===== CORS Headers =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ===== Verificar API Key =====
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY no configurada');
    return res.status(200).json({
      content: [{ 
        text: '⚠️ El asistente no está configurado.\n\nPara activarlo:\n1. Ve a Vercel → Settings → Environment Variables\n2. Agrega: ANTHROPIC_API_KEY = tu-api-key\n3. Redespliega el proyecto\n\nObtén tu key en: console.anthropic.com' 
      }]
    });
  }

  try {
    const { messages, context, type, system, model, max_tokens } = req.body;

    // System prompt según el tipo
    let systemPrompt = system || '';
    
    if (type === 'categorize' && !system) {
      systemPrompt = `Extrae y categoriza transacciones bancarias. Responde SOLO JSON válido sin markdown.
Categorías: Restaurantes, Delivery, Transporte, Supermercado, Conveniencia, Entretenimiento, Salud, Inversiones, Compras, Servicios, Viajes, Suscripciones, Transferencias, Educación, Cafés, Otros.
${context || ''}`;
    } else if (type === 'chat' && !system) {
      systemPrompt = `Eres un asesor financiero personal experto y amigable.
- Responde SIEMPRE en español
- Sé conciso (máximo 200 palabras)
- Da consejos específicos con números
- Usa emojis ocasionalmente

DATOS DEL USUARIO:
${context || 'No hay datos disponibles'}`;
    }

    // ===== Llamar a Anthropic =====
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: max_tokens || (type === 'categorize' ? 4000 : 1000),
        system: systemPrompt,
        messages: messages || [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic error:', data);
      let errorMsg = 'Hubo un error. Intenta de nuevo.';
      if (response.status === 401) errorMsg = '🔑 API key inválida.';
      if (response.status === 429) errorMsg = '⏳ Muchas solicitudes. Espera un momento.';
      return res.status(200).json({ content: [{ text: errorMsg }], error: true });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({
      content: [{ text: '❌ Error de conexión. Verifica tu internet.' }],
      error: true
    });
  }
}
