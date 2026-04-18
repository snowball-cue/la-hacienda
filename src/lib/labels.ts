/**
 * Bilingual Label Dictionary — src/lib/labels.ts
 *
 * ── PURPOSE ───────────────────────────────────────────────────────────────────
 *
 * This is the SINGLE SOURCE OF TRUTH for all translatable strings in the
 * La Hacienda dashboard. English is the primary language; Spanish labels
 * appear alongside English for store staff who prefer Spanish.
 *
 * ── DESIGN DECISION: NO i18n LIBRARY ─────────────────────────────────────────
 *
 * We deliberately do NOT use next-intl, react-i18next, or similar libraries.
 * Rationale (per CLAUDE.md):
 *   - La Hacienda's bilingual needs are limited to ~50 label strings.
 *   - A typed dictionary is simpler, faster, and has zero runtime overhead.
 *   - Adding an i18n library would add significant bundle weight and config
 *     complexity for no meaningful benefit at this scale.
 *
 * If the scope grows to full Spanish UI translations, revisit this decision.
 *
 * ── HOW TO USE ────────────────────────────────────────────────────────────────
 *
 *   import { labels } from '@/lib/labels'
 *
 *   // Display both languages:
 *   <span>{labels.categories.produce.en}</span>
 *   <span className="text-stone-500 text-xs">{labels.categories.produce.es}</span>
 *
 *   // Utility function (preferred for consistency):
 *   import { getLabel } from '@/lib/labels'
 *   getLabel(labels.reasons.spoilage)
 *   // → "Spoilage / Merma · Caducidad" (formatted for display)
 *
 * ── HOW TO ADD NEW LABELS ──────────────────────────────────────────────────────
 *
 *   1. Add the entry to the appropriate sub-object below.
 *   2. TypeScript will enforce that both `en` and `es` are provided.
 *   3. Run `npm run typecheck` to confirm no type errors.
 *   4. Phase 7 QA checklist: verify Spanish label renders in the UI.
 *
 * ── QA REMINDER ───────────────────────────────────────────────────────────────
 *
 * Phase 7 requires manual verification that Spanish labels render correctly on:
 *   ✓ Product list (nombre column)
 *   ✓ Stock adjustment form (all reason codes)
 *   ✓ Category filter dropdown
 *   ✓ Dashboard widgets
 *   ✓ At least one report
 */

/**
 * A label entry with English and Spanish translations.
 * Both fields are required — TypeScript will error if either is missing.
 */
interface Label {
  en: string
  es: string
}

/**
 * The full label dictionary.
 * `as const` makes all values readonly and infers literal types,
 * enabling TypeScript to autocomplete and type-check label keys.
 */
