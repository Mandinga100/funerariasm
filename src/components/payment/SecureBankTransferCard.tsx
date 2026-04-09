import { useState } from "react";
import { Copy, Check, Building2, ShieldCheck } from "lucide-react";
import { BANK_DATA } from "@/lib/payment-config";
import { Button } from "@/components/ui/button";

const SecureBankTransferCard = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* fallback silent */ }
  };

  const allData = `Banco: ${BANK_DATA.bank}\nTipo: Cuenta ${BANK_DATA.accountType}\nNº Cuenta: ${BANK_DATA.accountNumber}\nRUT: ${BANK_DATA.rut}\nTitular: ${BANK_DATA.holder}`;

  const fields = [
    { label: "Banco", value: BANK_DATA.bank, key: "bank" },
    { label: "Tipo de cuenta", value: `Cuenta ${BANK_DATA.accountType}`, key: "type" },
    { label: "Nº de cuenta", value: BANK_DATA.accountNumber, key: "account" },
    { label: "RUT", value: BANK_DATA.rut, key: "rut" },
    { label: "Titular", value: BANK_DATA.holder, key: "holder" },
  ];

  return (
    <div className="rounded-2xl border-2 border-gold/30 bg-gradient-to-b from-primary/5 to-primary/10 p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-6 h-6 text-gold" />
        <h3 className="text-lg font-semibold text-primary font-playfair">Datos para Transferencia</h3>
      </div>

      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="flex items-center justify-between bg-background/80 rounded-lg px-4 py-2.5 border border-border/50">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{f.label}</span>
              <p className="font-medium text-foreground">{f.value}</p>
            </div>
            <button
              onClick={() => copyToClipboard(f.value, f.key)}
              className="text-muted-foreground hover:text-gold transition-colors p-1"
              aria-label={`Copiar ${f.label}`}
            >
              {copied === f.key ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>

      <Button
        onClick={() => copyToClipboard(allData, "all")}
        variant="outline"
        className="w-full border-gold/40 text-gold hover:bg-gold/10 mt-2"
      >
        {copied === "all" ? (
          <><Check className="w-4 h-4 mr-2" /> Datos copiados</>
        ) : (
          <><Copy className="w-4 h-4 mr-2" /> Copiar todos los datos</>
        )}
      </Button>

      <div className="flex items-start gap-2 mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/40">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-200">
          Verifica cuidadosamente los datos antes de transferir. Funeraria Santa Margarita nunca solicitará pagos a cuentas diferentes.
        </p>
      </div>
    </div>
  );
};

export default SecureBankTransferCard;
