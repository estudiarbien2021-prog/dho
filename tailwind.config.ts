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
        
        // Shadcn component colors mapped to our design system
        background: "hsl(var(--surface))",
        foreground: "hsl(var(--text))",
        card: "hsl(var(--surface))",
        "card-foreground": "hsl(var(--text))",
        popover: "hsl(var(--surface))",
        "popover-foreground": "hsl(var(--text))",
        primary: "hsl(var(--brand))",
        "primary-foreground": "hsl(var(--brand-fg))",
        secondary: "hsl(var(--surface-soft))",
        "secondary-foreground": "hsl(var(--text))",
        muted: "hsl(var(--surface-strong))",
        "muted-foreground": "hsl(var(--text-weak))",
        accent: "hsl(var(--surface-soft))",
        "accent-foreground": "hsl(var(--text))",
        destructive: "hsl(0 62% 50%)",
        "destructive-foreground": "hsl(0 0% 100%)",
        border: "hsl(var(--surface-strong))",
        input: "hsl(var(--surface-strong))",
        ring: "hsl(var(--brand))"
      },
      borderRadius:{ xl:"1.0rem","2xl":"1.25rem" }
    }
  },
  plugins: []
} satisfies Config;