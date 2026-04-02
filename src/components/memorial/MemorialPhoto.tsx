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

  // Total items to place around circle (alternating candles and flowers)
  const totalCandles = Math.min(candles.length, 16);
  const totalFlowers = Math.min(flowers.length, 16);

  // Build alternating positions outside the photo+crown area
  const orbitItems = useMemo(() => {
    const items: { type: "candle" | "flower"; x: number; y: number; angle: number; delay: number }[] = [];
    // Interleave candles and flowers
    const maxCount = Math.max(totalCandles, totalFlowers);
    let candleIdx = 0;
    let flowerIdx = 0;
    for (let i = 0; i < maxCount * 2; i++) {
      if (i % 2 === 0 && candleIdx < totalCandles) {
        candleIdx++;
        items.push({ type: "candle", x: 0, y: 0, angle: 0, delay: items.length * 0.1 });
      } else if (flowerIdx < totalFlowers) {
        flowerIdx++;
        items.push({ type: "flower", x: 0, y: 0, angle: 0, delay: items.length * 0.1 });
      } else if (candleIdx < totalCandles) {
        candleIdx++;
        items.push({ type: "candle", x: 0, y: 0, angle: 0, delay: items.length * 0.1 });
      }
    }
    // Now position them in a circle outside the crown
    const hasCrown = bestCrown !== null;
    const radius = hasCrown ? 62 : 56; // % from center — outside the crown overlay
    const count = items.length;
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
      items[i].x = 50 + Math.cos(angle) * radius;
      items[i].y = 50 + Math.sin(angle) * radius;
      items[i].angle = (angle * 180) / Math.PI;
    }
    return items;
  }, [totalCandles, totalFlowers, bestCrown]);

  return (
    <div className="relative w-56 h-56 md:w-64 md:h-64 mx-auto mb-6">
      {/* Crown overlay (behind photo border) */}
      {bestCrown && bestCrown.crown_tier && CROWN_IMAGES[bestCrown.crown_tier] && (
        <div className="absolute inset-[-28%] z-[1] animate-scale-in pointer-events-none">
          <img
            src={CROWN_IMAGES[bestCrown.crown_tier]}
            alt="Corona de flores"
            className="w-full h-full object-contain drop-shadow-lg"
            loading="lazy"
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

      {/* Orbit items (candles & flowers alternating outside the circle) */}
      {orbitItems.map((item, i) =>
        item.type === "candle" ? (
          <div
            key={`candle-${i}`}
            className="absolute z-[3] pointer-events-none"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: "translate(-50%, -50%)",
              animation: `fade-in 0.5s ease-out ${item.delay}s both`,
            }}
          >
            <div className="relative flex flex-col items-center">
              <div
                className="w-2.5 h-4 rounded-full bg-gradient-to-t from-amber-500 via-amber-400 to-yellow-200 shadow-[0_0_8px_2px_rgba(245,158,11,0.5)]"
                style={{ animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${item.delay}s` }}
              />
              <div className="w-1.5 h-4 bg-gradient-to-b from-amber-100 to-amber-200 rounded-b-sm" />
            </div>
          </div>
        ) : (
          <div
            key={`flower-${i}`}
            className="absolute z-[3] pointer-events-none text-rose-300"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%) rotate(${item.angle + 90}deg)`,
              animation: `fade-in 0.6s ease-out ${item.delay}s both`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="drop-shadow-sm">
              <path d="M12 2C9.5 2 8 4.5 8 6.5C8 8.5 9.5 10 12 10C14.5 10 16 8.5 16 6.5C16 4.5 14.5 2 12 2Z" opacity="0.8" />
              <path d="M6.5 8C4.5 8 2 9.5 2 12C2 14.5 4.5 16 6.5 16C8.5 16 10 14.5 10 12C10 9.5 8.5 8 6.5 8Z" opacity="0.7" />
              <path d="M17.5 8C15.5 8 14 9.5 14 12C14 14.5 15.5 16 17.5 16C19.5 16 22 14.5 22 12C22 9.5 19.5 8 17.5 8Z" opacity="0.7" />
              <path d="M12 14C9.5 14 8 15.5 8 17.5C8 19.5 9.5 22 12 22C14.5 22 16 19.5 16 17.5C16 15.5 14.5 14 12 14Z" opacity="0.8" />
              <circle cx="12" cy="12" r="3" fill="rgb(251 191 36)" opacity="0.9" />
            </svg>
          </div>
        )
      )}

      {/* Count badges */}
      {candles.length > 16 && (
        <div className="absolute -bottom-1 -right-1 z-[4] bg-amber-500/90 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
          🕯 {candles.length}
        </div>
      )}
      {flowers.length > 16 && (
        <div className="absolute -bottom-1 -left-1 z-[4] bg-rose-400/90 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
          🌸 {flowers.length}
        </div>
      )}
    </div>
  );
};

export default MemorialPhoto;
