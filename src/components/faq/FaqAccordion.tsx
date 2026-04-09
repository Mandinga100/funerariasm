import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowRight } from "lucide-react";
import type { FaqItem } from "@/lib/faq-data";

interface FaqAccordionProps {
  items: FaqItem[];
  /** Prefix for unique accordion item values */
  prefix?: string;
}

const FaqAccordion = ({ items, prefix = "faq" }: FaqAccordionProps) => (
  <Accordion type="single" collapsible className="w-full">
    {items.map((item, i) => (
      <AccordionItem key={`${prefix}-${i}`} value={`${prefix}-${i}`} className="border-border/30">
        <AccordionTrigger className="text-left text-foreground hover:text-gold hover:no-underline py-5 text-sm md:text-base font-medium">
          {item.question}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-5">
          <p>{item.answer}</p>
          {item.expandedAnswer && (
            <p className="mt-3 text-muted-foreground/80">{item.expandedAnswer}</p>
          )}
          {item.relatedLink && (
            <Link
              to={item.relatedLink.href}
              className="inline-flex items-center gap-1 text-gold text-xs tracking-wide uppercase mt-4 hover:text-gold-light transition-colors"
            >
              {item.relatedLink.label} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default FaqAccordion;
