# Criterios de aceptación — Calc-Gastos 2.0

## Identidad y alcance
- [x] Aplicación enfocada en finanzas personales.
- [x] Una sola billetera personal.
- [x] Únicamente pesos colombianos (COP).
- [x] Almacenamiento local, sin backend ni sincronización en nube.
- [x] La interfaz no incluye contabilidad, inventarios, facturación, nómina, CRM ni gestión empresarial.

## Funcionalidad
- [x] Registrar ingresos y gastos.
- [x] Editar y eliminar movimientos.
- [x] Asociar categorías y método de pago informativo.
- [x] Filtrar por periodo, tipo, categoría y texto.
- [x] Crear y administrar categorías personalizadas.
- [x] Consultar saldo inicial más ingresos menos gastos.
- [x] Consultar resumen mensual y últimos movimientos.
- [x] Consultar estadísticas por periodo y categoría.
- [x] Exportar movimientos a CSV.
- [x] Exportar y restaurar respaldos JSON.

## Integridad y migración
- [x] Guardar importes como pesos enteros.
- [x] Recalcular saldo desde saldo inicial y movimientos.
- [x] Permitir registrar un gasto aunque el saldo calculado sea negativo.
- [x] Mantener la categoría histórica referenciada por los movimientos.
- [x] Consolidar saldos iniciales de antiguas cuentas COP.
- [x] Conservar datos anteriores de USD/EUR y transferencias en el archivo local de legado, sin conversión ni mezcla.
- [x] Archivar presupuestos, objetivos y reglas recurrentes anteriores para que no formen parte del producto simplificado.

## Validación técnica realizada en este entorno
- [x] 10 pruebas automatizadas aprobadas.
- [x] 22 archivos JavaScript/JSX analizados sintácticamente.
- [x] Importaciones locales revisadas.
- [ ] Build de producción con Vite: pendiente de ejecutar después de instalar dependencias completas.
- [ ] Prueba visual en navegador y dispositivos: pendiente en el equipo del usuario.

## Prueba manual recomendada
1. Ejecutar `pnpm install`, `pnpm test` y `pnpm dev`.
2. Registrar un ingreso de $1.000.000 COP.
3. Registrar un gasto de $25.000 COP en Alimentación.
4. Confirmar que el saldo aumentó/disminuyó correctamente.
5. Editar el gasto a $30.000 y confirmar que no se duplicó.
6. Eliminarlo y confirmar que el saldo se recalculó.
7. Crear una categoría personalizada y utilizarla en un movimiento.
8. Abrir Estadísticas, filtrar fechas y exportar CSV.
9. Descargar un respaldo JSON, restaurarlo y comprobar que los movimientos siguen disponibles.

> Nota: el respaldo JSON incluye también los datos archivados por la migración desde versiones anteriores. No se convierten importes USD/EUR a COP automáticamente.
