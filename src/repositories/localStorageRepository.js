/**
 * REPOSITORIO LOCAL — PERSISTENCIA
 *
 * Única capa que lee y escribe localStorage.
 *
 * Responsabilidades:
 * - Crear el estado inicial.
 * - Recuperar los datos guardados.
 * - Migrar versiones anteriores.
 * - Guardar movimientos y recurrencias.
 * - Exportar e importar respaldos.
 */

import {
  STORAGE_KEY,
  STORAGE_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_CATEGORIES,
  PERSONAL_ACCOUNT_ID,
} from "../domain/constants.js";

/**
 * Comprueba que el navegador permita utilizar localStorage.
 */
const isBrowser = () =>
  typeof window !== "undefined" &&
  Boolean(window.localStorage);

/**
 * FUNCIÓN FUNDAMENTAL:
 * Recupera información del almacenamiento local.
 *
 * Si ocurre algún error, devuelve el valor alternativo
 * para evitar que la aplicación se interrumpa.
 */
const readJson = (key, fallback) => {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);

    return raw === null
      ? fallback
      : JSON.parse(raw);
  } catch (error) {
    console.warn(`No se pudo leer ${key}.`, error);
    return fallback;
  }
};

/**
 * Crea la estructura inicial de una instalación nueva.
 */
function initialState() {
  const legacySubscriptions = readJson(
    "suscripciones",
    []
  );

  const legacySalary = readJson(
    "salario",
    null
  );

  return {
    schemaVersion: STORAGE_VERSION,

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    profile: {
      settings: { ...DEFAULT_SETTINGS },
      initialBalance: 0,
      initialBalanceDate: new Date()
        .toISOString()
        .slice(0, 10),
    },

    accounts: [
      {
        id: PERSONAL_ACCOUNT_ID,
        name: "Mi dinero",
        type: "PERSONAL",
        currency: "COP",
        initialBalanceMinor: 0,
        active: true,
      },
    ],

    categories: DEFAULT_CATEGORIES.map(
      (category) => ({ ...category })
    ),

    transactions: [],

    // NUEVO: reglas que controlan los gastos recurrentes.
    recurringRules: [],

    legacy: {
      archivedForeignAccounts: [],
      archivedForeignTransactions: [],
      archivedTransfers: [],

      archivedModules: {
        legacySubscriptions: Array.isArray(
          legacySubscriptions
        )
          ? legacySubscriptions
          : [],

        legacySalary: Number.isFinite(
          Number(legacySalary)
        )
          ? Number(legacySalary)
          : null,
      },
    },
  };
}

/**
 * FUNCIÓN FUNDAMENTAL DE MIGRACIÓN:
 *
 * Adapta los datos antiguos al modelo actual de una
 * sola billetera personal en pesos colombianos.
 *
 * Conserva los movimientos existentes y agrega
 * recurringRules cuando todavía no existe.
 */
