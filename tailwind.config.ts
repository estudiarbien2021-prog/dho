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
        text:{ DEFAULT:"hsl(var(--text))", weak:"hsl(var(--text-weak))", mute:"hsl(var(--text-mute))" }
      },
      borderRadius:{ xl:"1.0rem","2xl":"1.25rem" }
    }
  },
  plugins: []
} satisfies Config;