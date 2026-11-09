"use client";

import { useEffect } from "react";
import useThemeStore from "@/store/themeStore";

export function useTheme() {
  const { initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return {
    theme: "dark",
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: true,
  };
}

