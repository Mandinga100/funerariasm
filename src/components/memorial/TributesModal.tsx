import { useState } from "react";
import { X, Flame, Flower2, Crown, ChevronDown, ChevronUp } from "lucide-react";

interface Offering {
  id: string;
  offering_type: string;
  crown_tier?: number;
  donor_name?: string;
  donor_message?: string;
  amount?: number;
  created_at?: string;
}

interface TributesModalProps {
  open: boolean;
  onClose: () => void;
  offerings: Offering[];
  memorialName: string;
}

const OFFERING_META: Record<string, { label: string; icon: typeof Flame; color: string; bgColor: string }> = {
  candle: { label: "Velas Encendidas", icon: Flame, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/20" },
  flower: { label: "Flores Ofrecidas", icon: Flower2, color: "text-rose-300", bgColor: "bg-rose-400/10 border-rose-400/20" },
  flower_crown: { label: "Coronas de Flores", icon: Crown, color: "text-gold", bgColor: "bg-gold/10 border-gold/20" },
};

const CROWN_TIER_LABELS: Record<number, string> = {
  1: "Margaritas blancas — $5.000",
  2: "Rosas y claveles — $10.000",
  3: "Lirios y rosas — $15.000",
  4: "Orquídeas premium — $20.000",
};

const TributesModal = ({ open, onClose, offerings, memorialName }: TributesModalProps) => {
  const [expandedType, setExpandedType] = useState<string | null>(null);

  if (!open) return null;

  const grouped: Record<string, Offering[]> = {};
  for (const o of offerings) {
    if (!grouped[o.offering_type]) grouped[o.offering_type] = [];
    grouped[o.offering_type].push(o);
  }

  const types = ["candle", "flower", "flower_crown"].filter((t) => grouped[t]?.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[80vh] bg-primary border border-gold/20 rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-primary-foreground/10">
          <div>
            <h3 className="font-playfair text-lg text-primary-foreground">Tributos Recibidos</h3>
            <p className="text-xs text-primary-foreground/40 mt-1">
              En memoria de <span className="text-gold/70">{memorialName}</span> — {offerings.length} tributos
            </p>
          </div>
          <button onClick={onClose} className="text-primary-foreground/40 hover:text-primary-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {types.length === 0 ? (
            <p className="text-primary-foreground/30 text-sm text-center py-12">Aún no hay tributos.</p>
          ) : (
            types.map((type) => {
              const meta = OFFERING_META[type];
              const items = grouped[type];
              const Icon = meta.icon;
              const isExpanded = expandedType === type;

              return (
                <div key={type} className={`rounded-xl border ${meta.bgColor} overflow-hidden transition-all duration-300`}>
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : type)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                      <div>
                        <span className="text-sm font-medium text-primary-foreground/80">{meta.label}</span>
                        <span className="ml-2 text-xs text-primary-foreground/40">({items.length})</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-primary-foreground/30" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-primary-foreground/30" />
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2 border-t border-primary-foreground/5">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 py-3 border-b border-primary-foreground/5 last:border-b-0"
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bgColor}`}>
                            <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary-foreground/70 truncate">
                              {item.donor_name || "Anónimo"}
                            </p>
                            {item.donor_message && (
                              <p className="text-xs text-primary-foreground/40 mt-0.5 line-clamp-2">
                                "{item.donor_message}"
                              </p>
                            )}
                            {type === "flower_crown" && item.crown_tier && (
                              <p className="text-[10px] text-gold/50 mt-1">
                                {CROWN_TIER_LABELS[item.crown_tier] || `Tier ${item.crown_tier}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TributesModal;
