import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import FuneralPlansSection from "@/components/FuneralPlansSection";
import { buildBreadcrumbJsonLd } from "@/lib/seo-schemas";

const breadcrumbJsonLd = buildBreadcrumbJsonLd([{ name: "Planes Funerarios", path: "/planes" }]);

const Planes = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, [location.hash]);

  return (
    <Layout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <FuneralPlansSection />
    </Layout>
  );
};

export default Planes;
