/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        scan: {
          "0%": { top: "0%" },
          "100%": { top: "100%" },
        },
        focus: {
          "0%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(1.05)",
          },
          "100%": {
            transform: "scale(1)",
          },
        },
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        focus: "focus 1s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        scan: "scan 2s linear infinite",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        sidebar: {
          DEFAULT: "#fafafa",
          foreground: "#0a0a0a",
          border: "#e5e5e5",
          ring: "#a1a1a1",
          primary: {
            DEFAULT: "#030213",
            foreground: "#fafafa",
          },
          accent: {
            DEFAULT: "#f5f5f5",
            foreground: "#171717",
          },
        },
        accent: {
          1: "#FFB347",
          2: "#A8E063",
          3: "#FFB6B9",
          4: "#7ED6FB",
          5: "#B39DDB",
          6: "#6EE7B7",
          7: "#FFE066",
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        info: {
          DEFAULT: "hsl(var(--color-info))",
          content: "hsl(var(--color-info-content))",
        },
        success: {
          DEFAULT: "hsl(var(--color-success))",
          content: "hsl(var(--color-success-content))",
        },
        warning: {
          DEFAULT: "hsl(var(--color-warning))",
          content: "hsl(var(--color-warning-content))",
        },
        error: {
          DEFAULT: "hsl(var(--color-error))",
          content: "hsl(var(--color-error-content))",
        },
        vowel: "#71cfff",
        consonant: "#ffa6ea",
        letter: "#cbadff",
        word: "#6f5ff8",
      },
      screens: {
        tl5: {
          raw: "(min-width: 768px) and (orientation: landscape) and (min-height: 500px)",
        },
        tl6: {
          raw: "(min-width: 768px) and (orientation: landscape) and (min-height: 600px)",
        },
        tl7: {
          raw: "(min-width: 768px) and (orientation: landscape) and (min-height: 700px)",
        },
        tl8: {
          raw: "(min-width: 768px) and (orientation: landscape) and (min-height: 800px)",
        },
        tl9: {
          raw: "(min-width: 768px) and (orientation: landscape) and (min-height: 900px)",
        },
        tp: {
          raw: "(min-width: 768px) and (orientation: portrait)",
        },
        "tb-lg": {
          raw: "(min-width: 1200px) and (orientation: landscape) and (min-height: 800px)",
        },
      },
      fontSize: {
        len1: [
          "14rem",
          {
            lineHeight: "1",
          },
        ],
      },
    },
  },
  plugins: [animate, require("tailwindcss-animate")],
  safelist: [
    {
      pattern:
        /^(bg|border|from|to|text)-(amber|rose|purple|blue|teal|lime|orange|slate|yellow|indigo|violet|cyan)-(50|100|200|300|400|500|600|700|800|900)$/,
    },
    {
      pattern:
        /^(bg|border|from|to|text)-(consonant|vowel|letter|word|info|success|warning|error).*$/,
    },
    {
      pattern: /^(text)-(9xl|8xl|7xl|len1).*$/,
    },
  ],
};
