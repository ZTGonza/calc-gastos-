/**
 * SERVICIO DE RESPALDOS
 * Convierte el estado local en un archivo JSON descargable y delega la restauración
 * al servicio de almacenamiento, que valida y migra la información importada.
 */
import { storageService } from "./storageService.js";

/** Genera un archivo JSON descargable con una instantánea completa del estado local. */
export function downloadBackup() {
  const content = storageService.exportBackup();
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `calc-gastos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Lee el archivo seleccionado y delega la validación/importación al storageService. */
export async function restoreBackup(file) {
  if (!file) throw new Error("Selecciona un archivo de respaldo.");
  return storageService.importBackup(await file.text());
}
