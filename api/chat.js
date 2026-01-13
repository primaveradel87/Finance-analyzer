export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      content: [{ text: '⚠️ Error de configuración: ANTHROPIC_API_KEY no encontrada en Vercel.' }]
    });
  }

  try {
    const { messages, context, type, system } = req.body;

    let systemPrompt = system || (type === 'categorize' 
      ? `Extrae transacciones bancarias en JSON puro. Categorías: Restaurantes, Supermercado, Inversiones, etc. ${context}`
      : `Eres un asesor financiero experto. Datos del usuario: ${context}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229', // Usando un modelo estable
        max_tokens: type === 'categorize' ? 2500 : 1000,
        system: systemPrompt,
        messages: messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error en Anthropic');

    return res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ content: [{ text: '❌ Error al procesar la solicitud con IA.' }] });
  }
}
