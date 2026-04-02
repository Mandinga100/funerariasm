import { corsHeaders } from "@supabase/supabase-js/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { topic, category } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un redactor experto en la industria funeraria chilena. Escribes artículos informativos, empáticos y profesionales para el blog de Funeraria Santa Margarita. El tono debe ser solemne pero cálido, nunca frío ni genérico. Usa español chileno formal.

Responde SIEMPRE con un JSON válido con esta estructura exacta:
{
  "title": "Título del artículo (60 chars max, con keyword principal)",
  "slug": "url-amigable-del-titulo",
  "excerpt": "Resumen de 150-160 caracteres para meta description",
  "content": "Contenido completo en Markdown con h2, h3, listas, negritas. Mínimo 800 palabras.",
  "meta_title": "Título SEO optimizado (max 60 chars)",
  "meta_description": "Meta descripción SEO (max 160 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "${category || 'general'}"
}`;

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
          { role: "user", content: `Escribe un artículo completo sobre: ${topic}` },
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
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
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

    let article;
    try {
      article = JSON.parse(raw);
    } catch {
      // Try extracting JSON from markdown code block
      const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        article = JSON.parse(match[1]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Insert into database
    const { data, error } = await supabase.from("blog_posts").insert({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      tags: article.tags || [],
      category: article.category || category || "general",
      published: true,
      published_at: new Date().toISOString(),
    }).select().single();

    if (error) {
      console.error("DB insert error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true, post: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-blog-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
