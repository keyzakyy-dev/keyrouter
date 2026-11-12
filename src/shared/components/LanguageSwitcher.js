"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_COOKIE, normalizeLocale } from "@/i18n/config";
import { reloadTranslations } from "@/i18n/runtime";

function getLocaleFromCookie() {
  if (typeof document === "undefined") return "en";
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${LOCALE_COOKIE}=`));
  const value = cookie ? decodeURIComponent(cookie.split("=")[1]) : "en";
  return normalizeLocale(value);
}

// Locale display names and flags - will be translated by runtime i18n
const getLocaleInfo = (locale) => {
  const locales = {
    "en": { name: "English", flag: "🇺🇸" },
    "vi": { name: "Tiếng Việt", flag: "🇻🇳" },
    "zh-CN": { name: "简体中文", flag: "🇨🇳" },
    "zh-TW": { name: "繁體中文", flag: "🇹🇼" },
    "ja": { name: "日本語", flag: "🇯🇵" },
    "pt-BR": { name: "Português (Brasil)", flag: "🇧🇷" },
    "pt-PT": { name: "Português (Portugal)", flag: "🇵🇹" },
    "ko": { name: "한국어", flag: "🇰🇷" },
    "es": { name: "Español", flag: "🇪🇸" },
    "de": { name: "Deutsch", flag: "🇩🇪" },
    "fr": { name: "Français", flag: "🇫🇷" },
    "he": { name: "עברית", flag: "🇮🇱" },
    "ar": { name: "العربية", flag: "🇸🇦" },
    "ru": { name: "Русский", flag: "🇷🇺" },
    "pl": { name: "Polski", flag: "🇵🇱" },
    "cs": { name: "Čeština", flag: "🇨🇿" },
    "nl": { name: "Nederlands", flag: "🇳🇱" },
    "tr": { name: "Türkçe", flag: "🇹🇷" },
    "uk": { name: "Українська", flag: "🇺🇦" },
    "tl": { name: "Tagalog", flag: "🇵🇭" },
    "id": { name: "Indonesia", flag: "🇮🇩" },
    "th": { name: "ไทย", flag: "🇹🇭" },
    "km": { name: "ខ្មែរ", flag: "🇰🇭" },
    "hi": { name: "हिन्दी", flag: "🇮🇳" },
    "bn": { name: "বাংলা", flag: "🇧🇩" },
    "ur": { name: "اردو", flag: "🇵🇰" },
    "ro": { name: "Română", flag: "🇷🇴" },
    "sv": { name: "Svenska", flag: "🇸🇪" },
    "it": { name: "Italiano", flag: "🇮🇹" },
    "el": { name: "Ελληνικά", flag: "🇬🇷" },
    "hu": { name: "Magyar", flag: "🇭🇺" },
    "fi": { name: "Suomi", flag: "🇫🇮" },
    "da": { name: "Dansk", flag: "🇩🇰" },
    "no": { name: "Norsk", flag: "🇳🇴" },
    "fa": { name: "فارسی", flag: "🇮🇷" }
  };
  return locales[locale] || { name: locale, flag: "🌐" };
};

// Font family for scripts that aren't covered by the base system font stack.
// Self-hosted Noto subsets live in /fonts/*.ttf (see globals.css @font-face).
const LOCALE_FONT = {
  "zh-CN": '"Locale CJK SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif',
  "zh-TW": '"Locale CJK TC", "PingFang TC", "Microsoft JhengHei", "Noto Sans CJK TC", system-ui, sans-serif',
  ja: '"Locale CJK JP", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif',
  ko: '"Locale Hangul", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif',
  he: '"Locale Hebrew", "Noto Sans Hebrew", system-ui, sans-serif',
  ar: '"Locale Arabic", "Noto Sans Arabic", system-ui, sans-serif',
  ur: '"Locale Arabic", "Noto Sans Arabic", system-ui, sans-serif',
  fa: '"Locale Arabic", "Noto Sans Arabic", system-ui, sans-serif',
  th: '"Locale Thai", "Noto Sans Thai", system-ui, sans-serif',
  km: '"Locale Khmer", "Noto Sans Khmer", system-ui, sans-serif',
  hi: '"Locale Devanagari", "Noto Sans Devanagari", system-ui, sans-serif',
  bn: '"Locale Bengali", "Noto Sans Bengali", system-ui, sans-serif',
};

export default function LanguageSwitcher({ className = "", isOpen: controlledOpen, onClose, hideTrigger = false }) {
  const [locale, setLocale] = useState("en");
  const [isPending, setIsPending] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const modalRef = useRef(null);

  const isControlled = typeof controlledOpen === "boolean";
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (value, nextLocale = locale) => {
    if (isControlled) {
      if (!value && onClose) onClose(nextLocale);
    } else {
      setInternalOpen(value);
    }
  };

  useEffect(() => {
    setLocale(getLocaleFromCookie());
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSetLocale = async (nextLocale) => {
    if (nextLocale === locale || isPending) return;

    setIsPending(true);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      
      // Reload translations without full page reload
      await reloadTranslations();
      setLocale(nextLocale);
      setIsOpen(false, nextLocale);
    } catch (err) {
      console.error("Failed to set locale:", err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={className}>
      {/* Trigger button */}
      {!hideTrigger && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-text-main hover:bg-surface/60 transition-colors"
          title="Language"
          data-i18n-skip="true"
        >
          <span className="material-symbols-outlined text-[20px]">language</span>
          <span className="text-sm font-medium">{getLocaleInfo(locale).name}</span>
          <span className="text-lg">{getLocaleInfo(locale).flag}</span>
        </button>
      )}

      {/* Portal modal - renders at document.body to avoid parent layout constraints */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-i18n-skip="true">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px] fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal content */}
          <div
            ref={modalRef}
            className="relative w-full bg-surface border border-border-subtle rounded-xl shadow-[var(--shadow-elev)] fade-in max-w-xl flex flex-col max-h-[70vh]"
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h2 className="font-display text-sm font-semibold text-text-main">Select Language</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-main transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal body - compact rows in auto-fill columns */}
            <div className="p-3 overflow-y-auto flex-1">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-1">
                {LOCALES.map((item) => {
                  const active = locale === item;
                  const info = getLocaleInfo(item);
                  return (
                    <button
                      key={item}
                      onClick={() => handleSetLocale(item)}
                      disabled={isPending}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors w-full ${
                        active
                          ? "bg-surface-2 text-text-main"
                          : "text-text-muted hover:bg-surface-2/60 hover:text-text-main"
                      } ${isPending ? "opacity-70 cursor-wait" : ""}`}
                      title={info.name}
                    >
                      <span className="text-base shrink-0">{info.flag}</span>
                      <span
                        className="min-w-0 flex-1 truncate text-[13px] font-medium leading-tight"
                        style={{
                          fontFamily:
                            LOCALE_FONT[item] ||
                            "ui-sans-serif, -apple-system, 'Segoe UI', system-ui, sans-serif",
                        }}
                      >
                        {info.name}
                      </span>
                      {active && (
                        <span className="material-symbols-outlined text-[16px] shrink-0 text-primary">check</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
