import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        playfair: ['Playfair Display', 'Georgia', 'serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        gold: {
          DEFAULT: "hsl(var(--gold))",
          light: "hsl(var(--gold-light))",
          dark: "hsl(var(--gold-dark))",
        },
        "deep-dark": "hsl(var(--deep-dark))",
        "soft-gray": "hsl(var(--soft-gray))",
        "medium-gray": "hsl(var(--medium-gray))",
        "dark-gray": "hsl(var(--dark-gray))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontSize: {
        'hero': 'clamp(2.5rem, 5vw + 1rem, 5.5rem)',
        'section': 'clamp(2rem, 3vw + 0.5rem, 3.5rem)',
        'body-responsive': 'clamp(1rem, 1.5vw + 0.5rem, 1.25rem)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "candle-light": {
          "0%": { opacity: "0", transform: "translate(-50%, -40%) scale(0.3)", filter: "drop-shadow(0 0 0px rgba(251,191,36,0))" },
          "60%": { opacity: "1", transform: "translate(-50%, -52%) scale(1.1)", filter: "drop-shadow(0 0 12px rgba(251,191,36,0.7))" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)", filter: "drop-shadow(0 0 6px rgba(245,158,11,0.6))" },
        },
        "flower-bloom": {
          "0%": { opacity: "0", transform: "translate(-50%, -40%) scale(0.2) rotate(-15deg)" },
          "50%": { opacity: "0.8", transform: "translate(-50%, -52%) scale(1.15) rotate(5deg)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1) rotate(0deg)" },
        },
        "crown-place": {
          "0%":   { opacity: "0",   transform: "translate(-50%, -62%) scale(0.78) rotate(-4deg)", filter: "drop-shadow(0 0 0px rgba(197,160,89,0)) blur(6px)" },
          "35%":  { opacity: "0.7", transform: "translate(-50%, -47%) scale(1.06) rotate(1.2deg)", filter: "drop-shadow(0 0 22px rgba(197,160,89,0.55)) blur(0.5px)" },
          "60%":  { opacity: "1",   transform: "translate(-50%, -50.6%) scale(0.985) rotate(-0.4deg)", filter: "drop-shadow(0 0 14px rgba(197,160,89,0.35)) blur(0px)" },
          "82%":  { opacity: "1",   transform: "translate(-50%, -49.7%) scale(1.005) rotate(0.15deg)", filter: "drop-shadow(0 0 8px rgba(197,160,89,0.22))" },
          "100%": { opacity: "1",   transform: "translate(-50%, -50%) scale(1) rotate(0deg)", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.25))" },
        },
        "crown-halo": {
          "0%":   { opacity: "0",    transform: "translate(-50%, -50%) scale(0.6)" },
          "40%":  { opacity: "0.55", transform: "translate(-50%, -50%) scale(1.05)" },
          "100%": { opacity: "0",    transform: "translate(-50%, -50%) scale(1.35)" },
        },
        "sparkle": {
          "0%":   { opacity: "0", transform: "translate(0, -28px) scale(0.3)" },
          "25%":  { opacity: "1", transform: "translate(calc(var(--sx,0) * 0.5), calc(var(--sy,0) * 0.4 - 14px)) scale(1)" },
          "65%":  { opacity: "0.9", transform: "translate(var(--sx,0), var(--sy,0)) scale(0.9)" },
          "100%": { opacity: "0", transform: "translate(calc(var(--sx,0) * 1.4), calc(var(--sy,0) + 6px)) scale(0.35)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in": "fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "crown-place": "crown-place 1400ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "crown-halo": "crown-halo 1200ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "candle-light": "candle-light 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "flower-bloom": "flower-bloom 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "sparkle": "sparkle 2.2s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
