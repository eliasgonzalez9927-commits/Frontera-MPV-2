"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Theme = "dark" | "light";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem("frontera-theme") as Theme | null;
      setTheme(stored ?? getSystemTheme());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("frontera-theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
      }
      title={theme === "dark" ? "Modo noche activado" : "Modo claro activado"}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0A1D3A] shadow-lg shadow-black/20 transition hover:scale-105 print:hidden"
    >
      <Image
        src="/frontera-mark-white.svg"
        alt=""
        width={20}
        height={20}
        priority
      />
    </button>
  );
}
