const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const MARKER = "<!-- why-choose-fsm:v1 -->";

function getWhyChooseBullets(category: string | null): string[] {
  const cat = (category || "").toLowerCase();
  const COMMON = [
    "**Acompañamiento humano 24/7**, todos los días del año, con respeto y empatía real.",
    "**Precios transparentes y estipulados** desde el inicio: lo que se firma es lo que se paga, sin sorpresas ni costos ocultos.",
    "**Servicio integral completo** — traslados, vehículos, urnas, ramos de flores y gestión de trámites incluidos.",
    "**Calidad sin concesiones** en cada detalle: urnas de fabricación cuidada, arreglos florales frescos y vehículos en óptimas condiciones.",
  ];
  if (cat.includes("duelo") || cat.includes("apoyo") || cat.includes("contención") || cat.includes("salud")) {
    return [
      "**Acompañamiento emocional 24/7**, antes, durante y después del servicio — usted no es un número, es una familia que cuidamos.",
      "**Apoyo post-servicio** con orientación en duelo y derivación profesional cuando es necesario.",
      "**Equipo formado en contención humana**, no solo en logística funeraria.",
      "**Respeto absoluto** por los tiempos, las creencias y la forma única de despedirse de cada familia.",
      "**Sin presión comercial**: nuestro foco es acompañar, no vender.",
    ];
  }
  if (cat.includes("previsión") || cat.includes("prevision")) {
    return [
      "**Precios congelados al firmar**: el valor del plan no cambia con la inflación ni con el paso de los años.",
      "**Cobertura integral garantizada**: traslados, urnas, flores, vehículos, ceremonia y gestión de trámites incluidos.",
      "**Transparencia total** en lo que cubre y lo que no — sin letra chica ni sorpresas para su familia.",
      "**Acompañamiento profesional 24/7** cuando llegue el momento, en cualquier día y a cualquier hora.",
      "**Respaldo de una funeraria con trayectoria**, no de un intermediario.",
    ];
  }
  if (cat.includes("servicio") || cat.includes("guía") || cat.includes("guias")) {
    return [
      "**Profesionalismo sin sorpresas**: precios estipulados desde el inicio, sin costos ocultos ni cambios de último momento.",
      "**Servicio integral de comienzo a fin**: traslados, vehículos modernos, urnas de calidad, ramos de flores frescos, ceremonia y trámites legales incluidos.",
      "**Atención 24/7 los 365 días del año**, con respuesta inmediata en zonas urbanas.",
      "**Cada familia es un caso completo**, no un número de venta — incluye apoyo y orientación post-servicio.",
      "**Diferencia real frente a otras funerarias**: no aplicamos malas prácticas comerciales ni cargos ocultos por servicios prometidos.",
    ];
  }
  if (cat.includes("legado") || cat.includes("memorial") || cat.includes("novedad")) {
    return [
      "**Espacio digital permanente** para honrar la memoria, gratuito al contratar el servicio.",
      "**Privacidad y respeto** en cada detalle: usted decide qué se publica y quién puede dejar mensajes.",
      "**Acompañamiento humano 24/7** en todo el proceso funerario, no solo en lo digital.",
      "**Precios transparentes** en todos nuestros servicios complementarios.",
      "**Compromiso a largo plazo** con la familia, no una transacción puntual.",
    ];
  }
  return COMMON;
}

function buildWhyChooseMarkdown(category: string | null): string {
  const bullets = getWhyChooseBullets(category);
  return [
    MARKER,
    "",
    "### Por qué elegir Funeraria Santa Margarita",
    "",
    "En **Funeraria Santa Margarita** entendemos que detrás de cada servicio hay una historia, una familia y un dolor único. Por eso trabajamos con un compromiso que va más allá de lo logístico:",
    "",
    ...bullets.map((b) => `- ${b}`),
    "",
    "A diferencia de otras funerarias que tratan a las familias como un simple número de venta, en Funeraria Santa Margarita cada caso es **un acompañamiento integral de comienzo a fin** — y también después, cuando más se necesita.",
    "",
  ].join("\n");
}

