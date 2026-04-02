import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/blog-categories";

interface Props {
  active: string | null;
  onChange: (key: string | null) => void;
}

const BlogCategoryFilter = ({ active, onChange }: Props) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-10">
      <button
        onClick={() => onChange(null)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs tracking-wide-brand uppercase border transition-brand font-medium ${
          active === null
            ? "bg-gold text-accent-foreground border-gold shadow-md"
            : "bg-card text-muted-foreground border-border/50 hover:border-gold/40 hover:text-foreground"
        }`}
      >
        Todos
      </button>
      {BLOG_CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key === active ? null : cat.key)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs tracking-wide-brand uppercase border transition-brand font-medium ${
            active === cat.key
              ? "bg-gold text-accent-foreground border-gold shadow-md"
              : "bg-card text-muted-foreground border-border/50 hover:border-gold/40 hover:text-foreground"
          }`}
        >
          <img
            src={cat.image}
            alt={cat.label}
            className="w-5 h-5 rounded-full object-cover"
            loading="lazy"
          />
          {cat.label}
        </button>
      ))}
    </div>
  );
};

export default BlogCategoryFilter;
