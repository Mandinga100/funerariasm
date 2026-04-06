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

const ROSE_COLORS = [
  { petal: "#e11d48", center: "#fbbf24" },
  { petal: "#f472b6", center: "#fde68a" },
  { petal: "#fbbf24", center: "#f59e0b" },
  { petal: "#f9fafb", center: "#fde68a" },
  { petal: "#c084fc", center: "#fbbf24" },
  { petal: "#fb923c", center: "#fde68a" },
];

const MemorialPhoto = ({ photoUrl, fullName, offerings }: MemorialPhotoProps) => {
  const candles = offerings.filter((o) => o.offering_type === "candle");
  const flowers = offerings.filter((o) => o.offering_type === "flower");
  const bestCrown = useMemo(() => {
    const crowns = offerings.filter((o) => o.offering_type === "flower_crown");
    if (crowns.length === 0) return null;
    return crowns.reduce((best, c) => ((c.crown_tier || 0) > (best.crown_tier || 0) ? c : best), crowns[0]);
  }, [offerings]);

  const initials = fullName.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const totalCandles = Math.min(candles.length, 12);
  const totalFlowers = Math.min(flowers.length, 12);

  const orbitItems = useMemo(() => {
    const items: { type: "candle" | "flower"; x: number; y: number; delay: number; colorIdx: number }[] = [];
    const maxCount = Math.max(totalCandles, totalFlowers);
    let candleIdx = 0;
    let flowerIdx = 0;
    for (let i = 0; i < maxCount * 2; i++) {
      if (i % 2 === 0 && candleIdx < totalCandles) {
        candleIdx++;
        items.push({ type: "candle", x: 0, y: 0, delay: items.length * 0.12, colorIdx: 0 });
      } else if (flowerIdx < totalFlowers) {
        items.push({ type: "flower", x: 0, y: 0, delay: items.length * 0.12, colorIdx: flowerIdx % ROSE_COLORS.length });
        flowerIdx++;
      } else if (candleIdx < totalCandles) {
        candleIdx++;
        items.push({ type: "candle", x: 0, y: 0, delay: items.length * 0.12, colorIdx: 0 });
      }
    }
    // Push orbit further out when crown is present
    const hasCrown = bestCrown !== null;
    const radius = hasCrown ? 82 : 56;
    const count = items.length;
    for (let i = 0; i < count; i++) {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
      items[i].x = 50 + Math.cos(angle) * radius;
      items[i].y = 50 + Math.sin(angle) * radius;
    }
    return items;
  }, [totalCandles, totalFlowers, bestCrown]);

  return (
    <div className="relative isolate w-56 h-56 md:w-64 md:h-64 mx-auto mb-20" style={{ overflow: "visible" }}>
      {/* LOCKED — Golden border on photo contour. DO NOT EDIT OR REMOVE. */}
      <div className="absolute inset-0 z-[1] rounded-full border-[3px] border-gold/60 shadow-[0_0_24px_-6px_hsl(var(--gold)/0.35)]" />

      {/* Layer 2: Portrait */}
      <div className="relative z-[2] w-full h-full rounded-full overflow-hidden bg-primary-foreground/5">
        {photoUrl ? (
          <img src={photoUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-playfair text-gold/40">{initials}</span>
          </div>
        )}
      </div>

      {/* LOCKED — Crown wreath above portrait. DO NOT CHANGE z-index order. */}
      {bestCrown && bestCrown.crown_tier && CROWN_IMAGES[bestCrown.crown_tier] && (
        <div
          className="absolute z-[3] pointer-events-none animate-scale-in"
          style={{
            top: "50%",
            left: "50%",
            width: "155%",
            height: "155%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <img
            src={CROWN_IMAGES[bestCrown.crown_tier]}
            alt="Corona de flores"
            className="w-full h-full object-contain"
            style={{
              filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))",
              opacity: 0.92,
              maskImage: "radial-gradient(circle, transparent 38%, black 48%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 38%, black 48%)",
            }}
            loading="lazy"
            width={1024}
            height={1024}
          />
        </div>
      )}

      {/* Orbit items — small, elegant candles & flowers */}
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
            <svg width="22" height="38" viewBox="0 0 22 38" className="drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]">
              <defs>
                <radialGradient id={`glow-${i}`} cx="50%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`wax-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="40%" stopColor="#fde68a" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id={`flame-${i}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="40%" stopColor="#fbbf24" />
                  <stop offset="70%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#fffbeb" />
                </linearGradient>
              </defs>
              <circle cx="11" cy="10" r="10" fill={`url(#glow-${i})`} />
              <path d="M11 3 C11 3, 6 10, 7.5 13 C8.5 15, 10 15, 11 15 C12 15, 13.5 15, 14.5 13 C16 10, 11 3, 11 3Z" fill={`url(#flame-${i})`} opacity="0.9">
                <animateTransform attributeName="transform" type="scale" values="1 1;0.95 1.06;1.03 0.97;1 1" dur="0.8s" repeatCount="indefinite" additive="sum" />
              </path>
              <path d="M11 7 C11 7, 9 11, 9.5 12.5 C10 14, 11 14, 11 14 C11 14, 12 14, 12.5 12.5 C13 11, 11 7, 11 7Z" fill="#fef9c3" opacity="0.95">
                <animateTransform attributeName="transform" type="scale" values="1 1;1.05 0.94;0.97 1.04;1 1" dur="0.6s" repeatCount="indefinite" additive="sum" />
              </path>
              <line x1="11" y1="14" x2="11" y2="17" stroke="#78350f" strokeWidth="0.8" strokeLinecap="round" />
              <rect x="8" y="17" width="6" height="14" rx="1.2" fill={`url(#wax-${i})`} />
              <ellipse cx="11" cy="17" rx="3.2" ry="1" fill="#fef3c7" opacity="0.7" />
              <ellipse cx="11" cy="31" rx="3.5" ry="1.2" fill="#92400e" opacity="0.5" />
            </svg>
          </div>
        ) : (
          <div
            key={`flower-${i}`}
            className="absolute z-[4] pointer-events-none"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: "translate(-50%, -50%)",
              animation: `fade-in 0.6s ease-out ${item.delay}s both`,
            }}
          >
            <svg width="20" height="36" viewBox="0 0 32 56" className="drop-shadow-md">
              <path d="M16 28 C16 28, 15.5 36, 15 42 C14.8 44, 15.2 48, 16 52" stroke="#2d5a27" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M15.5 36 C13 34, 9 35, 8 37 C9 36, 12 35.5, 15 37" fill="#3a6b33" opacity="0.85" />
              <path d="M15.5 42 C18 40, 22 41, 23 43 C22 42, 19 41.5, 16 43" fill="#3a6b33" opacity="0.85" />
              <ellipse cx="16" cy="20" rx="6" ry="8" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.5" />
              <ellipse cx="10" cy="22" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.45" transform="rotate(-35 10 22)" />
              <ellipse cx="22" cy="22" rx="5" ry="7" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.45" transform="rotate(35 22 22)" />
              <ellipse cx="16" cy="18" rx="5.5" ry="7.5" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.7" />
              <ellipse cx="11" cy="20" rx="4.5" ry="6.5" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.65" transform="rotate(-30 11 20)" />
              <ellipse cx="21" cy="20" rx="4.5" ry="6.5" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.65" transform="rotate(30 21 20)" />
              <ellipse cx="16" cy="19" rx="3.5" ry="5" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.85" transform="rotate(15 16 19)" />
              <circle cx="16" cy="20" r="3" fill={ROSE_COLORS[item.colorIdx].center} opacity="0.9" />
              <circle cx="16" cy="20" r="1.5" fill={ROSE_COLORS[item.colorIdx].petal} opacity="0.7" />
              <path d="M13 27 C12 29, 14 30, 16 28" fill="#3a6b33" opacity="0.7" />
              <path d="M19 27 C20 29, 18 30, 16 28" fill="#3a6b33" opacity="0.7" />
            </svg>
          </div>
        )
      )}

      {/* Count badges — only when exceeding max visible */}
      {candles.length > 12 && (
        <div className="absolute -bottom-1 -right-1 z-[5] bg-amber-500/90 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          🕯 {candles.length}
        </div>
      )}
      {flowers.length > 12 && (
        <div className="absolute -bottom-1 -left-1 z-[5] bg-rose-400/90 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          🌸 {flowers.length}
        </div>
      )}
    </div>
  );
};

export default MemorialPhoto;
