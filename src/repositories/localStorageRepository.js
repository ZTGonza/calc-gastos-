/**
 * REPOSITORIO LOCAL (PERSISTENCIA)
 * Única capa que lee y escribe localStorage. También crea el estado inicial, migra
 * datos antiguos al modelo actual de billetera personal COP y gestiona respaldos.
 * No colocar reglas visuales ni lógica de componentes en este archivo.
 */
import { STORAGE_KEY, STORAGE_VERSION, DEFAULT_SETTINGS, DEFAULT_CATEGORIES, PERSONAL_ACCOUNT_ID } from "../domain/constants.js";

const isBrowser = () => typeof window !== "undefined" && Boolean(window.localStorage);
const readJson = (key, fallback) => {
  if (!isBrowser()) return fallback;
  try { const raw = window.localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch (error) { console.warn(`No se pudo leer ${key}.`, error); return fallback; }
};

/** FUNCIÓN FUNDAMENTAL: define la estructura mínima válida que tendrá una instalación nueva. */
function initialState() {
  const legacySubscriptions = readJson("suscripciones", []);
  const legacySalary = readJson("salario", null);
  return {
    schemaVersion: STORAGE_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: { settings: { ...DEFAULT_SETTINGS }, initialBalance: 0, initialBalanceDate: new Date().toISOString().slice(0, 10) },
    accounts: [{ id: PERSONAL_ACCOUNT_ID, name: "Mi dinero", type: "PERSONAL", currency: "COP", initialBalanceMinor: 0, active: true }],
    categories: DEFAULT_CATEGORIES.map((category) => ({ ...category })),
    transactions: [],
    legacy: { archivedForeignAccounts: [], archivedForeignTransactions: [], archivedTransfers: [], archivedModules: { legacySubscriptions: Array.isArray(legacySubscriptions) ? legacySubscriptions : [], legacySalary: Number.isFinite(Number(legacySalary)) ? Number(legacySalary) : null } },
  };
}

/** FUNCIÓN FUNDAMENTAL DE MIGRACIÓN: adapta datos de versiones anteriores al modelo actual de una sola billetera COP. Los datos incompatibles se archivan en legacy en vez de mezclarlos. */
function migrateToPersonalCop(raw) {
  const base = initialState();
  if (!raw || typeof raw !== "object") return base;
  if (raw.schemaVersion >= STORAGE_VERSION && raw.profile?.settings?.currency === "COP" && raw.accounts?.length === 1) {
    return {
      ...base, ...raw,
      profile: { ...base.profile, ...(raw.profile || {}), settings: { ...DEFAULT_SETTINGS, ...(raw.profile?.settings || {}), currency: "COP" } },
      accounts: [{ ...base.accounts[0], ...(raw.accounts[0] || {}), id: PERSONAL_ACCOUNT_ID, currency: "COP", name: "Mi dinero", active: true }],
      categories: Array.isArray(raw.categories) ? raw.categories : base.categories,
      transactions: Array.isArray(raw.transactions) ? raw.transactions.filter((item) => ["INCOME", "EXPENSE"].includes(item.type)) : [],
      legacy: { ...base.legacy, ...(raw.legacy || {}) },
    };
  }

  const oldAccounts = Array.isArray(raw.accounts) ? raw.accounts : [];
  const copAccounts = oldAccounts.filter((account) => account.currency === "COP");
  const accountIds = new Set(copAccounts.map((account) => account.id));
  const initialBalance = copAccounts.reduce((sum, account) => sum + (Number(account.initialBalanceMinor) || 0), 0);
  const archivedForeignTransactions = [];
  const archivedTransfers = [];
  const transactions = [];

  for (const transaction of Array.isArray(raw.transactions) ? raw.transactions : []) {
    if (transaction.type === "TRANSFER") {
      archivedTransfers.push(transaction);
      continue;
    }
    const entries = Array.isArray(transaction.entries) ? transaction.entries : [];
    const entry = entries.find((item) => accountIds.has(item.accountId));
    const hasForeignEntry = entries.some((item) => !accountIds.has(item.accountId));
    if (!entry || hasForeignEntry) {
      archivedForeignTransactions.push(transaction);
      continue;
    }
    transactions.push({
      ...transaction,
      type: transaction.type,
      entries: [{ accountId: PERSONAL_ACCOUNT_ID, amountMinor: Number(entry.amountMinor) || 0 }],
      categoryId: transaction.categoryId || null,
    });
  }

  const archivedModules = {
    budgets: Array.isArray(raw.budgets) ? raw.budgets : [],
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    goalContributions: Array.isArray(raw.goalContributions) ? raw.goalContributions : [],
    recurringRules: Array.isArray(raw.recurringRules) ? raw.recurringRules : [],
    exchangeRates: Array.isArray(raw.exchangeRates) ? raw.exchangeRates : [],
  };

  return {
    ...base,
    createdAt: raw.createdAt || base.createdAt,
    profile: {
      ...base.profile,
      initialBalance: initialBalance,
      initialBalanceDate: raw.profile?.initialBalanceDate || base.profile.initialBalanceDate,
      settings: { ...DEFAULT_SETTINGS, ...(raw.profile?.settings || {}), currency: "COP" },
    },
    accounts: [{ ...base.accounts[0], initialBalanceMinor: initialBalance }],
    categories: Array.isArray(raw.categories) ? raw.categories : base.categories,
    transactions,
    legacy: {
      ...base.legacy,
      ...(raw.legacy || {}),
      archivedForeignAccounts: oldAccounts.filter((account) => account.currency !== "COP"),
      archivedForeignTransactions,
      archivedTransfers,
      archivedModules,
    },
  };
}

export const localStorageRepository = {
  /** Lee el almacenamiento, migra el esquema cuando hace falta y devuelve un estado compatible. */
  load() {
    if (!isBrowser()) return initialState();
    const stored = readJson(STORAGE_KEY, null);
    const state = migrateToPersonalCop(stored);
    if (!stored || stored.schemaVersion !== STORAGE_VERSION || stored.accounts?.length !== 1 || stored.profile?.settings?.currency !== "COP") this.save(state);
    return state;
  },
  /** FUNCIÓN FUNDAMENTAL DE PERSISTENCIA: serializa el estado y gestiona errores/cuota de localStorage. */
  save(state) {
    if (!isBrowser()) return { ok: false, error: new Error("El almacenamiento local no está disponible.") };
    try {
      const next = { ...state, schemaVersion: STORAGE_VERSION, updatedAt: new Date().toISOString() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return { ok: true, data: next };
    } catch (error) {
      const quota = error?.name === "QuotaExceededError";
      return { ok: false, error: new Error(quota ? "El almacenamiento está lleno. Exporta un respaldo y libera espacio." : "No se pudieron guardar los datos.") };
    }
  },
  exportBackup() { return JSON.stringify({ app: "Calc-Gastos", exportedAt: new Date().toISOString(), data: this.load() }, null, 2); },
  /** Valida un respaldo externo, migra su estructura y solo entonces reemplaza el estado local. */
  importBackup(json) {
    let parsed;
    try { parsed = JSON.parse(json); } catch { throw new Error("El archivo no contiene JSON válido."); }
    const candidate = parsed?.data ?? parsed;
    if (!candidate || typeof candidate !== "object" || !Array.isArray(candidate.transactions)) throw new Error("El respaldo no tiene una estructura válida de Calc-Gastos.");
    const migrated = migrateToPersonalCop(candidate);
    const result = this.save(migrated);
    if (!result.ok) throw result.error;
    return result.data;
  },
  clear() { if (isBrowser()) window.localStorage.removeItem(STORAGE_KEY); },
};
