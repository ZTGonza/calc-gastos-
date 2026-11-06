# Sistema de diseño de Calc-Gastos 2.0

## Identidad

La identidad utiliza grafito y verde esmeralda. La interfaz tiene tres preferencias: `dark`, `light` y `system`. La preferencia se almacena en `localStorage` con la clave `calc-gastos-theme`; el tema efectivo se aplica en `document.documentElement.dataset.theme`.

## Tokens centrales

Los tokens viven en `src/index.css`. Los componentes deben preferir estos tokens indirectamente mediante las clases visuales compartidas o variables CSS, evitando introducir nuevos colores hexadecimales aislados.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--app-bg` | `#15191E` | `#F5F7F6` | Fondo general |
| `--surface` | `#222A31` | `#FFFFFF` | Tarjetas y paneles |
| `--surface-raised` | `#29343D` | `#F0F4F2` | Superficies elevadas |
| `--surface-deep` | `#101418` | `#E9EFEC` | Campos y superficies internas |
| `--border` | `#35414A` | `#E1E8E4` | Separadores y contornos |
| `--text-primary` | `#E5E7EB` | `#18221D` | Texto principal |
| `--text-muted` | `#9CA3AF` | `#64736A` | Texto secundario |
| `--brand` | `#10B981` | `#059669` | Marca, acciones y selección |
| `--income` | `#10B981` | `#07865F` | Ingresos |
| `--expense` | `#EF6464` | `#D94848` | Gastos y acciones destructivas |
| `--warning` | `#F59E0B` | `#A16207` | Advertencias |

## Responsabilidades

- `src/hooks/ThemeContext.jsx`: preferencia, detección del sistema, persistencia y aplicación global.
- `src/components/ui/ThemeControl.jsx`: selector visual reutilizable.
- `src/index.css`: tokens, valores por tema, estilos base y adaptación de colores existentes.
- `src/components/charts/FinanceCharts.jsx`: aplica colores financieros y tonos legibles en gráficas según el tema.
- `src/modules/settings/DatosPage.jsx`: expone el selector dentro de Configuración.

## Reglas para nuevas funcionalidades

1. No introducir colores de marca distintos del verde esmeralda.
2. Verde significa ingreso; rojo significa gasto o acción destructiva.
3. Usar tokens semánticos para fondos, superficies, bordes y texto.
4. Comprobar contraste y legibilidad en ambos temas.
5. Mantener el mismo patrón de controles, tarjetas, formularios y estados en Inicio, Movimientos, Categorías, Estadísticas y Configuración.
6. No agregar módulos financieros fuera del alcance de finanzas personales.

## Preferencia automática

La opción `system` consulta `prefers-color-scheme` y escucha cambios del sistema operativo. Si el navegador no permite `localStorage`, el tema sigue funcionando durante la sesión sin persistencia.
