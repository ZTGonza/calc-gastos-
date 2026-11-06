# Calc-Gastos 2.0 — Arquitectura Local-First

## Decisión de producto

Calc-Gastos es una aplicación de finanzas personales centrada en el control de ingresos y gastos. La arquitectura y la interfaz siguen estas restricciones:

- Una sola billetera personal.
- Una sola moneda: pesos colombianos (COP).
- Sin cuentas bancarias separadas ni transferencias internas.
- Sin presupuestos, metas, suscripciones, contabilidad o funciones empresariales en el alcance actual.
- Sin backend ni sincronización: los datos permanecen en el navegador.

## Capas

- `modules/`: pantallas de Inicio, Movimientos, Categorías, Estadísticas y Configuración.
- `services/`: reglas de negocio, validaciones y cálculos.
- `repositories/`: lectura y escritura del documento local.
- `domain/`: constantes, validación de fechas e importes COP.
- `tests/`: pruebas automatizadas con `node:test`.

Los componentes de React no acceden directamente a `localStorage`; utilizan `storageService`, que delega en `localStorageRepository`.

## Documento persistido

La clave es `calc_gastos_data`. El documento contiene:

- `schemaVersion`: versión del esquema.
- `profile`: preferencias, saldo inicial y fecha de inicio.
- `accounts`: una única billetera personal COP por compatibilidad interna con movimientos anteriores.
- `categories`: categorías de ingresos y gastos.
- `transactions`: movimientos de ingreso o gasto, con un único asiento asociado a la billetera personal.
- `legacy`: datos de versiones anteriores que se conservan archivados para evitar conversiones o pérdidas silenciosas.

## Reglas monetarias

- Los importes se guardan como pesos enteros (`amountMinor`).
- No se admiten USD ni EUR en la operación activa.
- No se hacen conversiones de moneda.
- El método de pago (efectivo o transferencia) es una etiqueta informativa y no crea cuentas o saldos separados.
- El saldo se calcula como saldo inicial + ingresos − gastos.
- Un gasto puede registrarse aunque el saldo calculado quede negativo; el registro de una operación real no debe bloquearse por una estimación del saldo.

## Migración desde la versión multi-cuenta

Al abrir una versión anterior:

1. Se suman los saldos iniciales de las cuentas COP y se consolidan en la billetera personal.
2. Los movimientos de ingreso y gasto asociados a cuentas COP se remapean a esa billetera.
3. Las cuentas y movimientos USD/EUR se guardan en `legacy` sin conversión.
4. Las transferencias internas se guardan en `legacy`, porque no representan ingreso ni gasto personal neto.
5. Los presupuestos, objetivos, aportes y reglas recurrentes anteriores se archivan dentro de `legacy.archivedModules` y dejan de mostrarse.

Se recomienda exportar un respaldo JSON desde la versión anterior antes de actualizar. Las claves antiguas no se eliminan automáticamente.

## Copias de seguridad

La aplicación permite exportar e importar JSON. Restaurar reemplaza los datos activos actuales y solicita confirmación. Los datos archivados por migración viajan dentro del respaldo. `localStorage` no sincroniza entre dispositivos y puede borrarse al limpiar los datos del navegador.

## Evolución técnica

`localStorage` es suficiente para el alcance inicial y volúmenes personales moderados. Si el tamaño o las necesidades offline lo justifican, se puede evaluar IndexedDB detrás del mismo repositorio. No se incorpora nube ni autenticación en esta etapa.
