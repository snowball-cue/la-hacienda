interface Label { en: string; es: string }

export const labels = {
  categories: {
    produce:   { en: 'Produce',           es: 'Productos Frescos'     } satisfies Label,
    dairy:     { en: 'Dairy',             es: 'Lácteos'               } satisfies Label,
    meat:      { en: 'Meat & Seafood',    es: 'Carnes y Mariscos'     } satisfies Label,
    dry_goods: { en: 'Dry Goods',         es: 'Abarrotes'             } satisfies Label,
    beverages: { en: 'Beverages',         es: 'Bebidas'               } satisfies Label,
    bakery:    { en: 'Bakery',            es: 'Panadería'             } satisfies Label,
    frozen:    { en: 'Frozen',            es: 'Congelados'            } satisfies Label,
    snacks:    { en: 'Snacks & Candy',    es: 'Botanas y Dulces'      } satisfies Label,
    cleaning:  { en: 'Cleaning Supplies', es: 'Artículos de Limpieza' } satisfies Label,
    personal:  { en: 'Personal Care',     es: 'Cuidado Personal'      } satisfies Label,
  },
  units: {
    each:  { en: 'Each',  es: 'Unidad' } satisfies Label,
    lb:    { en: 'lb',    es: 'lb'     } satisfies Label,
    kg:    { en: 'kg',    es: 'kg'     } satisfies Label,
    case:  { en: 'Case',  es: 'Caja'   } satisfies Label,
    dozen: { en: 'Dozen', es: 'Docena' } satisfies Label,
    oz:    { en: 'oz',    es: 'oz'     } satisfies Label,
  },
  reasons: {
    received:         { en: 'Received',         es: 'Recibido'             } satisfies Label,
    sold:             { en: 'Sold',             es: 'Vendido'              } satisfies Label,
    spoilage:         { en: 'Spoilage',         es: 'Merma / Caducidad'    } satisfies Label,
    theft:            { en: 'Theft / Shrinkage',es: 'Robo / Faltante'      } satisfies Label,
    return:           { en: 'Return',           es: 'Devolución'           } satisfies Label,
    count_correction: { en: 'Count Correction', es: 'Corrección de Conteo' } satisfies Label,
    adjustment:       { en: 'Adjustment',       es: 'Ajuste General'       } satisfies Label,
  },
  ui: {
    // Dashboard
    home:             { en: 'Home',             es: 'Inicio'               } satisfies Label,
    goodMorning:      { en: 'Good morning',     es: 'Buenos días'          } satisfies Label,
    goodAfternoon:    { en: 'Good afternoon',   es: 'Buenas tardes'        } satisfies Label,
    goodEvening:      { en: 'Good evening',     es: 'Buenas noches'        } satisfies Label,
    todaySummary:     { en: "Here's what's happening today", es: 'Esto es lo que pasa hoy' } satisfies Label,
    lowStock:         { en: 'Low Stock',        es: 'Bajo inventario'      } satisfies Label,
    scanItem:         { en: 'Scan Item',        es: 'Escanear'             } satisfies Label,
    recentActivity:   { en: 'Recent Activity',  es: 'Actividad reciente'   } satisfies Label,
    noActivity:       { en: 'No recent activity.', es: 'Sin actividad reciente.' } satisfies Label,
    // Inventory
    searchProducts:   { en: 'Search products…', es: 'Buscar productos…'   } satisfies Label,
    noProducts:       { en: 'No products found.', es: 'No se encontraron productos.' } satisfies Label,
    noSearchResults:  { en: 'No products match your search.', es: 'Ningún producto coincide.' } satisfies Label,
    // Reports
    reports:          { en: 'Reports',          es: 'Reportes'             } satisfies Label,
    lowStockAlert:    { en: 'Low Stock',        es: 'Bajo inventario'      } satisfies Label,
    allGood:          { en: 'All products are above reorder point.', es: 'Todos los productos están sobre el punto de reorden.' } satisfies Label,
    recentMovements:  { en: 'Recent Movements', es: 'Movimientos recientes'} satisfies Label,
    noMovements:      { en: 'No movements recorded yet.', es: 'Sin movimientos registrados.' } satisfies Label,
    // Scan
    scanTitle:        { en: 'Scan Barcode',     es: 'Escanear código'      } satisfies Label,
    pointCamera:      { en: 'Point at a barcode to scan', es: 'Apunta a un código de barras' } satisfies Label,
    productNotFound:  { en: 'Product Not Found', es: 'Producto no encontrado' } satisfies Label,
    notFoundSub:      { en: 'No product matched that barcode.', es: 'Ningún producto coincide con ese código.' } satisfies Label,
    receive:          { en: 'Receive',          es: 'Recibir'              } satisfies Label,
    adjustStock:      { en: 'Adjust Stock',     es: 'Ajustar stock'        } satisfies Label,
    viewDetails:      { en: 'View Details',     es: 'Ver detalles'         } satisfies Label,
    close:            { en: 'Close',            es: 'Cerrar'               } satisfies Label,
    // Receive screen
    receivingGoods:   { en: 'Receiving goods into stock', es: 'Recibiendo mercancía al inventario' } satisfies Label,
    quantityReceived: { en: 'Quantity Received', es: 'Cantidad recibida'   } satisfies Label,
    noteOptional:     { en: 'Note (optional)',  es: 'Nota (opcional)'      } satisfies Label,
    confirmReceipt:   { en: 'Confirm Receipt', es: 'Confirmar recibo'      } satisfies Label,
    stockReceived:    { en: 'Stock received successfully', es: 'Inventario recibido exitosamente' } satisfies Label,
    // Adjust screen
    adjustTitle:      { en: 'Record a stock adjustment', es: 'Registrar un ajuste de inventario' } satisfies Label,
    direction:        { en: 'Direction',        es: 'Dirección'            } satisfies Label,
    addStock:         { en: '+ Add',            es: '+ Agregar'            } satisfies Label,
    removeStock:      { en: '− Remove',         es: '− Quitar'             } satisfies Label,
    quantity:         { en: 'Quantity',         es: 'Cantidad'             } satisfies Label,
    reason:           { en: 'Reason',           es: 'Razón'                } satisfies Label,
    saveAdjustment:   { en: 'Save Adjustment', es: 'Guardar ajuste'        } satisfies Label,
    stockAdded:       { en: 'Stock added successfully', es: 'Stock agregado exitosamente' } satisfies Label,
    stockRemoved:     { en: 'Stock removed successfully', es: 'Stock retirado exitosamente' } satisfies Label,
    // Product detail
    stockHistory:     { en: 'Stock History',    es: 'Historial de stock'   } satisfies Label,
    noMovementsYet:   { en: 'No movements recorded.', es: 'Sin movimientos registrados.' } satisfies Label,
    reorderAt:        { en: 'Reorder at',       es: 'Reordenar en'         } satisfies Label,
    belowReorder:     { en: '⚠ Below reorder point', es: '⚠ Bajo el punto de reorden' } satisfies Label,
    // Settings
    settings:         { en: 'Settings',        es: 'Configuración'         } satisfies Label,
    activeStore:      { en: 'Active Store',    es: 'Tienda activa'          } satisfies Label,
    allStores:        { en: 'All Stores',      es: 'Todas las tiendas'      } satisfies Label,
    preferences:      { en: 'Preferences',    es: 'Preferencias'           } satisfies Label,
    language:         { en: 'Language',        es: 'Idioma'                 } satisfies Label,
    biometricLogin:   { en: 'Biometric Login', es: 'Inicio biométrico'     } satisfies Label,
    signOut:          { en: 'Sign Out',        es: 'Cerrar sesión'          } satisfies Label,
    signOutConfirm:   { en: 'Are you sure you want to sign out?', es: '¿Seguro que quieres cerrar sesión?' } satisfies Label,
    // Common
    cancel:           { en: 'Cancel',          es: 'Cancelar'              } satisfies Label,
    system:           { en: 'System',          es: 'Sistema'               } satisfies Label,
  },
} as const

export type ReasonKey = keyof typeof labels.reasons

export const manualReasons: ReasonKey[] = [
  'received', 'spoilage', 'theft', 'return', 'count_correction', 'adjustment',
]

export function getLabel(label: Label, lang: 'en' | 'es' = 'en'): string {
  return label[lang]
}
