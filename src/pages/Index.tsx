import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import PlansSection from "@/components/PlansSection";
import ServicesSection from "@/components/ServicesSection";
import PrevisionSection from "@/components/PrevisionSection";
import MemorialesSection from "@/components/MemorialesSection";
import AboutSection from "@/components/AboutSection";
import BlogSection from "@/components/BlogSection";
import ContactoSection from "@/components/ContactoSection";

const Index = () => (
  <Layout>
    <HeroSection />
    <PlansSection />
    <ServicesSection />
    <PrevisionSection />
    <MemorialesSection />
    <AboutSection />
    <BlogSection />
    <ContactoSection />
  </Layout>
);

export default Index;
