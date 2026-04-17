// Dynamic sitemap.xml generator
// Includes static pages + published blog posts, memorials, obituaries
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SITE_URL = "https://funerariasantamargarita.cl";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Static routes with their priority and change frequency
const STATIC_ROUTES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/planes", priority: "0.9", changefreq: "monthly" },
  { path: "/contacto", priority: "0.8", changefreq: "monthly" },
  { path: "/blog", priority: "0.8", changefreq: "weekly" },
  { path: "/obituarios", priority: "0.8", changefreq: "daily" },
  { path: "/legados-eternos", priority: "0.8", changefreq: "daily" },
  { path: "/preguntas-frecuentes", priority: "0.7", changefreq: "monthly" },
  { path: "/seguimiento", priority: "0.5", changefreq: "monthly" },
  { path: "/pagos", priority: "0.5", changefreq: "monthly" },
  { path: "/cobertura-region-metropolitana", priority: "0.9", changefreq: "monthly" },
];

// 52 comunas de la Región Metropolitana — landing pages hiperlocales SEO/GEO/LLMO
const COMUNAS_RM_SLUGS = [
  "santiago", "providencia", "las-condes", "vitacura", "lo-barnechea", "nunoa", "la-reina",
  "macul", "penalolen", "la-florida", "san-joaquin", "san-miguel", "la-cisterna", "el-bosque",
  "la-pintana", "san-ramon", "la-granja", "pedro-aguirre-cerda", "lo-espejo", "cerrillos",
  "estacion-central", "quinta-normal", "lo-prado", "cerro-navia", "pudahuel", "renca",
  "quilicura", "huechuraba", "conchali", "independencia", "recoleta", "puente-alto", "pirque",
  "san-jose-de-maipo", "maipu", "san-bernardo", "buin", "paine", "calera-de-tango", "colina",
  "lampa", "tiltil", "talagante", "el-monte", "isla-de-maipo", "padre-hurtado", "penaflor",
  "melipilla", "curacavi", "maria-pinto", "san-pedro", "alhue",
];

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;",
  }[c] as string));

const formatLastmod = (d: string | null | undefined): string => {
  if (!d) return new Date().toISOString().split("T")[0];
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch published content in parallel
    const [blogRes, memorialsRes, obituariesRes] = await Promise.all([
      supabase
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .eq("published", true),
      supabase
        .from("memorials")
        .select("slug, updated_at, published_at")
        .eq("published", true),
      supabase
        .from("obituaries")
        .select("slug, updated_at, published_at")
        .eq("published", true),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const urls: string[] = [];

    // Static routes
    for (const route of STATIC_ROUTES) {
      urls.push(`  <url>
    <loc>${SITE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`);
    }

    // Hyperlocal landing pages — 52 comunas de la Región Metropolitana
    for (const slug of COMUNAS_RM_SLUGS) {
      urls.push(`  <url>
    <loc>${SITE_URL}/funeraria/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // Blog posts
    for (const post of blogRes.data ?? []) {
      const lastmod = formatLastmod(post.updated_at ?? post.published_at);
      urls.push(`  <url>
    <loc>${SITE_URL}/blog/${escapeXml(post.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    // Memorials (legados eternos)
    for (const mem of memorialsRes.data ?? []) {
      const lastmod = formatLastmod(mem.updated_at ?? mem.published_at);
      urls.push(`  <url>
    <loc>${SITE_URL}/legados-eternos/${escapeXml(mem.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    // Obituaries
    for (const obit of obituariesRes.data ?? []) {
      const lastmod = formatLastmod(obit.updated_at ?? obit.published_at);
      urls.push(`  <url>
    <loc>${SITE_URL}/obituarios/${escapeXml(obit.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
      status: 200,
    });
  } catch (err) {
    console.error("Sitemap generation error:", err);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>${(err as Error).message}</error>`,
      {
        headers: { ...corsHeaders, "Content-Type": "application/xml" },
        status: 500,
      },
    );
  }
});
