import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

interface BlogFAQProps {
  items: FAQItem[];
  blogTitle?: string;
}

const BlogFAQ = ({ items, blogTitle }: BlogFAQProps) => {
  if (items.length === 0) return null;

  // FAQPage JSON-LD is already rendered in BlogPost.tsx, this is purely UI
  return (
    <div className="my-12 scroll-mt-24" id="preguntas-frecuentes">
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/30 bg-gradient-to-r from-card to-gold/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="font-playfair text-xl text-foreground">Preguntas Frecuentes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Resolvemos las dudas más comunes sobre este tema
              </p>
            </div>
          </div>
        </div>

        {/* Accordion */}
        <div className="px-6 py-2">
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, i) => (
              <AccordionItem
                key={`blog-faq-${i}`}
                value={`blog-faq-${i}`}
                className="border-border/20"
              >
                <AccordionTrigger className="text-left text-foreground hover:text-gold hover:no-underline py-4 text-sm md:text-base font-medium gap-3">
                  <span className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center text-[10px] font-semibold text-gold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4 pl-7">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
};

export default BlogFAQ;
