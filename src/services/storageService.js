/**
 * SERVICIO DE ESTADO
 * Fachada que permite a los demás servicios leer o actualizar el estado sin conocer
 * los detalles de localStorage. updateState centraliza la operación de lectura-modificación-guardado.
 */
import { localStorageRepository } from "../repositories/localStorageRepository.js";

export const storageService = {
  /** Obtiene el estado actual ya normalizado por el repositorio. */
  getState: () => localStorageRepository.load(),
  /** FUNCIÓN FUNDAMENTAL: patrón leer → clonar → modificar → guardar. Evita que componentes escriban directamente en localStorage. */
  updateState(updater) {
    const current = localStorageRepository.load();
    const next = updater(structuredClone(current));
    const result = localStorageRepository.save(next);
    if (!result.ok) throw result.error;
    return result.data;
  },
  /** Devuelve el respaldo JSON producido por el repositorio. */
  exportBackup: () => localStorageRepository.exportBackup(),
  /** Importa un respaldo; el repositorio comprueba su estructura antes de guardarlo. */
  importBackup: (json) => localStorageRepository.importBackup(json),
};
