/**
 * SERVICIO DE BILLETERA Y SALDO
 * Calcula el dinero disponible sumando saldo inicial e importes firmados de los
 * movimientos asociados a la única billetera personal.
 */
import { storageService } from "./storageService.js";
import { PERSONAL_ACCOUNT_ID } from "../domain/constants.js";
import { toMinorUnits } from "../domain/money.js";

/** Devuelve la billetera única; el fallback facilita leer datos heredados durante la migración. */
export function getPersonalAccount(state = storageService.getState()) {
  return state.accounts.find((account) => account.id === PERSONAL_ACCOUNT_ID) || state.accounts[0];
}

/** FUNCIÓN FUNDAMENTAL DEL SALDO: saldo inicial + suma de movimientos firmados de la billetera personal. */
export function getAccountBalance(_accountId, state = storageService.getState()) {
  const account = getPersonalAccount(state);
  if (!account) return 0;
  return account.initialBalanceMinor + state.transactions.reduce((total, transaction) => {
    const entry = transaction.entries?.find((item) => item.accountId === account.id);
    return total + (entry?.amountMinor || 0);
  }, 0);
}

/** Actualiza el saldo de partida; los movimientos existentes se conservan y se recalculan sobre este valor. */
export function updateInitialBalance(amount, date) {
  const initialBalanceMinor = toMinorUnits(amount);
  return storageService.updateState((state) => {
    const account = getPersonalAccount(state);
    if (!account) throw new Error("No se encontró la billetera personal.");
    return {
      ...state,
      profile: { ...state.profile, initialBalance: initialBalanceMinor, initialBalanceDate: date },
      accounts: state.accounts.map((item) => item.id === account.id ? { ...item, initialBalanceMinor } : item),
    };
  });
}

export function listAccounts() {
  const account = getPersonalAccount();
  return account ? [account] : [];
}
