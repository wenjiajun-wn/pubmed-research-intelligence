import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import chinese from "./zh.json";

export type Language = "en" | "zh";
type Values = Record<string, string | number>;
const STORAGE_KEY = "pubmed-language";
const translations: Record<string, string> = chinese;

function initialLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

const LanguageContext = createContext<{
  language: Language;
  toggleLanguage: () => void;
  t: (text: string, values?: Values) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title =
      language === "zh"
        ? "PubMed 科研文献智能分析"
        : "PubMed Research Intelligence";
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* Storage may be disabled; switching still works. */
    }
  }, [language]);
  const toggleLanguage = useCallback(
    () => setLanguage((current) => (current === "en" ? "zh" : "en")),
    [],
  );
  const t = useCallback(
    (text: string, values?: Values) => {
      const translated =
        language === "zh" ? (translations[text] ?? text) : text;
      return translated.replace(/\{(\w+)\}/g, (match, key: string) =>
        values?.[key] == null ? match : String(values[key]),
      );
    },
    [language],
  );
  const value = useMemo(
    () => ({ language, toggleLanguage, t }),
    [language, toggleLanguage, t],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required.");
  return context;
}
