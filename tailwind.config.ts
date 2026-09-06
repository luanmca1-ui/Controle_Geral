import type { Config } from "tailwindcss";

/**
 * Paleta tirada do logo: circulo azul-petroleo, faixa vermelha, fundo creme,
 * navalha em laranja e lamina em azul-aco.
 *
 * O vermelho da marca é o mesmo do risco, de propósito: na faixa do topo ele
 * é identidade, no número negativo é alerta, e são os dois únicos lugares
 * onde ele aparece.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        papel: "#F6F1E7", // creme do fundo do logo
        superficie: "#FFFFFF",
        tinta: "#12232B",
        grafite: "#5C6B72",
        linha: "#DED7C7",
        pinho: "#16394A", // azul-petroleo do circulo
        aco: "#7FB2C4", // azul da lamina
        laranja: "#F04E23", // cabo da navalha
        folga: "#12735C",
        atencao: "#E08A1E",
        risco: "#C62A38", // vermelho da faixa
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
