/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060609',
          900: '#0A0A0F',
          850: '#0E0E16',
          800: '#13131F',
          750: '#181827',
          700: '#1F1F33',
          600: '#2A2A45',
        },
        brand: {
          purple: '#8B5CF6',
          violet: '#C084FC',
          pink: '#F472B6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
        },
        process: {
          p1: '#38BDF8', // Sky Blue
          p2: '#10B981', // Emerald
          p3: '#F59E0B', // Amber
          p4: '#F43F5E', // Rose
          p5: '#8B5CF6', // Purple
          p6: '#EC4899', // Pink
          p7: '#06B6D4', // Cyan
          p8: '#84CC16', // Lime
        }
      },
      fontFamily: {
        sans: ['Inter', 'Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 50%, #F472B6 100%)',
        'glow-radial': 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, rgba(10, 10, 15, 0) 70%)',
        'card-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-purple': '0 0 25px -5px rgba(139, 92, 246, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
