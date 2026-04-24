import { useEffect, useRef, useState } from "react";
import { X, Crown } from "lucide-react";
import { checkBotShield, createShieldTimer, honeypotInputProps } from "@/lib/bot-shield";

interface CrownDonationModalProps {
  open: boolean;
  onClose: () => void;
  onDonate: (data: { donorName: string; message: string; amount: number; tier: number; simulate: boolean }) => void;
  memorialName: string;
  sending: boolean;
}

const TIERS = [
  { amount: 5000, tier: 1, label: "$5.000", flowers: "Margaritas blancas", desc: "Corona de margaritas" },
  { amount: 10000, tier: 2, label: "$10.000", flowers: "Rosas y claveles blancos", desc: "Corona de rosas" },
  { amount: 15000, tier: 3, label: "$15.000", flowers: "Lirios y rosas rojas", desc: "Corona premium" },
  { amount: 20000, tier: 4, label: "$20.000", flowers: "Orquídeas y rosas con cintas doradas", desc: "Corona de lujo" },
];

const CrownDonationModal = ({ open, onClose, onDonate, memorialName, sending }: CrownDonationModalProps) => {
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAtRef = useRef<number>(createShieldTimer());

  // Reset timer y honeypot cada vez que se abre el modal
  useEffect(() => {
    if (open) {
      startedAtRef.current = createShieldTimer();
      setHoneypot("");
    }
  }, [open]);

  if (!open) return null;

  const selected = TIERS.find((t) => t.tier === selectedTier);
  const isValid = donorName.trim().length > 0 && message.trim().length > 0 && selectedTier !== null;

  const handleSubmit = (simulate: boolean) => {
    if (!isValid || !selected) return;

    // Defensa anti-bot — el shield aplica también para simulaciones para
    // evitar que bots inunden la UI con coronas falsas.
    const shield = checkBotShield({
      honeypot,
      startedAt: startedAtRef.current,
      formKey: "memorial_offering",
    });
    if (!shield.ok) {
      // Mensaje en consola; no rompemos UX silenciosa con toast aquí porque
      // el modal no tiene contenedor de errores. El usuario verá que no pasó nada.
      console.warn("[CrownDonationModal] Shield bloqueó envío:", shield.reason);
      return;
    }

    onDonate({
      donorName: donorName.trim(),
      message: message.trim(),
      amount: selected.amount,
      tier: selected.tier,
      simulate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-primary border border-gold/20 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-gold/60" />
            <h3 className="font-playfair text-lg text-primary-foreground">Donar Corona de Flores</h3>
          </div>
          <button onClick={onClose} className="text-primary-foreground/40 hover:text-primary-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="px-6 text-sm text-primary-foreground/40 mb-5">
          En memoria de <span className="text-gold/70 font-medium">{memorialName}</span>
        </p>

        <div className="px-6 space-y-4 pb-6">
          {/* Honeypot — invisible para humanos, visible para bots */}
          <input
            {...honeypotInputProps}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
          {/* Donor name */}
          <div>
            <label className="text-xs text-primary-foreground/50 mb-1.5 block">Nombre o Familia *</label>
            <input
              type="text"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Familia González"
              maxLength={100}
              className="w-full px-4 py-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/20 focus:border-gold/40 text-primary-foreground placeholder:text-primary-foreground/25 text-sm focus:outline-none focus:ring-1 focus:ring-gold/15 transition-all duration-300"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-primary-foreground/50 mb-1.5 block">Mensaje *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descanse en paz. Siempre le recordaremos..."
              maxLength={300}
              rows={2}
              className="w-full px-4 py-3 rounded-lg bg-primary-foreground/5 border border-primary-foreground/10 hover:border-gold/20 focus:border-gold/40 text-primary-foreground placeholder:text-primary-foreground/25 text-sm focus:outline-none focus:ring-1 focus:ring-gold/15 transition-all duration-300 resize-none"
            />
          </div>

          {/* Tier selection */}
          <div>
            <label className="text-xs text-primary-foreground/50 mb-2 block">Seleccione su corona *</label>
            <div className="grid grid-cols-2 gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.tier}
                  onClick={() => setSelectedTier(t.tier)}
                  className={`relative px-3 py-3 rounded-xl border text-left transition-all duration-300 ${
                    selectedTier === t.tier
                      ? "border-gold/60 bg-gold/10 shadow-[0_0_16px_-4px_hsl(var(--gold)/0.3)]"
                      : "border-primary-foreground/10 bg-primary-foreground/3 hover:border-gold/20"
                  }`}
                >
                  <span className={`text-lg font-semibold block ${selectedTier === t.tier ? "text-gold" : "text-primary-foreground/70"}`}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-primary-foreground/40 leading-tight block mt-0.5">{t.flowers}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => handleSubmit(false)}
              disabled={!isValid || sending}
              className="w-full py-3 rounded-full bg-gold text-primary font-medium text-sm hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_16px_-4px_hsl(var(--gold)/0.4)] hover:shadow-[0_0_24px_-4px_hsl(var(--gold)/0.6)]"
            >
              {sending ? "Procesando..." : `Donar Corona de Flores — ${selected?.label || ""}`}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              disabled={!isValid || sending}
              className="w-full py-3 rounded-full border border-primary-foreground/15 text-primary-foreground/50 hover:text-primary-foreground/70 hover:border-primary-foreground/25 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              Simular Donación
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrownDonationModal;
