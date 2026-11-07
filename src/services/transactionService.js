/**
 * SERVICIO DE MOVIMIENTOS — NÚCLEO DEL PROGRAMA
 *
 * Construye, valida, crea, edita, consulta y elimina
 * ingresos y gastos.
 *
 * También administra la generación automática
 * de gastos semanales y mensuales.
 */

import { storageService } from "./storageService.js";

import {
  PERSONAL_ACCOUNT_ID,
} from "../domain/constants.js";

import { toMinorUnits } from "../domain/money.js";

import {
  assertDate,
  assertNonEmpty,
} from "../domain/validators.js";

let recurrenceRevision = 0;
const recurrenceSubscribers = new Set();

export function subscribeToRecurringExpenses(listener) {
  recurrenceSubscribers.add(listener);

  return () => {
    recurrenceSubscribers.delete(listener);
  };
}

export function getRecurrenceRevision() {
  return recurrenceRevision;
}

/**
 * Devuelve la fecha local actual sin depender de UTC.
 */
function getTodayLocal() {
  const now = new Date();

  return new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * FUNCIÓN FUNDAMENTAL:
 *
 * Valida y construye el objeto definitivo que se guarda
 * en el historial de movimientos.
 */
function buildTransaction(state, input, previous = null) {
  assertNonEmpty(input.description, "La descripción");

  assertDate(input.date);

  const amountMinor = toMinorUnits(input.amount);

  if (amountMinor <= 0) {
    throw new Error("El importe debe ser mayor que cero.");
  }

  if (!["INCOME", "EXPENSE"].includes(input.type)) {
    throw new Error(
      "Solo puedes registrar ingresos y gastos."
    );
  }

  const category = state.categories.find(
    (item) =>
      item.id === input.categoryId &&
      item.active !== false
  );

  if (!category || category.type !== input.type) {
    throw new Error(
      "Selecciona una categoría válida para este movimiento."
    );
  }

  // Los gastos se guardan con valor negativo.
  // Los ingresos se guardan con valor positivo.
  const signedAmount =
    input.type === "INCOME"
      ? amountMinor
      : -amountMinor;

  const now = new Date().toISOString();

  return {
    id: previous?.id || crypto.randomUUID(),

    type: input.type,

    description: input.description.trim(),

    date: input.date,

    categoryId: input.categoryId,

    paymentMethod: ["CASH", "TRANSFER"].includes(
      input.paymentMethod
    )
      ? input.paymentMethod
      : "CASH",

    notes: input.notes?.trim() || "",

    entries: [
      {
        accountId: PERSONAL_ACCOUNT_ID,
        amountMinor: signedAmount,
      },
    ],

    createdAt: previous?.createdAt || now,

    updatedAt: now,
  };
}

/**
 * Registra un movimiento único.
 *
 * Se utiliza para ingresos y gastos con frecuencia ONCE.
 */
export function createTransaction(input) {
  let created;

  storageService.updateState((state) => {
    created = buildTransaction(state, input);

    return {
      ...state,
      transactions: [
        ...state.transactions,
        created,
      ],
    };
  });

  return created;
}

/**
 * Calcula una fecha de ocurrencia.
 *
 * WEEKLY:
 * Suma siete días por cada ocurrencia.
 *
 * MONTHLY:
 * Conserva el día original y ajusta la fecha
 * cuando el mes tiene menos días.
 *
 * Ejemplo:
 * 31 de enero → 28 de febrero → 31 de marzo.
 */
function getOccurrenceDate(
  startDate,
  frequency,
  occurrenceNumber
) {
  const [year, month, day] = startDate
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  if (frequency === "WEEKLY") {
    date.setUTCDate(
      date.getUTCDate() + occurrenceNumber * 7
    );
  } else {
    const targetMonth =
      month - 1 + occurrenceNumber;

    const targetYear =
      year + Math.floor(targetMonth / 12);

    const normalizedMonth =
      ((targetMonth % 12) + 12) % 12;

    const lastDay = new Date(
      Date.UTC(
        targetYear,
        normalizedMonth + 1,
        0
      )
    ).getUTCDate();

    date.setUTCFullYear(
      targetYear,
      normalizedMonth,
      Math.min(day, lastDay)
    );
  }

  return date.toISOString().slice(0, 10);
}

/**
 * FUNCIÓN FUNDAMENTAL:
 *
 * Crea el primer gasto y su regla recurrente
 * dentro de una única operación de almacenamiento.
 *
 * Las recurrencias solo se permiten para gastos.
 */
export function createRecurringExpense(input) {
  if (input.type !== "EXPENSE") {
    throw new Error(
      "Solo los gastos pueden ser recurrentes."
    );
  }

  if (!["WEEKLY", "MONTHLY"].includes(input.frequency)) {
    throw new Error(
      "Selecciona una frecuencia semanal o mensual."
    );
  }

  let created;

  storageService.updateState((state) => {
    const amountMinor = toMinorUnits(input.amount);

    if (amountMinor <= 0) {
      throw new Error(
        "El importe debe ser mayor que cero."
      );
    }

    const ruleId = crypto.randomUUID();

    /**
     * Regla recurrente:
     *
     * Guarda los datos necesarios para generar
     * los próximos gastos automáticamente.
     */
    const rule = {
      id: ruleId,

      type: "EXPENSE",

      frequency: input.frequency,

      description: input.description.trim(),

      amountMinor,

      startDate: input.date,

      nextOccurrence: 1,

      nextDueDate: getOccurrenceDate(
        input.date,
        input.frequency,
        1
      ),

      categoryId: input.categoryId,

      paymentMethod: input.paymentMethod || "CASH",

      notes: input.notes?.trim() || "",

      active: true,

      createdAt: new Date().toISOString(),
    };

    /**
     * Registra la primera aparición inmediatamente.
     */
    created = {
      ...buildTransaction(state, input),

      recurringRuleId: ruleId,

      recurrenceDate: input.date,

      recurrenceFrequency: input.frequency,
    };

    return {
      ...state,

      transactions: [
        ...state.transactions,
        created,
      ],

      recurringRules: [
        ...(state.recurringRules || []),
        rule,
      ],
    };
  });

  return created;
}

/**
 * FUNCIÓN FUNDAMENTAL DE AUTOMATIZACIÓN:
 *
 * Revisa las reglas recurrentes y genera los gastos
 * cuya fecha de ocurrencia ya llegó.
 *
 * Se ejecuta al abrir la aplicación y cuando cambia
 * el día mientras permanece abierta.
 *
 * La combinación recurringRuleId + recurrenceDate
 * evita registrar dos veces el mismo gasto.
 */
export function processDueRecurringExpenses(
  today = getTodayLocal()
) {
  const snapshot = storageService.getState();

  const rules = Array.isArray(snapshot.recurringRules)
    ? snapshot.recurringRules
    : [];

  const hasDueRule = rules.some(
    (rule) =>
      rule.active &&
      rule.nextDueDate <= today
  );

  if (!hasDueRule) {
    return 0;
  }

  let generatedCount = 0;

  storageService.updateState((state) => {
    const transactions = [
      ...state.transactions,
    ];

    const recurringRules = (
      state.recurringRules || []
    ).map((originalRule) => {
      if (
        !originalRule.active ||
        originalRule.nextDueDate > today
      ) {
        return originalRule;
      }

      const rule = { ...originalRule };

      let safetyCounter = 0;

      /**
       * Genera todas las ocurrencias pendientes.
       *
       * El límite de seguridad evita un ciclo
       * excesivamente largo por datos corruptos.
       */
      while (
        rule.nextDueDate <= today &&
        safetyCounter < 600
      ) {
        const occurrenceDate = rule.nextDueDate;

        const alreadyGenerated = transactions.some(
          (item) =>
            item.recurringRuleId === rule.id &&
            item.recurrenceDate === occurrenceDate
        );

        if (!alreadyGenerated) {
          const generated = buildTransaction(
            state,
            {
              type: "EXPENSE",

              description: rule.description,

              amount: rule.amountMinor,

              date: occurrenceDate,

              categoryId: rule.categoryId,

              paymentMethod: rule.paymentMethod,

              notes: rule.notes,
            }
          );

          generated.recurringRuleId = rule.id;

          generated.recurrenceDate = occurrenceDate;

          generated.recurrenceFrequency =
            rule.frequency;

          transactions.push(generated);

          generatedCount += 1;
        }

        // Avanza hacia la siguiente ocurrencia.
        rule.nextOccurrence += 1;

        rule.nextDueDate = getOccurrenceDate(
          rule.startDate,
          rule.frequency,
          rule.nextOccurrence
        );

        safetyCounter += 1;
      }

      return rule;
    });

    return {
      ...state,
      transactions,
      recurringRules,
    };
  });

  if (generatedCount > 0) {
    recurrenceRevision += 1;
    recurrenceSubscribers.forEach((listener) => listener());
  }

  return generatedCount;
}

/**
 * Actualiza un movimiento normal.
 *
 * Los gastos que tienen una regla recurrente activa
 * deben eliminarse y registrarse nuevamente.
 */
export function updateTransaction(id, input) {
  let updated;

  storageService.updateState((state) => {
    const previous = state.transactions.find(
      (item) => item.id === id
    );

    if (!previous) {
      throw new Error(
        "El movimiento que intentas editar ya no existe."
      );
    }

    const hasActiveRule = (
      state.recurringRules || []
    ).some(
      (rule) => rule.id === previous.recurringRuleId
    );

    if (hasActiveRule) {
      throw new Error(
        "Para cambiar un gasto recurrente, elimínalo y registra uno nuevo."
      );
    }

    updated = buildTransaction(
      state,
      input,
      previous
    );

    return {
      ...state,

      transactions: state.transactions.map(
        (item) =>
          item.id === id
            ? updated
            : item
      ),
    };
  });

  return updated;
}

/**
 * Consulta los movimientos con filtros opcionales.
 *
 * Devuelve primero los registros más recientes.
 */
export function listTransactions({
  from,
  to,
  type,
  categoryId,
} = {}) {
  return storageService
    .getState()
    .transactions
    .filter((item) =>
      (!from || item.date >= from) &&
      (!to || item.date <= to) &&
      (!type || item.type === type) &&
      (!categoryId || item.categoryId === categoryId)
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.createdAt.localeCompare(a.createdAt)
    );
}

/**
 * FUNCIÓN FUNDAMENTAL DE ELIMINACIÓN:
 *
 * Elimina el movimiento seleccionado.
 *
 * Si pertenece a una recurrencia, también elimina
 * la regla para detener futuras apariciones.
 *
 * Las demás apariciones históricas se conservan.
 */
export function deleteTransaction(id) {
  return storageService.updateState((state) => {
    const transaction = state.transactions.find(
      (item) => item.id === id
    );

    if (!transaction) {
      throw new Error(
        "El movimiento ya no existe."
      );
    }

    return {
      ...state,

      transactions: state.transactions.filter(
        (item) => item.id !== id
      ),

      recurringRules: transaction.recurringRuleId
        ? (state.recurringRules || []).filter(
            (rule) =>
              rule.id !== transaction.recurringRuleId
          )
        : (state.recurringRules || []),
    };
  });
}