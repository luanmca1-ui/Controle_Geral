import type { Config } from "tailwindcss";

/**
 * As cores são variáveis CSS, definidas em globals.css para o tema claro e
 * redefinidas para o escuro. Por isso não há hex aqui.
 *
 * Os nomes antigos (papel, tinta, pinho…) continuam apontando para os tokens
 * novos, para as telas já escritas não quebrarem de uma vez.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        muted: "var(--muted)",
        ring: "var(--ring)",
        chip: "var(--chip)",

        s1: "var(--s1)",
        s1Graf: "var(--s1-graf)",
        s2Graf: "var(--s2-graf)",
        s3Graf: "var(--s3-graf)",
        s2: "var(--s2)",
        s3: "var(--s3)",
        crit: "var(--crit)",
        good: "var(--good)",
        warn: "var(--warn)",

        // fundos suaves, porque cor em variável CSS não aceita modificador
        // de opacidade do Tailwind
        s1Soft: "var(--s1-soft)",
        critSoft: "var(--crit-soft)",
        goodSoft: "var(--good-soft)",
        warnSoft: "var(--warn-soft)",

        // nomes usados pelas telas já escritas
        papel: "var(--bg)",
        superficie: "var(--surface)",
        tinta: "var(--ink)",
        grafite: "var(--ink2)",
        linha: "var(--ring)",
        pinho: "var(--s1)",
        aco: "var(--muted)",
        laranja: "var(--s2)",
        folga: "var(--good)",
        atencao: "var(--warn)",
        risco: "var(--crit)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Inter",
          "Roboto",
          "system-ui",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "'Cascadia Mono'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "12px",
      },
      maxWidth: {
        painel: "1180px",
      },
    },
  },
  plugins: [],
};

export default config;
