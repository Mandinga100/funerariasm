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

    const { post_id } = await req.json();
    if (!post_id) {
      return new Response(JSON.stringify({ error: "post_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the post
    const { data: post, error: fetchErr } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", post_id)
      .single();

    if (fetchErr || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Eres un redactor experto en la industria funeraria chilena que trabaja para Funeraria Santa Margarita. Tu tarea es REESTRUCTURAR y EXPANDIR un artículo de blog existente para que siga la estructura estándar profesional.

ESTRUCTURA OBLIGATORIA que debe tener CADA artículo:

1. **# Título del artículo** (H1) — el título completo como encabezado principal
2. **Párrafo introductorio** — 2-3 oraciones empáticas mencionando "**Funeraria Santa Margarita**" en negrita
3. **## Secciones principales** (H2) — Mínimo 4-6 secciones temáticas con contenido sustancial
4. **### Subsecciones** (H3) — Dentro de cada H2 cuando aporte
5. **Listas** — bullets (- ) y numeradas donde corresponda
6. **Negritas** — conceptos clave con **negritas**
7. **## Conclusión** — párrafo empático de cierre
8. **### Por qué elegir Funeraria Santa Margarita** (DENTRO de la Conclusión, OBLIGATORIO) — 4-5 bullets contextuales al tema del artículo. Selecciona del siguiente set según corresponda: precios transparentes y estipulados sin sorpresas, servicio integral (traslados, vehículos, urnas, flores, ceremonia, trámites), acompañamiento humano 24/7 los 365 días, calidad sin concesiones en cada detalle, cada familia es un caso completo (no un número de venta), apoyo post-servicio, diferencia frente a funerarias con malas prácticas comerciales. Cierra con: "A diferencia de otras funerarias que tratan a las familias como un simple número de venta, en Funeraria Santa Margarita cada caso es un acompañamiento integral de comienzo a fin."
9. **## Preguntas Frecuentes** — exactamente 4 preguntas en formato:
   ### ¿Pregunta?
   Respuesta concisa de 2-3 oraciones.

REGLAS DE QUICK ANSWER:
- El primer párrafo después del primer H2 será extraído como "Respuesta corta" automáticamente.
- Debe ser **completo, conciso y robusto** — máximo 320 caracteres.
- NUNCA uses "..." ni "…" ni dejes la idea inconclusa. Cierra con punto.

REGLAS DE TONO:
- Español chileno formal, empático, solemne pero cálido
- NUNCA frío, genérico ni robótico
- Mencionar "Funeraria Santa Margarita" naturalmente 2-3 veces en el contenido
- Incluir datos específicos de Chile (leyes, instituciones, costumbres)
- Mínimo 1200 palabras de contenido

REGLAS CRÍTICAS:
- NO cambies el tema ni la intención del artículo original
- MANTÉN toda la información factual del original
- EXPANDE con información adicional relevante y precisa
- NO inventes datos legales falsos
- Responde SOLO con el contenido markdown, sin JSON ni metadatos
- NO incluyas bloques de código ni delimitadores \`\`\``;

    const userPrompt = `Reestructura y expande el siguiente artículo de blog manteniendo su tema y datos originales. El título es "${post.title}" y la categoría es "${post.category}".

CONTENIDO ORIGINAL:
${post.content}

Devuelve SOLO el contenido markdown reestructurado y expandido siguiendo la estructura estándar.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("AI error:", status, t);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await response.json();
    let newContent = aiData.choices?.[0]?.message?.content;
    if (!newContent) throw new Error("No content from AI");

    // Clean up: remove code block wrappers if present
    newContent = newContent.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    // Validate structure
    const hasH1 = newContent.startsWith("# ");
    const hasConclusion = /## Conclusión/i.test(newContent);
    const hasFAQ = /## Preguntas? Frecuentes/i.test(newContent);

    if (!hasH1 || !hasConclusion || !hasFAQ) {
      console.warn(`Structure validation warning for ${post.slug}: H1=${hasH1}, Conclusion=${hasConclusion}, FAQ=${hasFAQ}`);
    }

    // Update the post
    const { error: updateErr } = await supabase
      .from("blog_posts")
      .update({
        content: newContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post_id);

    if (updateErr) throw new Error(`DB update error: ${updateErr.message}`);

    return new Response(JSON.stringify({
      success: true,
      slug: post.slug,
      old_length: post.content.length,
      new_length: newContent.length,
      has_h1: hasH1,
      has_conclusion: hasConclusion,
      has_faq: hasFAQ,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("standardize-blog-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
