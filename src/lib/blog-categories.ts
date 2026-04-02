export interface BlogCategory {
  key: string;
  label: string;
  image: string;
}

export const BLOG_CATEGORIES: BlogCategory[] = [
  { key: "novedades", label: "Novedades", image: "/assets/images/brand/logo.webp" },
  { key: "duelo", label: "Duelo", image: "/assets/images/otros/consuelo.webp" },
  { key: "contencion-emocional", label: "Contención Emocional", image: "/assets/images/otros/empatia.webp" },
  { key: "salud-mental", label: "Salud Mental", image: "/assets/images/otros/compasion.webp" },
  { key: "apoyo-familiar", label: "Apoyo Familiar", image: "/assets/images/otros/respeto.webp" },
  { key: "guias", label: "Guías", image: "/assets/images/brand/logo.webp" },
  { key: "prevision", label: "Previsión", image: "/assets/images/otros/calidad.webp" },
  { key: "servicios", label: "Servicios", image: "/assets/images/servicios/funerales-gala.webp" },
];

export const getCategoryImage = (category: string | null): string => {
  if (!category) return "/assets/images/brand/logo.webp";
  const normalized = category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const found = BLOG_CATEGORIES.find(
    (c) => c.key === normalized || c.label.toLowerCase() === category.toLowerCase()
  );
  return found?.image || "/assets/images/brand/logo.webp";
};
