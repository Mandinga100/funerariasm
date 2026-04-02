import { Flame, Flower2, Crown } from "lucide-react";

interface OfferingButtonsProps {
  onCandle: () => void;
  onFlower: () => void;
  onCrown: () => void;
  candleCount: number;
  flowerCount: number;
  crownCount: number;
}

const OfferingButtons = ({ onCandle, onFlower, onCrown, candleCount, flowerCount, crownCount }: OfferingButtonsProps) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
      <button
        onClick={onCandle}
        className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/50 text-amber-400/80 hover:text-amber-300 transition-all duration-300 text-sm"
      >
        <Flame className="w-4 h-4 group-hover:animate-pulse" />
        <span>Prender una vela</span>
        {candleCount > 0 && (
          <span className="ml-1 text-xs bg-amber-500/20 px-2 py-0.5 rounded-full">{candleCount}</span>
        )}
      </button>

      <button
        onClick={onFlower}
        className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-rose-400/30 bg-rose-400/5 hover:bg-rose-400/15 hover:border-rose-400/50 text-rose-300/80 hover:text-rose-200 transition-all duration-300 text-sm"
      >
        <Flower2 className="w-4 h-4 group-hover:animate-pulse" />
        <span>Regalar Flores</span>
        {flowerCount > 0 && (
          <span className="ml-1 text-xs bg-rose-400/20 px-2 py-0.5 rounded-full">{flowerCount}</span>
        )}
      </button>

      <button
        onClick={onCrown}
        className="group flex items-center gap-2 px-5 py-2.5 rounded-full border border-gold/30 bg-gold/5 hover:bg-gold/15 hover:border-gold/50 text-gold/80 hover:text-gold transition-all duration-300 text-sm"
      >
        <Crown className="w-4 h-4 group-hover:animate-pulse" />
        <span>Donar Corona de Flores</span>
        {crownCount > 0 && (
          <span className="ml-1 text-xs bg-gold/20 px-2 py-0.5 rounded-full">{crownCount}</span>
        )}
      </button>
    </div>
  );
};

export default OfferingButtons;
