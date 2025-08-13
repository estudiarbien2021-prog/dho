import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html","./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand))",
          fg: "hsl(var(--brand-fg))",
          ring: "hsl(var(--brand-ring))",
          50:"hsl(var(--brand-50))",100:"hsl(var(--brand-100))",200:"hsl(var(--brand-200))",
          300:"hsl(var(--brand-300))",400:"hsl(var(--brand-400))",500:"hsl(var(--brand-500))",
          600:"hsl(var(--brand-600))",700:"hsl(var(--brand-700))",
        },
        surface:{ DEFAULT:"hsl(var(--surface))", soft:"hsl(var(--surface-soft))", strong:"hsl(var(--surface-strong))" },
        text:{ DEFAULT:"hsl(var(--text))", weak:"hsl(var(--text-weak))", mute:"hsl(var(--text-mute))" },
        // Compatibility aliases
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        foreground: "hsl(var(--foreground))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        background: "hsl(var(--background))",
        border: "hsl(var(--border))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-success": "var(--gradient-success)",
      },
      borderRadius:{ xl:"1.0rem","2xl":"1.25rem" },
      keyframes: {
        "ai-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.05)" }
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        "fade-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "blink": {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" }
        },
        "glow": {
          "0%, 100%": { textShadow: "0 0 10px hsl(var(--primary))" },
          "50%": { textShadow: "0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))" }
        }
      },
      animation: {
        "ai-pulse": "ai-pulse 2s ease-in-out infinite",
        "fade-in-down": "fade-in-down 0.6s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "fade-in-left": "fade-in-left 0.6s ease-out",
        "fade-in-right": "fade-in-right 0.6s ease-out",
        "scale-in": "scale-in 0.5s ease-out",
        "blink": "blink 1s infinite",
        "glow": "glow 2s ease-in-out infinite"
      },
      boxShadow: {
        "success-glow": "0 0 20px hsl(var(--success) / 0.3)",
        "ai-glow": "0 0 30px hsl(var(--primary) / 0.2)"
      }
    }
  },
  plugins: []
} satisfies Config;