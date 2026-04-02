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

  const ROSE_COLORS = [
    { petal: "#e11d48", center: "#fbbf24" },  // Red rose
    { petal: "#f472b6", center: "#fde68a" },  // Pink rose
    { petal: "#fbbf24", center: "#f59e0b" },  // Yellow rose
    { petal: "#f9fafb", center: "#fde68a" },  // White rose
    { petal: "#c084fc", center: "#fbbf24" },  // Purple rose
    { petal: "#fb923c", center: "#fde68a" },  // Orange rose
  ];

  const orbitItems = useMemo(() => {
    const items: { type: "candle" | "flower"; x: number; y: number; angle: number; delay: number; colorIdx: number }[] = [];
    const maxCount = Math.max(totalCandles, totalFlowers);
    let candleIdx = 0;
    let flowerIdx = 0;
    for (let i = 0; i < maxCount * 2; i++) {
      if (i % 2 === 0 && candleIdx < totalCandles) {
        candleIdx++;
        items.push({ type: "candle", x: 0, y: 0, angle: 0, delay: items.length * 0.1, colorIdx: 0 });
      } else if (flowerIdx < totalFlowers) {
        items.push({ type: "flower", x: 0, y: 0, angle: 0, delay: items.length * 0.1, colorIdx: flowerIdx % ROSE_COLORS.length });
        flowerIdx++;
      } else if (candleIdx < totalCandles) {
        candleIdx++;
        items.push({ type: "candle", x: 0, y: 0, angle: 0, delay: items.length * 0.1, colorIdx: 0 });
      }
    }
    const hasCrown = bestCrown !== null;
    const radius = hasCrown ? 68 : 58;
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
    <div className="relative w-56 h-56 md:w-64 md:h-64 mx-auto mb-20">
      {/* Crown overlay — ON TOP of the photo for realism */}
      {bestCrown && bestCrown.crown_tier && CROWN_IMAGES[bestCrown.crown_tier] && (
        <div className="absolute inset-[-22%] z-[3] animate-scale-in pointer-events-none">
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
            className="absolute z-[4] pointer-events-none"
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
            className="absolute z-[4] pointer-events-none"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%)`,
              animation: `fade-in 0.6s ease-out ${item.delay}s both`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 32 32" className="drop-shadow-md">
              {/* Petals */}
              <ellipse cx="16" cy="8" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.85" />
              <ellipse cx="8" cy="14" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.75" transform="rotate(-40 8 14)" />
              <ellipse cx="24" cy="14" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.75" transform="rotate(40 24 14)" />
              <ellipse cx="10" cy="22" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.7" transform="rotate(-70 10 22)" />
              <ellipse cx="22" cy="22" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.7" transform="rotate(70 22 22)" />
              {/* Center */}
              <circle cx="16" cy="16" r="4" fill={ROSE_COLORS[item.colorIdx].center} opacity="0.9" />
              <circle cx="16" cy="16" r="2" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.5" />
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
