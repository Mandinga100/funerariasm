import { useEffect, useState } from "react";
import OptimizedImage from "@/components/ui/optimized-image";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryImage } from "@/lib/blog-categories";
import { ArrowRight, Calendar } from "lucide-react";

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  category: string | null;
  published_at: string | null;
}

interface RelatedPostsProps {
  currentId: string;
  category: string | null;
  tags: string[];
}

const RelatedPosts = ({ currentId, category, tags }: RelatedPostsProps) => {
  const [posts, setPosts] = useState<RelatedPost[]>([]);

  useEffect(() => {
    const load = async () => {
      // Fetch by same category, exclude current
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image, category, published_at")
        .eq("published", true)
        .neq("id", currentId)
        .order("published_at", { ascending: false })
        .limit(20);

      if (!data) return;

      // Score by category match + tag overlap
      const scored = (data as RelatedPost[]).map((p) => {
        let score = 0;
        if (category && p.category === category) score += 3;
        return { ...p, score };
      });
      scored.sort((a, b) => b.score - a.score);
      setPosts(scored.slice(0, 3));
    };
    load();
  }, [currentId, category, tags]);

  if (posts.length === 0) return null;

  return (
    <div className="mt-16 pt-8 border-t border-border/50">
      <h2 className="font-playfair text-xl text-foreground mb-6">Artículos relacionados</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => {
          const image = post.cover_image || getCategoryImage(post.category);
          return (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="group bg-card rounded-lg overflow-hidden border border-border/50 hover:border-gold/30 transition-all duration-300"
            >
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <OptimizedImage src={image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4">
                {post.published_at && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    {new Date(post.published_at).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                  </span>
                )}
                <h3 className="font-playfair text-sm text-foreground leading-snug group-hover:text-gold transition-colors line-clamp-2">
                  {post.title}
                </h3>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RelatedPosts;
