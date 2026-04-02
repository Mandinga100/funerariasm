const WHATSAPP_NUMBER = "56964333760";

export type ContactIntent =
  | "fallecimiento"
  | "cotizacion"
  | "planificacion"
  | "cremacion"
  | "traslado"
  | "obituario"
  | "memorial"
  | "general";

interface WhatsAppMessageParams {
  intent: ContactIntent;
  name?: string;
  phone?: string;
  email?: string;
  comuna?: string;
  selectedPlan?: string;
  details?: string;
}

const INTENT_TEMPLATES: Record<ContactIntent, (p: WhatsAppMessageParams) => string> = {
  fallecimiento: (p) =>
    `URGENTE — Necesito asistencia inmediata por un fallecimiento reciente.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.comuna ? `\nUbicación: ${p.comuna}.` : ""}${
      p.phone ? `\nTeléfono de contacto: ${p.phone}` : ""
    }\nNecesito orientación sobre los pasos a seguir.`,

  cotizacion: (p) =>
    `Hola, me gustaría cotizar un servicio funerario.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.selectedPlan ? `\nMe interesa el ${p.selectedPlan}.` : ""}${
      p.comuna ? `\nComuna: ${p.comuna}.` : ""
    }${p.details ? `\nDetalle: ${p.details}` : ""}\n¿Podrían orientarme con las opciones disponibles?`,

  planificacion: (p) =>
    `Hola, me gustaría planificar un servicio funerario de manera preventiva.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.selectedPlan ? `\nMe interesa conocer el ${p.selectedPlan}.` : ""}\n¿Podrían agendar una asesoría personalizada?`,

  cremacion: (p) =>
    `Hola, necesito información sobre sus servicios de cremación.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\nConsulta: ${p.details}` : ""}\n¿Podrían explicarme el proceso y costos?`,

  traslado: (p) =>
    `Hola, necesito coordinar un traslado funerario.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.comuna ? `\nDesde/hacia: ${p.comuna}.` : ""}${
      p.details ? `\nDetalle: ${p.details}` : ""
    }\n¿Pueden orientarme?`,

  obituario: (p) =>
    `Hola, tengo una consulta sobre obituarios en su sitio web.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\nConsulta: ${p.details}` : ""}`,

  memorial: (p) =>
    `Hola, me gustaría información sobre memoriales virtuales.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\nConsulta: ${p.details}` : ""}`,

  general: (p) =>
    `Hola, me comunico desde su sitio web.${
      p.name ? `\nMi nombre es ${p.name}.` : ""
    }${p.details ? `\n${p.details}` : ""}\n¿Podrían orientarme?`,
};

export const buildWhatsAppMessage = (params: WhatsAppMessageParams): string => {
  const template = INTENT_TEMPLATES[params.intent] || INTENT_TEMPLATES.general;
  return template(params);
};

export const buildWhatsAppUrl = (params: WhatsAppMessageParams): string => {
  const message = buildWhatsAppMessage(params);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

export const buildWhatsAppUrlDirect = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export { WHATSAPP_NUMBER };
