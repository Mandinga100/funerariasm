export interface FaqItem {
  question: string;
  answer: string;
  expandedAnswer?: string;
  keywords?: string[];
  relatedLink?: { label: string; href: string };
}

export interface FaqCategory {
  key: string;
  label: string;
  icon: string;
  items: FaqItem[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    key: "servicios",
    label: "Servicios Funerarios",
    icon: "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0",
    items: [
      {
        question: "¿Qué incluye un servicio funerario completo?",
        answer: "Un servicio funerario completo incluye traslado del difunto, trámites legales (inscripción en el Registro Civil), preparación y tanatopraxia, sala de velación, urna o ataúd, carroza, arreglo floral y coordinación de la ceremonia.",
        expandedAnswer: "Dependiendo del plan elegido, también puede incluir cafetería para asistentes, aviso de prensa, memorial de vida en video 4K, vehículo acompañante y suite presidencial para la familia.",
        keywords: ["servicio funerario completo", "qué incluye funeral"],
        relatedLink: { label: "Ver nuestros planes", href: "/planes" },
      },
      {
        question: "¿Atienden las 24 horas del día?",
        answer: "Sí. Funeraria Santa Margarita opera las 24 horas del día, los 7 días de la semana, los 365 días del año. Puede contactarnos por teléfono o WhatsApp en cualquier momento.",
        keywords: ["funeraria 24 horas", "atención nocturna funeraria"],
        relatedLink: { label: "Contactar ahora", href: "/contacto" },
      },
      {
        question: "¿Realizan traslados fuera de Santiago?",
        answer: "Sí, coordinamos traslados terrestres y aéreos a cualquier punto del país. El costo varía según la distancia y el medio de transporte requerido.",
        keywords: ["traslado funerario", "traslado difunto regiones Chile"],
      },
      {
        question: "¿Ofrecen servicio de cremación?",
        answer: "Sí, contamos con servicio de cremación profesional que incluye sala de despedida, urna ceremonial y entrega de cenizas. La cremación se realiza en crematorios certificados de Santiago.",
        keywords: ["cremación Santiago", "crematorio Chile", "servicio cremación"],
        relatedLink: { label: "Más sobre cremación", href: "/blog" },
      },
    ],
  },
  {
    key: "tramites",
    label: "Trámites y Documentos",
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
    items: [
      {
        question: "¿Qué documentos necesito para gestionar un funeral?",
        answer: "Necesita el certificado de defunción emitido por un médico, la cédula de identidad del fallecido y la cédula del familiar responsable. Nosotros nos encargamos de la inscripción en el Registro Civil y todos los trámites administrativos.",
        keywords: ["documentos funeral Chile", "trámites defunción", "certificado defunción"],
      },
      {
        question: "¿Quién emite el certificado de defunción?",
        answer: "El certificado de defunción lo emite un médico. Si el fallecimiento ocurre en un hospital o clínica, el médico tratante lo emite. Si ocurre en domicilio, se debe contactar a un médico o al Servicio Médico Legal (SML).",
        keywords: ["certificado defunción Chile", "quién emite certificado defunción"],
      },
      {
        question: "¿Cuánto demoran los trámites de inscripción civil?",
        answer: "La inscripción de defunción en el Registro Civil se puede realizar el mismo día o al día siguiente. Nosotros gestionamos este trámite de forma urgente para que la familia no tenga que preocuparse.",
        keywords: ["inscripción defunción Registro Civil", "trámite defunción plazo"],
      },
      {
        question: "¿Se puede hacer el funeral sin certificado de defunción?",
        answer: "No. El certificado de defunción es un requisito legal obligatorio para proceder con el servicio funerario. Sin embargo, en casos de urgencia gestionamos su emisión de forma prioritaria.",
        keywords: ["funeral sin certificado defunción"],
      },
    ],
  },
  {
    key: "precios",
    label: "Precios y Planes",
    icon: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
    items: [
      {
        question: "¿Cuánto cuesta un funeral en Chile?",
        answer: "En Funeraria Santa Margarita, nuestros planes van desde $1.290.000 (Plan Margarita) hasta $3.990.000 (Plan Raulí). Cada plan incluye diferentes niveles de servicio, urna, sala de velación y acompañamiento.",
        keywords: ["precio funeral Chile", "cuánto cuesta funeral Santiago", "costo servicio funerario"],
        relatedLink: { label: "Comparar planes", href: "/planes" },
      },
      {
        question: "¿Existen facilidades de pago?",
        answer: "Sí, ofrecemos opciones de financiamiento y facilidades de pago. Consulte con nuestros asesores las alternativas disponibles según el plan seleccionado.",
        keywords: ["pago funeral cuotas", "financiamiento funeral Chile"],
        relatedLink: { label: "Hablar con un asesor", href: "/contacto" },
      },
      {
        question: "¿Cuánto cuesta una cremación en Santiago?",
        answer: "El costo de cremación varía según el plan elegido y los servicios adicionales. Nuestros planes que incluyen cremación parten desde $1.290.000. Solicite una cotización personalizada para más detalle.",
        keywords: ["precio cremación Santiago", "costo cremación Chile"],
        relatedLink: { label: "Cotizar cremación", href: "/planes" },
      },
    ],
  },
  {
    key: "cuota-mortuoria",
    label: "Cuota Mortuoria",
    icon: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
    items: [
      {
        question: "¿Qué es la cuota mortuoria?",
        answer: "La cuota mortuoria es un beneficio que otorgan las AFP, el IPS (ex INP) y algunas cajas de compensación para cubrir parte de los gastos funerarios. Corresponde a un monto fijo que se entrega a quien acredite haberse hecho cargo de los gastos del funeral.",
        keywords: ["cuota mortuoria Chile", "qué es cuota mortuoria", "beneficio funeral AFP"],
      },
      {
        question: "¿Cómo se tramita la cuota mortuoria?",
        answer: "Se tramita presentando la factura del servicio funerario, el certificado de defunción y la cédula de identidad del solicitante ante la AFP o el IPS correspondiente. Nosotros le asesoramos en todo el proceso.",
        expandedAnswer: "Paso 1: Obtener la factura del servicio funerario. Paso 2: Reunir certificado de defunción y cédula del solicitante. Paso 3: Presentar los documentos en la AFP, IPS o caja de compensación. Paso 4: Esperar la resolución (generalmente 10-15 días hábiles).",
        keywords: ["tramitar cuota mortuoria", "requisitos cuota mortuoria AFP"],
      },
      {
        question: "¿Cuánto es el monto de la cuota mortuoria?",
        answer: "El monto de la cuota mortuoria se actualiza periódicamente y equivale a aproximadamente 15 UF. El valor exacto depende del organismo pagador (AFP, IPS o caja de compensación).",
        keywords: ["monto cuota mortuoria", "cuánto pagan cuota mortuoria"],
      },
      {
        question: "¿Cualquier persona puede cobrar la cuota mortuoria?",
        answer: "La cuota mortuoria la puede cobrar quien demuestre haberse hecho cargo de los gastos funerarios, presentando la factura a su nombre. No es necesario ser familiar directo del fallecido.",
        keywords: ["quién cobra cuota mortuoria", "requisitos cobrar cuota mortuoria"],
      },
    ],
  },
  {
    key: "prevision",
    label: "Previsión Funeraria",
    icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    items: [
      {
        question: "¿Qué es la previsión funeraria?",
        answer: "La previsión funeraria es un plan de ahorro anticipado que permite contratar y pagar un servicio funerario antes de necesitarlo, asegurando precio fijo y evitando que la familia deba tomar decisiones bajo presión emocional.",
        keywords: ["previsión funeraria Chile", "plan funerario anticipado"],
        relatedLink: { label: "Conocer opciones de previsión", href: "/contacto" },
      },
      {
        question: "¿Cuáles son las ventajas de contratar un plan de previsión?",
        answer: "Las principales ventajas son: precio congelado al momento de la contratación, eliminación de la carga económica para la familia, libre elección de servicios sin presión, y tranquilidad de saber que todo está coordinado.",
        keywords: ["ventajas previsión funeraria", "por qué contratar plan funerario"],
      },
      {
        question: "¿Puedo contratar previsión funeraria para un familiar?",
        answer: "Sí, puede contratar un plan de previsión funeraria para usted, su cónyuge, padres u otros familiares. El beneficiario queda registrado y el servicio se activa cuando sea necesario.",
        keywords: ["previsión funeraria familiar"],
      },
    ],
  },
  {
    key: "duelo",
    label: "Duelo y Contención",
    icon: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
    items: [
      {
        question: "¿Ofrecen apoyo emocional durante el proceso?",
        answer: "Sí, brindamos contención emocional profesional durante todo el proceso funerario. Nuestro equipo está capacitado para acompañar a las familias con empatía y respeto en cada etapa.",
        keywords: ["apoyo emocional funeral", "contención emocional duelo"],
      },
      {
        question: "¿Cómo puedo ayudar a un familiar en duelo?",
        answer: "Lo más importante es estar presente, escuchar sin juzgar y respetar los tiempos de cada persona. Evite frases como 'ya pasará' o 'sé fuerte'. En nuestro blog encontrará guías prácticas de acompañamiento en duelo.",
        keywords: ["cómo acompañar en duelo", "ayudar familiar duelo"],
        relatedLink: { label: "Leer guías de duelo", href: "/blog" },
      },
    ],
  },
];

/** Get all FAQ items flattened */
export function getAllFaqItems(): FaqItem[] {
  return FAQ_CATEGORIES.flatMap((cat) => cat.items);
}

/** Get FAQ items for a specific category */
export function getFaqsByCategory(key: string): FaqItem[] {
  return FAQ_CATEGORIES.find((cat) => cat.key === key)?.items ?? [];
}