function migrateToPersonalCop(raw) {
  const base = initialState();

  if (!raw || typeof raw !== "object") {
    return base;
  }

  /**
   * Datos que ya utilizan una sola billetera COP.
   *
   * Aquí también se migran instalaciones de la versión 2
   * que todavía no tenían el campo recurringRules.
   */
  if (
    raw.schemaVersion >= 2 &&
    raw.profile?.settings?.currency === "COP" &&
    raw.accounts?.length === 1
  ) {
    return {
      ...base,
      ...raw,

      profile: {
        ...base.profile,
        ...(raw.profile || {}),

        settings: {
          ...DEFAULT_SETTINGS,
          ...(raw.profile?.settings || {}),
          currency: "COP",
        },
      },

      accounts: [
        {
          ...base.accounts[0],
          ...(raw.accounts[0] || {}),
          id: PERSONAL_ACCOUNT_ID,
          currency: "COP",
          name: "Mi dinero",
          active: true,
        },
      ],

      categories: Array.isArray(raw.categories)
        ? raw.categories
        : base.categories,

      transactions: Array.isArray(raw.transactions)
        ? raw.transactions.filter((item) =>
            ["INCOME", "EXPENSE"].includes(item.type)
          )
        : [],

      // Evita perder reglas cuando se recupera un respaldo.
      recurringRules: Array.isArray(raw.recurringRules)
        ? raw.recurringRules
        : [],

      legacy: {
        ...base.legacy,
        ...(raw.legacy || {}),
      },
    };
  }

  /**
   * Migración de instalaciones anteriores
   * que utilizaban múltiples cuentas.
   */
  const oldAccounts = Array.isArray(raw.accounts)
    ? raw.accounts
    : [];

  const copAccounts = oldAccounts.filter(
    (account) => account.currency === "COP"
  );

  const accountIds = new Set(
    copAccounts.map((account) => account.id)
  );

  const initialBalance = copAccounts.reduce(
    (sum, account) =>
      sum + (Number(account.initialBalanceMinor) || 0),
    0
  );

  const archivedForeignTransactions = [];
  const archivedTransfers = [];
  const transactions = [];

  for (const transaction of Array.isArray(raw.transactions)
    ? raw.transactions
    : []) {

    if (transaction.type === "TRANSFER") {
      archivedTransfers.push(transaction);
      continue;
    }

    const entries = Array.isArray(transaction.entries)
      ? transaction.entries
      : [];

    const entry = entries.find(
      (item) => accountIds.has(item.accountId)
    );

    const hasForeignEntry = entries.some(
      (item) => !accountIds.has(item.accountId)
    );

    if (!entry || hasForeignEntry) {
      archivedForeignTransactions.push(transaction);
      continue;
    }

    transactions.push({
      ...transaction,

      type: transaction.type,

      entries: [
        {
          accountId: PERSONAL_ACCOUNT_ID,
          amountMinor: Number(entry.amountMinor) || 0,
        },
      ],

      categoryId: transaction.categoryId || null,
    });
  }

  const archivedModules = {
    budgets: Array.isArray(raw.budgets)
      ? raw.budgets
      : [],

    goals: Array.isArray(raw.goals)
      ? raw.goals
      : [],

    goalContributions: Array.isArray(
      raw.goalContributions
    )
      ? raw.goalContributions
      : [],

    recurringRules: Array.isArray(raw.recurringRules)
      ? raw.recurringRules
      : [],

    exchangeRates: Array.isArray(raw.exchangeRates)
      ? raw.exchangeRates
      : [],
  };

  return {
    ...base,

    createdAt: raw.createdAt || base.createdAt,

    profile: {
      ...base.profile,

      initialBalance,

      initialBalanceDate:
        raw.profile?.initialBalanceDate ||
        base.profile.initialBalanceDate,

      settings: {
        ...DEFAULT_SETTINGS,
        ...(raw.profile?.settings || {}),
        currency: "COP",
      },
    },

    accounts: [
      {
        ...base.accounts[0],
        initialBalanceMinor: initialBalance,
      },
    ],

    categories: Array.isArray(raw.categories)
      ? raw.categories
      : base.categories,

    transactions,

    legacy: {
      ...base.legacy,
      ...(raw.legacy || {}),

      archivedForeignAccounts: oldAccounts.filter(
        (account) => account.currency !== "COP"
      ),

      archivedForeignTransactions,
      archivedTransfers,
      archivedModules,
    },
  };
}

/**
 * API pública del repositorio.
 *
 * Los demás servicios utilizan estos métodos
 * para interactuar con el almacenamiento.
 */
export const localStorageRepository = {

  /**
   * Recupera y normaliza el estado de la aplicación.
   *
   * Si detecta una versión anterior, guarda
   * automáticamente la estructura actualizada.
   */
  load() {
    if (!isBrowser()) {
      return initialState();
    }

    const stored = readJson(STORAGE_KEY, null);

    const state = migrateToPersonalCop(stored);

    const needsMigration =
      !stored ||
      stored.schemaVersion !== STORAGE_VERSION ||
      stored.accounts?.length !== 1 ||
      stored.profile?.settings?.currency !== "COP" ||
      !Array.isArray(stored.recurringRules);

    if (needsMigration) {
      this.save(state);
    }

    return state;
  },

  /**
   * FUNCIÓN FUNDAMENTAL DE PERSISTENCIA:
   *
   * Convierte el estado a JSON y lo guarda
   * en el almacenamiento local del navegador.
   */
  save(state) {
    if (!isBrowser()) {
      return {
        ok: false,
        error: new Error(
          "El almacenamiento local no está disponible."
        ),
      };
    }

    try {
      const next = {
        ...state,
        schemaVersion: STORAGE_VERSION,
        updatedAt: new Date().toISOString(),
      };

      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
      );

      return {
        ok: true,
        data: next,
      };
    } catch (error) {
      const quota =
        error?.name === "QuotaExceededError";

      return {
        ok: false,

        error: new Error(
          quota
            ? "El almacenamiento está lleno. Exporta un respaldo y libera espacio."
            : "No se pudieron guardar los datos."
        ),
      };
    }
  },

  /**
   * Genera un respaldo completo.
   *
   * Incluye tanto los movimientos como las reglas
   * de recurrencia activas.
   */
  exportBackup() {
    return JSON.stringify(
      {
        app: "Calc-Gastos",
        exportedAt: new Date().toISOString(),
        data: this.load(),
      },
      null,
      2
    );
  },

  /**
   * Valida un respaldo externo antes de reemplazar
   * los datos almacenados localmente.
   */
  importBackup(json) {
    let parsed;

    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error(
        "El archivo no contiene JSON válido."
      );
    }

    const candidate = parsed?.data ?? parsed;

    if (
      !candidate ||
      typeof candidate !== "object" ||
      !Array.isArray(candidate.transactions)
    ) {
      throw new Error(
        "El respaldo no tiene una estructura válida de Calc-Gastos."
      );
    }

    const migrated = migrateToPersonalCop(candidate);

    const result = this.save(migrated);

    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  },

  /**
   * Limpia todos los datos locales.
   */
  clear() {
    if (isBrowser()) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },
};