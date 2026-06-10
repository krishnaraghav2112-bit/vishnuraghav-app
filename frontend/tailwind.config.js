/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        ink: {
          950: '#060510',
          900: '#0c0b18',
          800: '#131122',
          700: '#1a1830',
          600: '#252145',
        },
        brand: {
          gold: '#c9a84c',
          goldLight: '#f0d080',
          goldSoft: 'rgba(201,168,76,0.1)',
          purple: '#7c5cfc',
          purpleLight: '#a685ff',
          purpleSoft: 'rgba(124,92,252,0.1)',
        },
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'float-y': { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-16px)' } },
        'float-y2': { '0%,100%': { transform: 'translateY(0) rotate(3deg)' }, '50%': { transform: 'translateY(-20px) rotate(-2deg)' } },
        'glow-pulse': { '0%,100%': { opacity: '0.3' }, '50%': { opacity: '0.7' } },
        'gold-pulse': { '0%,100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' }, '70%': { boxShadow: '0 0 0 16px transparent' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(28px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.94)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float-y': 'float-y 4.3s ease-in-out infinite',
        'float-y2': 'float-y2 5.1s ease-in-out infinite 0.35s',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'gold-pulse': 'gold-pulse 2.8s infinite',
        'fade-up': 'fade-up 0.75s cubic-bezier(.16,1,.3,1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(.16,1,.3,1)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
