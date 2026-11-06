# Guía de código y documentación — Calc-Gastos 2.0

> **Objetivo:** que una persona que abra el repositorio pueda entender qué responsabilidad tiene cada archivo, dónde se aplican las reglas importantes y cómo viajan los datos desde la interfaz hasta el almacenamiento.
>
> Los comentarios `FUNCIÓN FUNDAMENTAL` señalan las piezas que protegen la integridad de la información o producen los cálculos esenciales del producto.

## 1. Qué es y qué no es Calc-Gastos

Calc-Gastos es una aplicación de finanzas personales. Su alcance actual es deliberadamente pequeño: una sola billetera personal, moneda COP, ingresos, gastos, categorías, estadísticas y respaldo/restauración local. No es un sistema contable ni administra empresas, inventarios, facturas o múltiples cuentas.

La aplicación funciona **local-first**: los datos permanecen en el almacenamiento del navegador. No hay backend ni sincronización remota.

## 2. Arquitectura por capas

```text
Interfaz React (modules / componentes)
              │ llama
              ▼
Servicios de aplicación (services)
  movimientos · categorías · saldo · estadísticas · respaldos
              │ usa
              ▼
Servicio de estado (storageService)
              │ delega
              ▼
Repositorio (localStorageRepository)
              │ lee / escribe
              ▼
       localStorage del navegador
```

- **Interfaz:** recoge datos, muestra estados y responde a acciones del usuario. No debe implementar reglas de negocio complejas.
- **Servicios:** validan operaciones y calculan resultados reutilizables. Son el lugar principal para las reglas del producto.
- **Dominio:** contiene constantes, validaciones y operaciones monetarias independientes de React.
- **Repositorio:** es la única capa que conoce `localStorage`, la versión del esquema y la migración de datos.
- **Pruebas:** verifican reglas esenciales para reducir regresiones.

## 3. Funciones fundamentales: recorrido de los datos

### 3.1 Registrar un ingreso o gasto

1. `src/modules/transactions/MovimientosPage.jsx` recoge los campos del formulario.
2. `createTransaction()` o `updateTransaction()` en `src/services/transactionService.js` recibe la solicitud.
3. `buildTransaction()` valida descripción, fecha, importe, tipo y categoría. También genera el identificador y la estructura estándar.
4. Los importes se convierten a enteros mediante `toMinorUnits()` (`src/domain/money.js`). Los ingresos se guardan positivos y los gastos negativos.
5. `storageService.updateState()` obtiene el estado actual, lo clona, aplica el cambio y solicita guardarlo.
6. `localStorageRepository.save()` serializa el nuevo estado en el navegador.

**Regla importante:** la interfaz no debe guardar movimientos directamente ni saltarse `transactionService`. Así todas las entradas pasan por las mismas validaciones.

### 3.2 Calcular el saldo disponible

`getAccountBalance()` en `src/services/accountService.js` toma el saldo inicial de la única billetera y suma los importes firmados de sus movimientos:

`saldo disponible = saldo inicial + ingresos − gastos`

El signo del importe ya expresa si el movimiento suma o resta. No se debe volver a invertir el signo en el cálculo del saldo.

### 3.3 Generar las gráficas

1. `DashboardPage.jsx` obtiene los movimientos y la fecha local.
2. `getMonthlyIncomeExpense()` agrupa ingresos y gastos por mes para la gráfica de líneas. Crea también los meses vacíos con valor cero para mantener una serie temporal continua.
3. `getExpenseTotalsByCategory()` suma exclusivamente gastos y los agrupa por categoría para la gráfica de dona.
4. `FinanceCharts.jsx` convierte esos agregados en datasets de Chart.js y configura ejes, leyendas y tooltips.
5. `ReportesPage.jsx` reutiliza el agrupador por categoría, pero primero aplica el rango de fechas y tipo seleccionado.

**Separación clave:** `analyticsService.js` calcula; `FinanceCharts.jsx` dibuja. No trasladar cálculos de negocio al componente de Chart.js.

### 3.4 Persistir y migrar información

`localStorageRepository.js` contiene las operaciones delicadas:

- `initialState()`: define la estructura inicial válida.
- `migrateToPersonalCop()`: adapta versiones anteriores al modelo actual de una billetera COP. Los datos que no corresponden al modelo actual se archivan en `legacy` para no mezclarlos con los movimientos vigentes.
- `load()`: lee, migra y devuelve el estado compatible.
- `save()`: actualiza la versión y fecha de modificación, y maneja errores de almacenamiento lleno.
- `importBackup()`: analiza el JSON, comprueba su estructura, migra y solo entonces guarda.

**Precaución:** al cambiar la estructura de datos, revisar `STORAGE_VERSION`, la migración y las pruebas. No borrar datos heredados sin una decisión explícita.

### 3.5 Respaldo y restauración

`backupService.js` prepara la descarga JSON y delega la importación. `RespaldoDatos.jsx` pide confirmación porque restaurar reemplaza los datos locales actuales. El repositorio valida el archivo antes de persistirlo.

## 4. Inventario de archivos

### Entrada y configuración

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Documento base y nodo `#root` de React. |
| `src/main.jsx` | Punto de entrada; monta React y estilos globales. |
| `src/App.jsx` | Componente raíz. |
| `src/App.css`, `src/index.css` | Estilos de la aplicación y estilos globales/Tailwind. |
| `vite.config.js` | Configuración de Vite, React y Tailwind. |
| `eslint.config.js` | Reglas estáticas de calidad de código. |
| `package.json` | Dependencias y scripts. Es JSON estricto y no admite comentarios. |
| `pnpm-lock.yaml`, `package-lock.json` | Versiones exactas de dependencias. Son archivos generados; no se editan manualmente ni se comentan para no romper el formato. |
| `pnpm-workspace.yaml` | Configuración del workspace de pnpm. |
| `.gitignore` | Archivos y carpetas que Git debe ignorar. |