export const labels = {

  /**
   * Product Categories
   * ──────────────────
   * Displayed in: category filter, product form, public /products page.
   * The `en` values match the `name` column in the `categories` DB table.
   * The `es` values match the `name_es` column in the `categories` DB table.
   *
   * SKU prefix convention (from SOP Section 5.1):
   *   PRODUCE, DAIRY, MEAT, DRY, BEV, BAKE, FREEZE, SNACK, CLEAN, CARE
   */
  categories: {
    produce:    { en: 'Produce',             es: 'Productos Frescos'   } satisfies Label,
    dairy:      { en: 'Dairy',               es: 'Lácteos'             } satisfies Label,
    meat:       { en: 'Meat & Seafood',      es: 'Carnes y Mariscos'   } satisfies Label,
    dry_goods:  { en: 'Dry Goods',           es: 'Abarrotes'           } satisfies Label,
    beverages:  { en: 'Beverages',           es: 'Bebidas'             } satisfies Label,
    bakery:     { en: 'Bakery',              es: 'Panadería'           } satisfies Label,
    frozen:     { en: 'Frozen',              es: 'Congelados'          } satisfies Label,
    snacks:     { en: 'Snacks & Candy',      es: 'Botanas y Dulces'    } satisfies Label,
    cleaning:   { en: 'Cleaning Supplies',   es: 'Artículos de Limpieza' } satisfies Label,
    personal:   { en: 'Personal Care',       es: 'Cuidado Personal'   } satisfies Label,
  },

  /**
   * Units of Measure
   * ────────────────
   * Displayed in: product list, product form, stock adjustment form, reports.
   * These values map to the `unit` column on the `products` table.
   *
   * SOP Section 5.3 defines these four standard units:
   *   each, lb, kg, case
   * Do not add new units without updating the SOP and re-training staff.
   */
  units: {
    each:   { en: 'Each',   es: 'Unidad'  } satisfies Label,
    lb:     { en: 'lb',     es: 'lb'      } satisfies Label, // Pounds — same abbrev
    kg:     { en: 'kg',     es: 'kg'      } satisfies Label, // Kilograms — same abbrev
    case:   { en: 'Case',   es: 'Caja'    } satisfies Label,
    dozen:  { en: 'Dozen',  es: 'Docena'  } satisfies Label,
    oz:     { en: 'oz',     es: 'oz'      } satisfies Label, // Ounces — same abbrev
  },

  /**
   * Stock Adjustment Reason Codes
   * ─────────────────────────────
   * REQUIRED on every stock ledger entry (StockLedger.reason column).
   * These values are stored in the database — changing a key here requires
   * a corresponding database migration to update the enum or check constraint.
   *
   * SOP Section 5.6 defines when each reason should be used.
   * SOP Section 6.5 explains how to correct a wrong entry (via Count Correction).
   *
   * Note: `sold` is reserved for future POS integration (Phase 10).
   *       It should NOT appear in the manual adjustment dropdown.
   */
  reasons: {
    received:         { en: 'Received',           es: 'Recibido'               } satisfies Label,
    sold:             { en: 'Sold',               es: 'Vendido'                } satisfies Label, // Phase 10 (POS)
    spoilage:         { en: 'Spoilage',           es: 'Merma / Caducidad'      } satisfies Label,
    theft:            { en: 'Theft / Shrinkage',  es: 'Robo / Faltante'        } satisfies Label,
    return:           { en: 'Return',             es: 'Devolución'             } satisfies Label,
    count_correction: { en: 'Count Correction',   es: 'Corrección de Conteo'   } satisfies Label,
    adjustment:       { en: 'Adjustment',         es: 'Ajuste General'         } satisfies Label,
  },

  /**
   * Task Board — Status Labels
   * ──────────────────────────
   * Used on the Kanban board at /dashboard/tasks (Phase 4b).
   * These map to the `status` column in the `project_tasks` table.
   * Spanish labels included for consistency, even though the task board
   * is an internal tool — staff do not access it.
   */
  taskStatus: {
    backlog:     { en: 'Backlog',      es: 'Pendiente'    } satisfies Label,
    in_progress: { en: 'In Progress',  es: 'En Progreso'  } satisfies Label,
    review:      { en: 'In Review',    es: 'En Revisión'  } satisfies Label,
    done:        { en: 'Done',         es: 'Completado'   } satisfies Label,
  },

  /**
   * Task Board — Priority Labels
   * ─────────────────────────────
   * Used on task cards. Maps to the `priority` column in `project_tasks`.
   * Color coding applied via CSS classes: .badge-high, .badge-medium, .badge-low
   */
  taskPriority: {
    high:   { en: 'High',   es: 'Alta'  } satisfies Label,
    medium: { en: 'Medium', es: 'Media' } satisfies Label,
    low:    { en: 'Low',    es: 'Baja'  } satisfies Label,
  },

  /**
   * Dashboard Widget Labels
   * ───────────────────────
   * Short labels for the summary widgets on the /dashboard home page.
   */
  widgets: {
    lowStock:       { en: 'Low Stock',        es: 'Bajo Inventario'     } satisfies Label,
    soonToExpire:   { en: 'Soon to Expire',   es: 'Próximo a Caducar'   } satisfies Label,
    tasksInProgress:{ en: 'Tasks In Progress',es: 'Tareas en Progreso'  } satisfies Label,
    recentActivity: { en: 'Recent Activity',  es: 'Actividad Reciente'  } satisfies Label,
  },

  /**
   * Sidebar Navigation Labels
   * ─────────────────────────
   * Used in the sidebar nav items. Translated when the user switches to Spanish.
   */
  nav: {
    dashboard:      { en: 'Dashboard',        es: 'Inicio'               } satisfies Label,
    inventory:      { en: 'Inventory',        es: 'Inventario'           } satisfies Label,
    purchaseOrders: { en: 'Purchase Orders',  es: 'Órdenes de Compra'    } satisfies Label,
    analytics:      { en: 'Analytics',        es: 'Análisis'             } satisfies Label,
    reports:        { en: 'Reports',          es: 'Reportes'             } satisfies Label,
    schedule:       { en: 'Schedule',         es: 'Horario'              } satisfies Label,
    timekeeping:    { en: 'Timekeeping',      es: 'Control de Horas'     } satisfies Label,
    employees:      { en: 'Employees',        es: 'Empleados'            } satisfies Label,
    payroll:        { en: 'Payroll',          es: 'Nómina'               } satisfies Label,
    tasks:          { en: 'Tasks',            es: 'Tareas'               } satisfies Label,
    suppliers:      { en: 'Suppliers',        es: 'Proveedores'          } satisfies Label,
    testLog:        { en: 'Test Log',         es: 'Registro de Pruebas'  } satisfies Label,
    notifications:  { en: 'Notifications',    es: 'Notificaciones'       } satisfies Label,
    settings:       { en: 'Settings',         es: 'Configuración'        } satisfies Label,
    signOut:        { en: 'Sign Out',         es: 'Cerrar Sesión'        } satisfies Label,
  },

} as const

// ── Type exports ────────────────────────────────────────────────────────────

/** Keys of the categories sub-dictionary */
export type CategoryKey = keyof typeof labels.categories

/** Keys of the units sub-dictionary */
export type UnitKey = keyof typeof labels.units

/** Keys of the reason codes sub-dictionary */
export type ReasonKey = keyof typeof labels.reasons

/** Keys of the task status sub-dictionary */
export type TaskStatusKey = keyof typeof labels.taskStatus

/** Keys of the task priority sub-dictionary */
export type TaskPriorityKey = keyof typeof labels.taskPriority

/**
 * Returns reason codes that should appear in the MANUAL adjustment dropdown.
 * Excludes 'sold' — that reason is only used by the POS integration (Phase 10).
 */
export const manualAdjustmentReasons: ReasonKey[] = [
  'received',
  'spoilage',
  'theft',
  'return',
  'count_correction',
  'adjustment',
]
