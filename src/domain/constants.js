/**
 * CONSTANTES DEL DOMINIO
 * Centraliza las claves de almacenamiento, versión del esquema, billetera única,
 * moneda admitida y valores iniciales. Cambiar aquí evita duplicar reglas globales.
 */
export const STORAGE_KEY = "calc_gastos_data";
export const STORAGE_VERSION = 2;
export const PERSONAL_ACCOUNT_ID = "personal-wallet-cop";
export const SUPPORTED_CURRENCIES = ["COP"];

export const DEFAULT_SETTINGS = {
  currency: "COP",
  language: "es-CO",
  theme: "dark",
  timezone: "America/Bogota",
};

export const DEFAULT_CATEGORIES = [
  { id: "cat-income-general", name: "Ingresos", type: "INCOME", color: "#22c55e", isDefault: true, active: true },
  { id: "cat-food", name: "Alimentación", type: "EXPENSE", color: "#f59e0b", isDefault: true, active: true },
  { id: "cat-transport", name: "Transporte", type: "EXPENSE", color: "#38bdf8", isDefault: true, active: true },
  { id: "cat-housing", name: "Vivienda", type: "EXPENSE", color: "#a78bfa", isDefault: true, active: true },
  { id: "cat-entertainment", name: "Entretenimiento", type: "EXPENSE", color: "#f472b6", isDefault: true, active: true },
  { id: "cat-health", name: "Salud", type: "EXPENSE", color: "#fb7185", isDefault: true, active: true },
  { id: "cat-other", name: "Otros", type: "EXPENSE", color: "#94a3b8", isDefault: true, active: true },
];
