const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
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
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Require admin/ceo JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", claims.claims.sub);
    if (!roles?.some((r: any) => r.role === "admin" || r.role === "ceo")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { topic, category } = await req.json();
    if (!topic) {
      return new Response(JSON.stringify({ error: "topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un redactor experto en la industria funeraria chilena. Escribes artículos informativos, empáticos y profesionales para el blog de Funeraria Santa Margarita. El tono debe ser solemne pero cálido, nunca frío ni genérico. Usa español chileno formal.

ESTRUCTURA OBLIGATORIA del campo "content" (markdown):

1. **# Título principal** (H1) — exactamente el título del artículo.
2. **Párrafo introductorio** empático, mencionando "**Funeraria Santa Margarita**" en negrita.
3. **## Secciones principales** (mínimo 4-6 H2) con desarrollo sustancial.
4. **### Subsecciones** (H3) cuando aporten claridad.
5. **Listas** con bullets (- ) o numeradas para escaneabilidad.
6. **Negritas** en conceptos clave.
7. **## Conclusión** — párrafo empático de cierre.
8. **### Por qué elegir Funeraria Santa Margarita** (DENTRO de la Conclusión, OBLIGATORIO) — 4-5 bullets contextuales según el tema (precios transparentes, servicio integral, acompañamiento 24/7, calidad, sin malas prácticas comerciales). Ejemplo de cierre: "A diferencia de otras funerarias que tratan a las familias como un simple número de venta, en Funeraria Santa Margarita cada caso es un acompañamiento integral de comienzo a fin."
9. **## Preguntas Frecuentes** — exactamente 4 preguntas en formato:
   ### ¿Pregunta?
   Respuesta concisa de 2-3 oraciones.

REGLAS DE QUICK ANSWER:
- El primer párrafo después del primer H2 será extraído como "Respuesta corta" automáticamente.
- Debe ser **completo, conciso y robusto** — máximo 320 caracteres.
- NUNCA termines con "..." ni "…" ni dejes la idea inconclusa.
- Cierra siempre con punto final.

Responde SIEMPRE con un JSON válido con esta estructura exacta:
{
  "title": "Título del artículo (60 chars max, con keyword principal)",
  "slug": "url-amigable-del-titulo",
  "excerpt": "Resumen de 150-160 caracteres para meta description",
  "content": "Contenido completo en Markdown según estructura obligatoria. Mínimo 1000 palabras.",
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
