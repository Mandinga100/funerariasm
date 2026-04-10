const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { type, context } = await req.json();

    if (!type || !context) {
      return new Response(JSON.stringify({ error: "type and context are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "blog") {
      const { topic, category } = context;
      systemPrompt = `Eres un redactor experto en la industria funeraria chilena. Escribes artículos informativos, empáticos y profesionales para el blog de Funeraria Santa Margarita. El tono debe ser solemne pero cálido, nunca frío ni genérico. Usa español chileno formal.

Responde SIEMPRE con un JSON válido con esta estructura exacta:
{
  "title": "Título del artículo (60 chars max)",
  "slug": "url-amigable-del-titulo",
  "excerpt": "Resumen de 150-160 caracteres para meta description",
  "content": "Contenido completo en Markdown con h2, h3, listas, negritas. Mínimo 800 palabras.",
  "meta_title": "Título SEO optimizado (max 60 chars)",
  "meta_description": "Meta descripción SEO (max 160 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${category || 'general'}"
}`;
      userPrompt = `Escribe un artículo completo sobre: ${topic}`;

    } else if (type === "obituary_biography") {
      const { full_name, birth_date, death_date, city, family_names } = context;
      systemPrompt = `Eres un redactor profesional de obituarios para Funeraria Santa Margarita en Chile. Escribes con un tono solemne, respetuoso, cálido y empático. Nunca frío ni genérico. Usa español chileno formal.

Responde SIEMPRE con un JSON válido con esta estructura:
{
  "biography": "Biografía respetuosa de 150-300 palabras en párrafos.",
  "family_message": "Mensaje de condolencia de la familia (2-3 oraciones)",
  "meta_title": "Título SEO (max 60 chars)",
  "meta_description": "Meta descripción SEO (max 160 chars)"
}`;
      userPrompt = `Genera una biografía respetuosa para:
Nombre: ${full_name}
${birth_date ? `Fecha de nacimiento: ${birth_date}` : ""}
Fecha de fallecimiento: ${death_date}
Ciudad: ${city || "Santiago"}
${family_names ? `Familia: ${family_names}` : ""}`;

    } else if (type === "memorial_tribute") {
      const { full_name, birth_date, death_date, city, biography } = context;
      systemPrompt = `Eres un escritor de tributos y legados para Funeraria Santa Margarita en Chile. Escribes textos conmemorativos hermosos, emotivos y respetuosos que honran la vida de las personas. Usa español chileno formal.

Responde SIEMPRE con un JSON válido con esta estructura:
{
  "tribute_text": "Texto tributo emotivo y respetuoso de 200-400 palabras.",
  "biography": "Biografía conmemorativa de 150-300 palabras (si no se proporcionó una).",
  "meta_title": "Título SEO (max 60 chars)",
  "meta_description": "Meta descripción SEO (max 160 chars)"
}`;
      userPrompt = `Genera un tributo conmemorativo para:
Nombre: ${full_name}
${birth_date ? `Fecha de nacimiento: ${birth_date}` : ""}
Fecha de fallecimiento: ${death_date}
Ciudad: ${city || "Santiago"}
${biography ? `Contexto adicional: ${biography}` : ""}`;

    } else {
      return new Response(JSON.stringify({ error: "Invalid type. Use: blog, obituary_biography, memorial_tribute" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intente más tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Agregue fondos en Configuración." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    const raw = aiData.choices?.[0]?.message?.content;
    if (!raw) throw new Error("No content from AI");

    let result;
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        result = JSON.parse(match[1]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
