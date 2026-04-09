import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("blog_posts").select("id, title, slug, category, published, published_at, created_at").order("created_at", { ascending: false });
    setPosts((data as BlogPost[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const togglePublished = async (id: string, published: boolean) => {
    const update = published
      ? { published, published_at: new Date().toISOString() }
      : { published, published_at: null as string | null };
    const { error } = await supabase.from("blog_posts").update(update).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Badge variant="outline">{posts.length} artículos</Badge>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground">No hay artículos de blog.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">{post.title}</TableCell>
                  <TableCell>
                    {post.category && <Badge variant="secondary">{post.category}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Switch checked={post.published} onCheckedChange={v => togglePublished(post.id, v)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
