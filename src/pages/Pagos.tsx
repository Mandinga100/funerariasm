import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Layout from "@/components/Layout";
import SecureBankTransferCard from "@/components/payment/SecureBankTransferCard";
import PaymentNotificationForm from "@/components/payment/PaymentNotificationForm";
import { PAYMENT_TYPES, PaymentType, PLANS, DONATION_AMOUNTS, formatClp } from "@/lib/payment-config";
import { Heart, Calendar, Flower2, Phone, MessageCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const ICONS: Record<PaymentType, React.ReactNode> = {
  servicio: <Heart className="w-6 h-6" />,
  planificacion: <Calendar className="w-6 h-6" />,
  donacion: <Flower2 className="w-6 h-6" />,
};

const DESCRIPTIONS: Record<PaymentType, string> = {
  servicio: "Realiza el pago de tu servicio funerario de forma segura. Puedes abonar, pagar saldo pendiente o cancelar el total.",
  planificacion: "Asegura el futuro de tu familia contratando un plan anticipado con tranquilidad y previsión.",
  donacion: "Honra la memoria de un ser querido con una donación al Legado Eterno. Tu gesto de amor será recordado.",
};

const STEPS = [
  "Selecciona el tipo de pago",
  "Revisa los datos bancarios",
  "Realiza la transferencia desde tu banco",
  "Completa el formulario de notificación",
  "Espera la confirmación de nuestro equipo",
];

const Pagos = () => {
  const [searchParams] = useSearchParams();
  const initialType = (searchParams.get("tipo") as PaymentType) || null;
  const initialPlan = searchParams.get("plan") || undefined;

  const [selectedType, setSelectedType] = useState<PaymentType | null>(initialType);
  const [step, setStep] = useState<"select" | "bank" | "form">(initialType ? "bank" : "select");

  const handleSelectType = (type: PaymentType) => {
    setSelectedType(type);
    setStep("bank");
  };

  const handleProceedToForm = () => {
    setStep("form");
  };

  const handleBack = () => {
    if (step === "form") setStep("bank");
    else if (step === "bank") {
      setStep("select");
      setSelectedType(null);
    }
  };

  const preselectedAmount = selectedType === "planificacion" && initialPlan
    ? PLANS.find((p) => p.id === initialPlan)?.price
    : undefined;

  return (
    <Layout>
      <Helmet>
        <title>Pagos Seguros | Funeraria Santa Margarita</title>
        <meta name="description" content="Realiza pagos de servicios funerarios, planificación anticipada y donaciones de forma segura por transferencia bancaria." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pt-28 pb-16">
        <div className="container max-w-3xl mx-auto px-4">

          {/* Header */}
          <div className="text-center mb-10">
            <ShieldCheck className="w-10 h-10 text-gold mx-auto mb-3" />
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-primary mb-3">
              Pagos Seguros
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Transferencia bancaria verificada manualmente por nuestro equipo. Proceso seguro, confidencial y trazable.
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
            {["Tipo", "Datos bancarios", "Notificación"].map((label, i) => {
              const stepIndex = i === 0 ? "select" : i === 1 ? "bank" : "form";
              const isActive = step === stepIndex;
              const isPast = (step === "bank" && i === 0) || (step === "form" && i <= 1);
              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isActive ? "bg-gold text-primary-foreground" : isPast ? "bg-gold/30 text-gold" : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-sm hidden sm:inline ${isActive ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              );
            })}
          </div>

          {/* Back button */}
          {step !== "select" && (
            <button onClick={handleBack} className="text-sm text-gold hover:underline mb-6 block">
              ← Volver
            </button>
          )}

          {/* Step 1: Select type */}
          {step === "select" && (
            <div className="grid gap-4 md:grid-cols-3">
              {(Object.keys(PAYMENT_TYPES) as PaymentType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type)}
                  className="text-left p-6 rounded-2xl border-2 border-border/50 hover:border-gold/50 bg-card transition-all hover:shadow-lg group"
                >
                  <div className="text-gold mb-3 group-hover:scale-110 transition-transform">{ICONS[type]}</div>
                  <h3 className="font-semibold text-primary mb-2 font-playfair">{PAYMENT_TYPES[type].label}</h3>
                  <p className="text-sm text-muted-foreground">{DESCRIPTIONS[type]}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Bank details */}
          {step === "bank" && selectedType && (
            <div className="space-y-6">
              <div className="bg-card rounded-2xl border border-border/50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  {ICONS[selectedType]}
                  <h2 className="text-xl font-semibold text-primary font-playfair">
                    {PAYMENT_TYPES[selectedType].label}
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm">{DESCRIPTIONS[selectedType]}</p>
              </div>

              <SecureBankTransferCard />

              <div className="bg-card rounded-2xl border border-border/50 p-6">
                <h3 className="font-semibold text-primary mb-4">Pasos para transferir</h3>
                <ol className="space-y-3">
                  {STEPS.slice(1).map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="w-6 h-6 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0 text-xs font-semibold">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              <Button onClick={handleProceedToForm} className="w-full bg-gold hover:bg-gold/90 text-primary-foreground h-12 text-base">
                Ya realicé la transferencia <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {/* Urgency CTA */}
              {selectedType === "servicio" && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                  <a href="tel:+56964333760" className="flex items-center justify-center gap-2 text-sm text-gold hover:underline">
                    <Phone className="w-4 h-4" /> Llamar ahora
                  </a>
                  <a
                    href={buildWhatsAppUrl("Necesito ayuda con el pago de un servicio funerario")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm text-green-600 hover:underline"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Notification form */}
          {step === "form" && selectedType && (
            <div className="bg-card rounded-2xl border border-border/50 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-primary font-playfair mb-2">
                Notificar transferencia
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Completa los datos para que nuestro equipo pueda verificar tu pago.
              </p>
              <PaymentNotificationForm
                paymentType={selectedType}
                preselectedPlan={initialPlan}
                preselectedAmount={preselectedAmount}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Pagos;
