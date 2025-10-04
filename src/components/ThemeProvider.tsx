"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Mode = "light" | "dark" | "system";
const LS_KEY = "cc-theme";

export default function ThemeProvider() {
  const sp = useSearchParams();

  useEffect(() => {
    const prefers = window.matchMedia("(prefers-color-scheme: dark)");
    const fromUrl = (sp.get("theme") as Mode | null) ?? null;
    const saved = (localStorage.getItem(LS_KEY) as Mode | null) ?? null;

    const apply = (mode: Mode) => {
      const el = document.documentElement;
      const resolved: Exclude<Mode, "system"> =
        mode === "system" ? (prefers.matches ? "dark" : "light") : mode;

      // set data-theme attribute
      el.setAttribute("data-theme", resolved);

      // set CSS color-scheme without using `any`
      el.style.setProperty("color-scheme", resolved);
    };

    const mode: Mode = fromUrl ?? saved ?? "system";
    apply(mode);
    if (fromUrl) localStorage.setItem(LS_KEY, mode);

    const onChange = () => {
      const current = (localStorage.getItem(LS_KEY) as Mode) ?? "system";
      if (current === "system") apply("system");
    };
    prefers.addEventListener("change", onChange);
    return () => prefers.removeEventListener("change", onChange);
  }, [sp]);

  return null;
}
