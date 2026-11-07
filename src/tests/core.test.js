/**
 * PRUEBAS DE REGLAS PRINCIPALES
 * Verifica persistencia, saldo, movimientos, categorías, migraciones y respaldos.
 * Estas pruebas protegen los comportamientos esenciales del producto.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { installLocalStorageMock } from "./helpers.js";
import { storageService } from "../services/storageService.js";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  listTransactions,
} from "../services/transactionService.js";
import { createCategory, deleteCategory } from "../services/categoryService.js";
import {
  getAccountBalance,
  updateInitialBalance,
  updateMonthlyBaseSalary,
} from "../services/accountService.js";
import {
  formatMoney,
  toMinorUnits,
  formatThousandsInput,
  parseThousandsInput,
} from "../domain/money.js";
import { STORAGE_KEY, PERSONAL_ACCOUNT_ID } from "../domain/constants.js";

function reset() {
  const values = installLocalStorageMock();
  storageService.getState();
  return values;
}

const expense = (overrides = {}) => ({
  type: "EXPENSE",
  description: "Almuerzo",
  amount: 18000,
  date: "2026-11-05",
  categoryId: "cat-food",
  paymentMethod: "CASH",
  ...overrides,
});
const income = (overrides = {}) => ({
  type: "INCOME",
  description: "Pago",
  amount: 100000,
  date: "2026-11-05",
  categoryId: "cat-income-general",
  paymentMethod: "TRANSFER",
  ...overrides,
});

test("la aplicación inicia con una sola billetera en COP", () => {
  reset();
  const state = storageService.getState();
  assert.equal(state.accounts.length, 1);
  assert.equal(state.accounts[0].id, PERSONAL_ACCOUNT_ID);
  assert.equal(state.accounts[0].currency, "COP");
});

test("registra ingresos y gastos y calcula el saldo personal", () => {
  reset();
  updateInitialBalance(50000, "2026-11-01");
  createTransaction(income());
  createTransaction(expense());
  assert.equal(getAccountBalance(), 132000);
  assert.equal(listTransactions().length, 2);
});

test("permite registrar un gasto aunque el saldo calculado quede negativo", () => {
  reset();
  createTransaction(expense({ amount: 250000 }));
  assert.equal(getAccountBalance(), -250000);
});

test("editar un movimiento reemplaza el registro y recalcula el saldo", () => {
  reset();
  const created = createTransaction(expense());
  updateTransaction(
    created.id,
    expense({ amount: 22000, description: "Almuerzo y bebida" }),
  );
  assert.equal(listTransactions().length, 1);
  assert.equal(getAccountBalance(), -22000);
});

test("eliminar un movimiento actualiza el saldo", () => {
  reset();
  const created = createTransaction(income());
  deleteTransaction(created.id);
  assert.equal(getAccountBalance(), 0);
});

test("categorías personalizadas no permiten duplicados ni eliminarse si tienen movimientos", () => {
  reset();
  const category = createCategory({
    name: "Mascotas",
    type: "EXPENSE",
    color: "#22c55e",
  });
  createTransaction(expense({ categoryId: category.id }));
  assert.throws(
    () => createCategory({ name: "mascotas", type: "EXPENSE" }),
    /Ya existe/,
  );
  assert.throws(() => deleteCategory(category.id), /movimientos asociados/);
});

test("COP se maneja como pesos enteros y se formatea correctamente", () => {
  assert.equal(toMinorUnits("12000"), 12000);
  assert.equal(formatMoney(12000).includes("12.000"), true);
  assert.throws(() => toMinorUnits(-1));
});

test("migra datos anteriores a una sola billetera COP y archiva monedas y transferencias sin convertirlas", () => {
  const values = reset();
  values.set(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: 1,
      profile: { settings: { baseCurrency: "USD" } },
      accounts: [
        {
          id: "cash",
          name: "Efectivo",
          currency: "COP",
          initialBalanceMinor: 100000,
          active: true,
        },
        {
          id: "bank",
          name: "Banco",
          currency: "COP",
          initialBalanceMinor: 50000,
          active: true,
        },
        {
          id: "usd",
          name: "USD",
          currency: "USD",
          initialBalanceMinor: 10000,
          active: true,
        },
      ],
      categories: storageService.getState().categories,
      transactions: [
        {
          id: "cop-expense",
          type: "EXPENSE",
          description: "Mercado",
          date: "2026-11-01",
          categoryId: "cat-food",
          entries: [{ accountId: "cash", amountMinor: -12000 }],
          createdAt: "2026-11-01T10:00:00.000Z",
        },
        {
          id: "usd-income",
          type: "INCOME",
          description: "USD",
          date: "2026-11-01",
          categoryId: "cat-income-general",
          entries: [{ accountId: "usd", amountMinor: 10000 }],
          createdAt: "2026-11-01T10:00:00.000Z",
        },
        {
          id: "transfer",
          type: "TRANSFER",
          description: "Mover",
          date: "2026-11-01",
          entries: [
            { accountId: "cash", amountMinor: -5000 },
            { accountId: "bank", amountMinor: 5000 },
          ],
          createdAt: "2026-11-01T10:00:00.000Z",
        },
      ],
      budgets: [{ id: "b1" }],
      goals: [],
      goalContributions: [],
      recurringRules: [],
      exchangeRates: [],
    }),
  );
  const migrated = storageService.getState();
  assert.equal(migrated.accounts.length, 1);
  assert.equal(migrated.accounts[0].initialBalanceMinor, 150000);
  assert.equal(migrated.transactions.length, 1);
  assert.equal(
    migrated.transactions[0].entries[0].accountId,
    PERSONAL_ACCOUNT_ID,
  );
  assert.equal(migrated.legacy.archivedForeignAccounts.length, 1);
  assert.equal(migrated.legacy.archivedForeignTransactions.length, 1);
  assert.equal(migrated.legacy.archivedTransfers.length, 1);
  assert.equal(migrated.legacy.archivedModules.budgets.length, 1);
});

test("respaldo exportado puede restaurarse sin perder el modelo personal COP", () => {
  reset();
  createTransaction(income());
  const backup = storageService.exportBackup();
  storageService.updateState((state) => ({ ...state, transactions: [] }));
  storageService.importBackup(backup);
  assert.equal(listTransactions().length, 1);
  assert.equal(storageService.getState().profile.settings.currency, "COP");
});

test("rechaza tipos de operación que no pertenecen al control personal de ingresos y gastos", () => {
  reset();
  assert.throws(
    () => createTransaction({ ...expense(), type: "TRANSFER" }),
    /Solo puedes registrar ingresos y gastos/,
  );
});

test("el campo de valor agrega puntos de miles y convierte el texto al importe correcto", () => {
  assert.equal(formatThousandsInput("10000"), "10.000");
  assert.equal(formatThousandsInput("1234567"), "1.234.567");
  assert.equal(formatThousandsInput("$ 1.234.567"), "1.234.567");
  assert.equal(parseThousandsInput("10.000"), 10000);
  assert.equal(parseThousandsInput("1.234.567"), 1234567);
  assert.equal(Number.isNaN(parseThousandsInput("")), true);
});

test("guarda el salario base mensual en el perfil sin crear movimientos", () => {
  reset();

  updateMonthlyBaseSalary(2000000);

  const state = storageService.getState();

  assert.equal(state.profile.monthlyBaseSalaryMinor, 2000000);

  assert.equal(state.transactions.length, 0);
  assert.equal(getAccountBalance(), 0);
});
