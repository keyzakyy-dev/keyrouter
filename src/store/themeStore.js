"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEME_CONFIG } from "@/shared/constants/config";

const useThemeStore = create(
  persist(
    (set) => ({
      theme: "dark",

      setTheme: () => {
        set({ theme: "dark" });
        applyTheme();
      },

      toggleTheme: () => {
        set({ theme: "dark" });
        applyTheme();
      },

      initTheme: () => {
        applyTheme();
      },
    }),
    {
      name: THEME_CONFIG.storageKey,
    }
  )
);

// Apply theme to document (always dark)
function applyTheme() {
  if (typeof window === "undefined") return;
  document.documentElement.classList.add("dark");
}

export default useThemeStore;