function buildWhyChooseHtml(category: string | null): string {
  const bullets = getWhyChooseBullets(category)
    .map((b) => `  <li>${b.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</li>`)
    .join("\n");
  return `${MARKER}
<h3>Por qué elegir Funeraria Santa Margarita</h3>
<p>En <strong>Funeraria Santa Margarita</strong> entendemos que detrás de cada servicio hay una historia, una familia y un dolor único. Por eso trabajamos con un compromiso que va más allá de lo logístico:</p>
<ul>
${bullets}
</ul>
<p>A diferencia de otras funerarias que tratan a las familias como un simple número de venta, en Funeraria Santa Margarita cada caso es <strong>un acompañamiento integral de comienzo a fin</strong> — y también después, cuando más se necesita.</p>
`;
}

function cleanQuickAnswerEllipsis(content: string): string {
  let out = content;
  out = out.replace(
    /(<div\s+class=["']quick-answer["'][^>]*>[\s\S]*?<\/div>)/i,
    (block) => block.replace(/(\.{3}|…)\s*(<\/p>|<\/strong>|<\/em>)/g, "$2").replace(/(\.{3}|…)\s*\./g, ".")
  );
  out = out.replace(
    /(^|\n)(\*\*Respuesta corta\*\*:?[^\n]*?)(\.{3}|…)(\s*\.?)(\n|$)/gi,
    "$1$2.$5"
  );
  const head = out.slice(0, 1500);
  const tail = out.slice(1500);
  const cleanedHead = head.replace(/\s*…\s*<\/p>/g, "</p>").replace(/\s*\.{3}\s*<\/p>/g, "</p>");
  return cleanedHead + tail;
}

function injectWhyChooseMarkdown(content: string, category: string | null): string {
  if (content.includes(MARKER)) return content;
  const block = buildWhyChooseMarkdown(category);
  const lines = content.split("\n");
  const conclusionIdx = lines.findIndex((l) => /^##\s+conclusi[oó]n/i.test(l.trim()));
  const faqIdx = lines.findIndex((l) => /^##\s+(preguntas?\s+frecuentes|faq)\b/i.test(l.trim()));
  if (conclusionIdx !== -1) {
    const insertAt = faqIdx !== -1 ? faqIdx : lines.length;
    lines.splice(insertAt, 0, "", block);
    return lines.join("\n");
  }
  if (faqIdx !== -1) {
    lines.splice(faqIdx, 0, "", "## Conclusión", "", block);
    return lines.join("\n");
  }
  return content.trimEnd() + "\n\n## Conclusión\n\n" + block + "\n";
}

function injectWhyChooseHtml(content: string, category: string | null): string {
  if (content.includes(MARKER)) return content;
  const block = buildWhyChooseHtml(category);
  const faqSectionMatch = content.match(/<div\s+class=["'][^"']*faq[^"']*["'][^>]*>/i);
  if (faqSectionMatch && faqSectionMatch.index !== undefined) {
    return content.slice(0, faqSectionMatch.index) + block + "\n" + content.slice(faqSectionMatch.index);
  }
  const firstDetailsIdx = content.search(/<details\s+class=["']faq-item["']/i);
  if (firstDetailsIdx !== -1) {
    return content.slice(0, firstDetailsIdx) + block + "\n" + content.slice(firstDetailsIdx);
  }
  return content.trimEnd() + "\n\n" + block + "\n";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
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

    const { data: posts, error: fetchErr } = await supabase
      .from("blog_posts")
      .select("id, slug, content, category")
      .eq("published", true);
    if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);

    const results: any[] = [];
    let changed = 0, unchanged = 0, errors = 0;

    for (const post of posts || []) {
      try {
        const isHtml = post.content.trim().startsWith("<");
        let updated = cleanQuickAnswerEllipsis(post.content);
        updated = isHtml
          ? injectWhyChooseHtml(updated, post.category)
          : injectWhyChooseMarkdown(updated, post.category);

        if (updated === post.content) {
          unchanged++;
          results.push({ slug: post.slug, status: "unchanged" });
          continue;
        }
        const { error: updErr } = await supabase
          .from("blog_posts")
          .update({ content: updated, updated_at: new Date().toISOString() })
          .eq("id", post.id);
        if (updErr) {
          errors++;
          results.push({ slug: post.slug, status: "error", message: updErr.message });
        } else {
          changed++;
          results.push({ slug: post.slug, status: "updated", format: isHtml ? "html" : "md" });
        }
      } catch (e) {
        errors++;
        results.push({ slug: post.slug, status: "error", message: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, changed, unchanged, errors, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sanitize-blog-structure error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
