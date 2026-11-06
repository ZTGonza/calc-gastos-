# Calc-Gastos 2.0 — Finanzas personales

Calc-Gastos es una aplicación sencilla para registrar ingresos y gastos personales, conocer el dinero disponible y entender los hábitos de consumo. **No es un sistema contable ni empresarial.**

## Alcance de esta versión

1. **Inicio:** saldo disponible, ingresos y gastos del mes, distribución de gastos y movimientos recientes.
2. **Movimientos:** registro, edición, eliminación y filtros de ingresos y gastos.
3. **Categorías:** categorías predeterminadas y personalizadas para ingresos y gastos.
4. **Estadísticas:** resumen por periodo, gastos por categoría, detalle y exportación CSV.
5. **Configuración:** saldo inicial, preferencias de apariencia, exportación y restauración de respaldos.

## Decisiones de producto

- Una sola billetera personal.
- Únicamente pesos colombianos (COP), sin conversión de monedas.
- Almacenamiento local en el navegador mediante `localStorage`.
- Sin cuentas bancarias múltiples, transferencias internas, contabilidad, inventarios, facturación, nómina, CRM ni integraciones empresariales.
- El método de pago (efectivo o transferencia) es únicamente informativo; no crea cuentas ni saldos separados.
- Los gastos pueden registrarse aunque el saldo calculado quede negativo. El saldo es una referencia personal y no debe bloquear el registro de un gasto real.

## Arquitectura

- React + Vite.
- `modules/`: pantallas y funcionalidades de cada sección.
- `services/`: reglas de negocio y cálculos.
- `repositories/`: persistencia local.
- `domain/`: constantes, validaciones y formato monetario.
- `tests/`: pruebas automatizadas con `node:test`.

Los movimientos son la fuente de verdad. El saldo se calcula como saldo inicial + ingresos − gastos. Los importes se almacenan como pesos enteros para evitar errores de punto flotante.

## Migración desde versiones anteriores

Al abrir por primera vez esta versión, los datos anteriores se adaptan al modelo de una sola billetera COP:

- Se consolidan los saldos iniciales de las antiguas cuentas COP.
- Los ingresos y gastos COP se conservan y se asocian a la billetera personal.
- Los datos de cuentas/operaciones en USD o EUR se guardan en el archivo local de legado, sin conversión ni mezcla con COP.
- Las transferencias internas se archivan porque dejan de formar parte del modelo de una sola billetera.
- Los presupuestos, objetivos y reglas recurrentes anteriores se conservan en `legacy.archivedModules` dentro del respaldo, pero dejan de aparecer en la interfaz.

**Antes de actualizar:** descarga un respaldo desde la versión anterior. Esta nueva versión no convierte automáticamente información en otras monedas.

## Requisitos

- Node.js 20.19+ (Node 20 LTS recomendado).
- pnpm 10 o npm reciente.

## Instalación y ejecución

```bash
pnpm install
pnpm test
pnpm dev
```

Build de producción:

```bash
pnpm build
pnpm preview
```

También puedes usar npm:

```bash
npm install
npm test
npm run dev
npm run build
```

## Datos y privacidad

Los datos se almacenan en el navegador y dispositivo actuales. Limpiar los datos del navegador, cambiar de perfil o de dispositivo puede hacer que los registros no estén disponibles. Descarga respaldos JSON periódicamente. Restaurar un respaldo reemplaza los datos locales actuales.

## Visualizaciones financieras

- **Inicio:** gráfico de líneas con la evolución mensual de ingresos y gastos de los últimos seis meses, incluyendo meses sin movimientos; gráfico de dona con la distribución de gastos del mes actual por categoría.
- **Estadísticas:** gráfico de dona de gastos por categoría que responde a los filtros de fecha y tipo.
- Los gráficos se construyen con Chart.js y `react-chartjs-2`; los importes se muestran en pesos colombianos (COP).
- Los cálculos de agregación están aislados en `src/services/analyticsService.js` y cubiertos por pruebas automatizadas.

## Documentación técnica del código

Para estudiar el proyecto archivo por archivo, entender el recorrido de los datos y localizar las funciones marcadas como fundamentales, consulta [`docs/GUIA-CODIGO-COMENTADO.md`](docs/GUIA-CODIGO-COMENTADO.md). Los comentarios `FUNCIÓN FUNDAMENTAL` identifican reglas centrales de movimientos, saldo, persistencia, migraciones y estadísticas.


## Identidad visual y temas

Calc-Gastos utiliza una identidad grafito + verde esmeralda y ofrece tres preferencias: modo oscuro, modo claro y modo automático (según el sistema operativo). La elección se guarda localmente con la clave `calc-gastos-theme`. Ingresos se identifican en verde y gastos en rojo, independientemente del tema. Los cinco módulos comparten tokens visuales centralizados en `src/index.css`. Consulta [`docs/SISTEMA-DISENO.md`](docs/SISTEMA-DISENO.md) para conocer la paleta, las responsabilidades y las reglas para futuras pantallas.
