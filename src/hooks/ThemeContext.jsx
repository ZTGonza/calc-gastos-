/** Contexto compartido y hook de lectura de la apariencia actual. */
import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

/** Hook público para consultar o cambiar la apariencia desde cualquier componente. */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe utilizarse dentro de ThemeProvider.");
  return context;
}
