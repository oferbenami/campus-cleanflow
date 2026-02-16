import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import he from "./he.json";
import en from "./en.json";

type Locale = "he" | "en";

const translations: Record<Locale, Record<string, any>> = { he, en };

interface I18nContextType {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: any, path: string): string {
  return path.split(".").reduce((acc, part) => acc?.[part], obj) ?? path;
}

export function I18nProvider({ children, defaultLocale = "he" }: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const dir = locale === "he" ? "rtl" : "ltr";

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations[locale], key);
      if (typeof value !== "string") return key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, String(v));
        });
      }
      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, t }}>
      <div dir={dir} className={locale === "he" ? "font-sans" : "font-sans"}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