### Dominio, persistencia y servicios

| Archivo | Responsabilidad |
|---|---|
| `src/domain/constants.js` | Claves, versión de almacenamiento, moneda, billetera y categorías iniciales. |
| `src/domain/money.js` | Conversión, validación y formato de importes COP. |
| `src/domain/validators.js` | Validaciones compartidas de texto, moneda y fecha. |
| `src/repositories/localStorageRepository.js` | Lectura/escritura local, estado inicial, migración e importación/exportación de respaldo. |
| `src/services/storageService.js` | Fachada para leer y actualizar el estado. |
| `src/services/transactionService.js` | Reglas CRUD de movimientos. |
| `src/services/accountService.js` | Billetera personal, saldo y saldo inicial. |
| `src/services/categoryService.js` | Reglas CRUD y protección de categorías. |
| `src/services/analyticsService.js` | Agregados estadísticos para gráficas e informes. |
| `src/services/backupService.js` | Descarga y restauración de respaldos. |
| `src/hooks/useCurrentDate.js` | Fecha local reactiva y cambio automático de día/mes. |
| `src/hooks/ThemeContext.js` | Contexto y hook para consultar la preferencia visual. |
| `src/hooks/ThemeProvider.jsx` | Detecta el tema del sistema, persiste la preferencia y aplica el tema global. |
| `src/components/ui/ThemeControl.jsx` | Selector reutilizable de apariencia clara, oscura o automática. |

### Interfaz

| Archivo | Responsabilidad |
|---|---|
| `src/pages/MainPage.jsx` | Navegación y selección del módulo visible. |
| `src/modules/dashboard/DashboardPage.jsx` | Resumen, saldo, tarjetas, tendencias y movimientos recientes. |
| `src/modules/transactions/MovimientosPage.jsx` | Formulario, filtros y lista de movimientos. |
| `src/modules/categories/CategoriasPage.jsx` | Administración de categorías. |
| `src/modules/reports/ReportesPage.jsx` | Filtros, totales, gráfica y exportación CSV. |
| `src/modules/settings/DatosPage.jsx` | Saldo inicial, información local y respaldo. |
| `src/components/charts/FinanceCharts.jsx` | Componentes visuales Chart.js con colores semánticos adaptados al tema. |
| `src/componentes/common/Header.jsx` | Cabecera compartida. |
| `src/componentes/common/Footer.jsx` | Pie compartido. |
| `src/componentes/configuracion/RespaldoDatos.jsx` | Controles de exportación/restauración. |

### Pruebas y recursos

| Archivo | Responsabilidad |
|---|---|
| `src/tests/helpers.js` | Simulación de `localStorage` para pruebas. |
| `src/tests/core.test.js` | Pruebas de persistencia, movimientos, categorías, migración y respaldos. |
| `src/tests/analytics.test.js` | Pruebas de agrupación mensual y por categoría. |
| `src/assets/hero.png` | Recurso gráfico importado por la interfaz. |
| `public/favicon.svg`, `public/icons.svg` | Iconos estáticos públicos. |
| `scripts/generate-iconos.html` | Herramienta auxiliar para generar/visualizar iconos. |
| `docs/LOCAL_FIRST_ARCHITECTURE.md` | Decisiones de arquitectura local-first. |
| `docs/SISTEMA-DISENO.md` | Identidad visual, tokens, temas y convenciones cromáticas. |
| `docs/CRITERIOS-ACEPTACION.md` | Condiciones que debe cumplir el producto. |
| `README.md`, `README-CALC-GASTOS-2.0.md` | Instrucciones y descripción del proyecto. |

## 5. Convenciones para mantener la documentación

- Comentar el **porqué** de una decisión o una regla, no traducir cada línea de código a español.
- Mantener el comentario junto a la función o bloque que explica.
- Usar `FUNCIÓN FUNDAMENTAL` para validaciones, persistencia, migraciones, saldo y agregados analíticos.
- Si una regla cambia, actualizar código, comentario, guía y pruebas en el mismo cambio.
- Los archivos JSON y lockfiles no admiten comentarios válidos. Su explicación vive en esta guía y en los README.
- Los comentarios no sustituyen pruebas: toda regla importante debe tener un caso automatizado cuando sea posible.

## 6. Orden recomendado para estudiar el código

1. `domain/constants.js` y `domain/money.js`.
2. `repositories/localStorageRepository.js` y `services/storageService.js`.
3. `services/transactionService.js` y `services/accountService.js`.
4. `services/analyticsService.js` y `components/charts/FinanceCharts.jsx`.
5. `modules/transactions/MovimientosPage.jsx` y `modules/dashboard/DashboardPage.jsx`.
6. Categorías, estadísticas, configuración y pruebas.

Este orden sigue el recorrido de los datos y permite comprender primero las reglas antes de estudiar la interfaz.


## 7. Sistema de apariencia

La apariencia se gestiona mediante `ThemeProvider`, que mantiene la preferencia `system`, `light` o `dark`. El tema resuelto se escribe en `document.documentElement.dataset.theme`; `src/index.css` lee ese atributo y actualiza los tokens que utilizan todos los módulos. `ThemeControl` solo presenta el selector y delega el cambio al contexto. El script temprano de `index.html` aplica la preferencia antes del montaje de React para evitar un destello del tema predeterminado. La barra del navegador también recibe un `theme-color` acorde al modo activo.

Las gráficas consultan `resolvedTheme` para ajustar texto, cuadrículas y borde de la dona. Los colores de significado financiero no cambian: verde para ingresos y rojo para gastos.
