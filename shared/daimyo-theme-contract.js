(function (root, factory) {
  const contract = factory();

  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = contract;
  }

  root.DaimyoThemeContract = contract;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  const themes = {
    dark: {
      id: "dark",
      label: "Sumi-e",
      tone: "Aço, laca negra e ouro cerimonial.",
      group: "classic",
      preview: ["#050505", "#D4A846", "#C41E3A"],
      tokens: {
        "--bg-deep": "#050505",
        "--bg-panel": "#111111",
        "--bg-card": "#181818",
        "--bg-input": "#0f0f0f",
        "--border-panel": "#2a2a2a",
        "--border-input": "#333333",
        "--border-focus": "#8b0000",
        "--text-primary": "#f5f0e8",
        "--text-secondary": "#b7ab9a",
        "--text-muted": "#7c7267",
        "--red-blood": "#8b0000",
        "--red-accent": "#c41e3a",
        "--red-glow": "rgba(196, 30, 58, 0.32)",
        "--gold": "#d4a846",
        "--gold-dim": "#8b6914",
        "--mist": "rgba(245, 240, 232, 0.05)",
        "--paper": "#f3ecdf"
      }
    },
    light: {
      id: "light",
      label: "Washi",
      tone: "Papel claro, tinta sóbria e dourado discreto.",
      group: "classic",
      preview: ["#f8f9fa", "#a16207", "#b91c1c"],
      tokens: {
        "--bg-deep": "#f8f9fa",
        "--bg-panel": "#ffffff",
        "--bg-card": "#ffffff",
        "--bg-input": "#f8f9fa",
        "--border-panel": "#e2e8f0",
        "--border-input": "#cbd5e1",
        "--border-focus": "#c41e3a",
        "--text-primary": "#1e293b",
        "--text-secondary": "#475569",
        "--text-muted": "#64748b",
        "--red-blood": "#991b1b",
        "--red-accent": "#b91c1c",
        "--red-glow": "rgba(185, 28, 28, 0.15)",
        "--gold": "#a16207",
        "--gold-dim": "#7c2d12",
        "--mist": "rgba(30, 41, 59, 0.04)",
        "--paper": "#fffaf0"
      }
    },
    sakura: {
      id: "sakura",
      label: "Sakura",
      tone: "Pétalas, seda clara e madeira rosada.",
      group: "classic",
      preview: ["#fff7f9", "#ffb7c5", "#e91e63"],
      tokens: {
        "--bg-deep": "#fff7f9",
        "--bg-panel": "#fdf2f4",
        "--bg-card": "#ffffff",
        "--bg-input": "#ffffff",
        "--border-panel": "#fadadd",
        "--border-input": "#ffd1dc",
        "--border-focus": "#e91e63",
        "--text-primary": "#5d4037",
        "--text-secondary": "#8d6e63",
        "--text-muted": "#bcaaa4",
        "--red-blood": "#c2185b",
        "--red-accent": "#e91e63",
        "--red-glow": "rgba(233, 30, 99, 0.2)",
        "--gold": "#ffb7c5",
        "--gold-dim": "#db7093",
        "--mist": "rgba(93, 64, 55, 0.05)",
        "--paper": "#fff9fb"
      }
    },
    stone: {
      id: "stone",
      label: "Stone",
      tone: "Pedra fria, aço e luar sobre muralhas.",
      group: "classic",
      preview: ["#0f172a", "#94a3b8", "#38bdf8"],
      tokens: {
        "--bg-deep": "#0f172a",
        "--bg-panel": "#1e293b",
        "--bg-card": "#334155",
        "--bg-input": "#0f172a",
        "--border-panel": "#475569",
        "--border-input": "#64748b",
        "--border-focus": "#38bdf8",
        "--text-primary": "#f8fafc",
        "--text-secondary": "#94a3b8",
        "--text-muted": "#64748b",
        "--red-blood": "#0ea5e9",
        "--red-accent": "#38bdf8",
        "--red-glow": "rgba(56, 189, 248, 0.2)",
        "--gold": "#94a3b8",
        "--gold-dim": "#64748b",
        "--mist": "rgba(248, 250, 252, 0.06)",
        "--paper": "#e2e8f0"
      }
    },
    "neon-green": {
      id: "neon-green",
      label: "Venenoso",
      tone: "Kegare vivo e brilho proibido.",
      group: "experimental",
      preview: ["#050805", "#39ff14", "#ccff00"],
      tokens: {
        "--bg-deep": "#050805",
        "--bg-panel": "#0a120a",
        "--bg-card": "#0d170d",
        "--bg-input": "#081008",
        "--border-panel": "#1a3a1a",
        "--border-input": "#245824",
        "--border-focus": "#39ff14",
        "--text-primary": "#e0ffe0",
        "--text-secondary": "#b2ddb2",
        "--text-muted": "#7ca57c",
        "--red-blood": "#00ff41",
        "--red-accent": "#39ff14",
        "--red-glow": "rgba(57, 255, 20, 0.22)",
        "--gold": "#ccff00",
        "--gold-dim": "#86b300",
        "--mist": "rgba(57, 255, 20, 0.06)",
        "--paper": "#f0fff0"
      }
    },
    "neon-yellow": {
      id: "neon-yellow",
      label: "Dourado",
      tone: "Relíquias, tempo e lampejo ritual.",
      group: "experimental",
      preview: ["#080802", "#ffff00", "#ffd700"],
      tokens: {
        "--bg-deep": "#080802",
        "--bg-panel": "#121205",
        "--bg-card": "#171708",
        "--bg-input": "#101004",
        "--border-panel": "#3a3a1a",
        "--border-input": "#58582a",
        "--border-focus": "#ffff00",
        "--text-primary": "#ffffe0",
        "--text-secondary": "#dad7a2",
        "--text-muted": "#a7a46a",
        "--red-blood": "#ffea00",
        "--red-accent": "#ffff00",
        "--red-glow": "rgba(255, 215, 0, 0.22)",
        "--gold": "#ffd700",
        "--gold-dim": "#b8860b",
        "--mist": "rgba(255, 215, 0, 0.06)",
        "--paper": "#fffceb"
      }
    },
    "neon-red": {
      id: "neon-red",
      label: "Sengoku",
      tone: "Sangue, aço e brasas em vigília.",
      group: "experimental",
      preview: ["#0a0202", "#ff003c", "#ff4d00"],
      tokens: {
        "--bg-deep": "#0a0202",
        "--bg-panel": "#1a0505",
        "--bg-card": "#220909",
        "--bg-input": "#140404",
        "--border-panel": "#4a1a1a",
        "--border-input": "#6a2626",
        "--border-focus": "#ff003c",
        "--text-primary": "#ffe0e5",
        "--text-secondary": "#d5a7b1",
        "--text-muted": "#a36a74",
        "--red-blood": "#8b0000",
        "--red-accent": "#ff003c",
        "--red-glow": "rgba(255, 0, 60, 0.28)",
        "--gold": "#ff4d00",
        "--gold-dim": "#b43a00",
        "--mist": "rgba(255, 0, 60, 0.05)",
        "--paper": "#fff0f2"
      }
    }
  };

  return {
    version: 1,
    defaultTheme: "dark",
    defaultSettings: {
      theme: "dark",
      textColor: "",
      fontFamily: "serif",
      fontSize: 100
    },
    themeOrder: [
      "dark",
      "light",
      "sakura",
      "stone",
      "neon-green",
      "neon-yellow",
      "neon-red"
    ],
    themes,
    fontFamilies: {
      serif: {
        id: "serif",
        label: "Com serifa",
        body: "'Noto Serif JP', serif",
        display: "'Noto Serif JP', serif"
      },
      sans: {
        id: "sans",
        label: "Sem serifa",
        body: "'Inter', sans-serif",
        display: "'Inter', sans-serif"
      }
    },
    textColors: [
      { id: "paper", label: "Marfim", value: "#F5F0E8" },
      { id: "white", label: "Branco", value: "#FFFFFF" },
      { id: "mist", label: "Névoa", value: "#E0FFE0" },
      { id: "moon", label: "Lua", value: "#FFFFE0" },
      { id: "default", label: "Padrão", value: "" }
    ]
  };
});


