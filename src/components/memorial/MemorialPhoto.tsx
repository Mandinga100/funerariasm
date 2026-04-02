import { useMemo } from "react";
import crownTier1 from "@/assets/offerings/crown-tier1.png";
import crownTier2 from "@/assets/offerings/crown-tier2.png";
import crownTier3 from "@/assets/offerings/crown-tier3.png";
import crownTier4 from "@/assets/offerings/crown-tier4.png";

const CROWN_IMAGES: Record<number, string> = {
  1: crownTier1,
  2: crownTier2,
  3: crownTier3,
  4: crownTier4,
};

interface Offering {
  id: string;
  offering_type: string;
  crown_tier?: number;
}

interface MemorialPhotoProps {
  photoUrl: string | null;
  fullName: string;
  offerings: Offering[];
}

const MemorialPhoto = ({ photoUrl, fullName, offerings }: MemorialPhotoProps) => {
  const candles = offerings.filter((o) => o.offering_type === "candle");
  const flowers = offerings.filter((o) => o.offering_type === "flower");
  const bestCrown = useMemo(() => {
    const crowns = offerings.filter((o) => o.offering_type === "flower_crown");
    if (crowns.length === 0) return null;
    return crowns.reduce((best, c) => ((c.crown_tier || 0) > (best.crown_tier || 0) ? c : best), crowns[0]);
  }, [offerings]);

  const initials = fullName.split(" ").map((n) => n[0]).slice(0, 2).join("");

  // Position candles around the circle
  const candlePositions = useMemo(() => {
    const positions: { x: number; y: number; delay: number }[] = [];
    const count = Math.min(candles.length, 12);
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
      const radius = 85;
      positions.push({
        x: 50 + Math.cos(angle) * radius * 0.55,
        y: 50 + Math.sin(angle) * radius * 0.55,
        delay: i * 0.15,
      });
    }
    return positions;
  }, [candles.length]);

  // Position flowers around the circle
  const flowerPositions = useMemo(() => {
    const positions: { x: number; y: number; rotation: number; delay: number }[] = [];
    const count = Math.min(flowers.length, 8);
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 + Math.PI / 6;
      const radius = 80;
      positions.push({
        x: 50 + Math.cos(angle) * radius * 0.55,
        y: 50 + Math.sin(angle) * radius * 0.55,
        rotation: (angle * 180) / Math.PI + 90,
        delay: i * 0.2,
      });
    }
    return positions;
  }, [flowers.length]);

  return (
    <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto mb-6">
      {/* Crown overlay (behind photo border) */}
      {bestCrown && bestCrown.crown_tier && CROWN_IMAGES[bestCrown.crown_tier] && (
        <div className="absolute inset-[-22%] z-[1] animate-scale-in pointer-events-none">
          <img
            src={CROWN_IMAGES[bestCrown.crown_tier]}
            alt="Corona de flores"
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
      )}

      {/* Photo circle */}
      <div className="relative z-[2] w-full h-full rounded-full border-4 border-gold/25 overflow-hidden bg-primary-foreground/5 shadow-[0_0_30px_-8px_hsl(var(--gold)/0.2)]">
        {photoUrl ? (
          <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-playfair text-gold/40">{initials}</span>
          </div>
        )}
      </div>

      {/* Candles */}
      {candlePositions.map((pos, i) => (
        <div
          key={`candle-${i}`}
          className="absolute z-[3] pointer-events-none"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: "translate(-50%, -50%)",
            animation: `fade-in 0.5s ease-out ${pos.delay}s both`,
          }}
        >
          <div className="relative flex flex-col items-center">
            {/* Flame */}
            <div
              className="w-2.5 h-4 rounded-full bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-200 shadow-[0_0_8px_2px_rgba(245,158,11,0.5)]"
              style={{ animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${pos.delay}s` }}
            />
            {/* Candle body */}
            <div className="w-1.5 h-4 bg-gradient-to-b from-amber-100 to-amber-200 rounded-b-sm" />
          </div>
        </div>
      ))}

      {/* Flowers */}
      {flowerPositions.map((pos, i) => (
        <div
          key={`flower-${i}`}
          className="absolute z-[3] pointer-events-none text-rose-300"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
            animation: `fade-in 0.6s ease-out ${pos.delay}s both`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm">
            <path d="M12 2C9.5 2 8 4.5 8 6.5C8 8.5 9.5 10 12 10C14.5 10 16 8.5 16 6.5C16 4.5 14.5 2 12 2Z" opacity="0.8" />
            <path d="M6.5 8C4.5 8 2 9.5 2 12C2 14.5 4.5 16 6.5 16C8.5 16 10 14.5 10 12C10 9.5 8.5 8 6.5 8Z" opacity="0.7" />
            <path d="M17.5 8C15.5 8 14 9.5 14 12C14 14.5 15.5 16 17.5 16C19.5 16 22 14.5 22 12C22 9.5 19.5 8 17.5 8Z" opacity="0.7" />
            <path d="M12 14C9.5 14 8 15.5 8 17.5C8 19.5 9.5 22 12 22C14.5 22 16 19.5 16 17.5C16 15.5 14.5 14 12 14Z" opacity="0.8" />
            <circle cx="12" cy="12" r="3" fill="rgb(251 191 36)" opacity="0.9" />
          </svg>
        </div>
      ))}

      {/* Candle count badge */}
      {candles.length > 12 && (
        <div className="absolute -bottom-1 -right-1 z-[4] bg-amber-500/90 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
          🕯 {candles.length}
        </div>
      )}
    </div>
  );
};

export default MemorialPhoto;
