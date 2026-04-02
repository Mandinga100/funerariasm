import { Flame, Flower2, Crown, Eye } from "lucide-react";

interface OfferingButtonsProps {
  onCandle: () => void;
  onFlower: () => void;
  onCrown: () => void;
  onViewTributes: () => void;
  candleCount: number;
  flowerCount: number;
  crownCount: number;
  candleDisabled?: boolean;
  flowerDisabled?: boolean;
}

const OfferingButtons = ({
  onCandle,
  onFlower,
  onCrown,
  onViewTributes,
  candleCount,
  flowerCount,
  crownCount,
  candleDisabled,
  flowerDisabled,
}: OfferingButtonsProps) => {
  const totalTributes = candleCount + flowerCount + crownCount;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-6">
      <button
        onClick={onCandle}
        disabled={candleDisabled}
        className="group flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 hover:border-amber-500/50 text-amber-400/80 hover:text-amber-300 transition-all duration-300 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Flame className="w-4 h-4 group-hover:animate-pulse" />
        <span className="hidden sm:inline">Prender una vela</span>
        <span className="sm:hidden">Vela</span>
        {candleCount > 0 && (
          <span className="ml-1 text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded-full">{candleCount}</span>
        )}
      </button>

      <button
        onClick={onFlower}
        disabled={flowerDisabled}
        className="group flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full border border-rose-400/30 bg-rose-400/5 hover:bg-rose-400/15 hover:border-rose-400/50 text-rose-300/80 hover:text-rose-200 transition-all duration-300 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Flower2 className="w-4 h-4 group-hover:animate-pulse" />
        <span className="hidden sm:inline">Regalar Flores</span>
        <span className="sm:hidden">Flores</span>
        {flowerCount > 0 && (
          <span className="ml-1 text-[10px] bg-rose-400/20 px-1.5 py-0.5 rounded-full">{flowerCount}</span>
        )}
      </button>

      <button
        onClick={onCrown}
        className="group flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full border border-gold/30 bg-gold/5 hover:bg-gold/15 hover:border-gold/50 text-gold/80 hover:text-gold transition-all duration-300 text-xs sm:text-sm"
      >
        <Crown className="w-4 h-4 group-hover:animate-pulse" />
        <span className="hidden sm:inline">Donar Corona</span>
        <span className="sm:hidden">Corona</span>
        {crownCount > 0 && (
          <span className="ml-1 text-[10px] bg-gold/20 px-1.5 py-0.5 rounded-full">{crownCount}</span>
        )}
      </button>

      <button
        onClick={onViewTributes}
        className="group flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/5 hover:bg-primary-foreground/10 hover:border-primary-foreground/25 text-primary-foreground/50 hover:text-primary-foreground/70 transition-all duration-300 text-xs sm:text-sm"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden sm:inline">Ver Tributos</span>
        <span className="sm:hidden">Tributos</span>
        {totalTributes > 0 && (
          <span className="ml-1 text-[10px] bg-primary-foreground/10 px-1.5 py-0.5 rounded-full">{totalTributes}</span>
        )}
      </button>
    </div>
  );
};

export default OfferingButtons;
