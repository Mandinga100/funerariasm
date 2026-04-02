import { BLOG_CATEGORIES } from "@/lib/blog-categories";

interface Props {
  active: string | null;
  onChange: (key: string | null) => void;
}

const CategoryIcon = ({ path, active }: { path: string; active: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={`w-4 h-4 shrink-0 transition-brand ${
      active ? "text-accent-foreground" : "text-gold"
    }`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 shrink-0 transition-brand ${active === null ? "text-accent-foreground" : "text-gold"}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
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
          <CategoryIcon path={cat.icon} active={active === cat.key} />
          {cat.label}
        </button>
      ))}
    </div>
  );
};

export default BlogCategoryFilter;
