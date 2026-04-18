/**
 * Database Seed Script — prisma/seed.ts
 *
 * Populates all tables with realistic sample data for development and testing.
 * Safe to run multiple times — idempotent via upsert / count-check patterns.
 *
 * RUN:
 *   npx prisma db seed
 *   (or: npx tsx --env-file=.env.local prisma/seed.ts)
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// ── Stores ────────────────────────────────────────────────────────────────────

const STORES = [
  { name: 'N. Lamar',    address: '9717 N Lamar Blvd a4, Austin, TX 78753' },
  { name: 'Cameron Rd',  address: '7517 Cameron Rd Ste. 100, Austin, TX 78752' },
  { name: 'I-35',        address: '6425 I-35 UNIT 120, Austin, TX 78744' },
] as const

// ── Categories ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Produce',        nameEs: 'Productos frescos', sortOrder: 1 },
  { name: 'Dry Goods',      nameEs: 'Abarrotes',         sortOrder: 2 },
  { name: 'Dairy',          nameEs: 'Lácteos',           sortOrder: 3 },
  { name: 'Meat & Seafood', nameEs: 'Carnes y mariscos', sortOrder: 4 },
  { name: 'Beverages',      nameEs: 'Bebidas',           sortOrder: 5 },
] as const

// ── Suppliers ─────────────────────────────────────────────────────────────────

const SUPPLIERS = [
  {
    name:           'Fiesta Produce Co.',
    contactName:    'Carlos Mendez',
    phone:          '(512) 555-0101',
    email:          'orders@fiestaproduce.example',
    website:        null,
    address:        '1500 E 6th St, Austin, TX 78702',
    paymentTerms:   'NET15',
    leadTimeDays:   1,
    minOrderAmount: '75.00',
    currency:       'USD',
    taxId:          '74-1234567',
    isActive:       true,
    notes:          'Delivers Tuesday and Friday mornings. Call by 5 PM the day before.',
  },
  {
    name:           'Sysco Mexican Foods',
    contactName:    'Maria Flores',
    phone:          '(512) 555-0202',
    email:          'mflores@syscomx.example',
    website:        null,
    address:        '10811 N Lamar Blvd, Austin, TX 78753',
    paymentTerms:   'NET30',
    leadTimeDays:   3,
    minOrderAmount: '500.00',
    currency:       'USD',
    taxId:          '74-9876543',
    isActive:       true,
    notes:          'Weekly delivery on Mondays. Minimum order $500. Distributor for Maseca, Jarritos.',
  },
  {
    name:           'La Preferida Distribution',
    contactName:    'Jose Reyes',
    phone:          '(210) 555-0303',
    email:          'jreyes@lapreferida.example',
    website:        null,
    address:        '2301 S Laredo St, San Antonio, TX 78207',
    paymentTerms:   'NET30',
    leadTimeDays:   5,
    minOrderAmount: '250.00',
    currency:       'USD',
    taxId:          '74-2345678',
    isActive:       true,
    notes:          'Specialty Mexican products and dairy. Bi-weekly delivery.',
  },
  {
    name:           'Gulf Coast Seafood',
    contactName:    'Ana Garza',
    phone:          '(713) 555-0404',
    email:          'agarza@gulfcoastseafood.example',
    website:        null,
    address:        '4500 Navigation Blvd, Houston, TX 77011',
    paymentTerms:   'COD',
    leadTimeDays:   2,
    minOrderAmount: '150.00',
    currency:       'USD',
    taxId:          '76-3456789',
    isActive:       true,
    notes:          'Fresh seafood delivery Wednesdays. Order by Monday noon.',
  },
  {
    name:           'Texas Star Beverages',
    contactName:    'Roberto Silva',
    phone:          '(512) 555-0505',
    email:          'rsilva@txstarbev.example',
    website:        null,
    address:        '6301 E Stassney Ln, Austin, TX 78744',
    paymentTerms:   'NET15',
    leadTimeDays:   2,
    minOrderAmount: '200.00',
    currency:       'USD',
    taxId:          '74-5678901',
    isActive:       true,
    notes:          'Beer, sodas, and agua frescas. Delivers every Friday.',
  },
]

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Seeding database...\n')

  // ── 1. Stores ────────────────────────────────────────────────────────────────
  console.log('  Upserting stores...')
  const storeMap: Record<string, string> = {}
  for (const s of STORES) {
    const record = await prisma.store.upsert({
      where:  { name: s.name },
      update: { address: s.address },
      create: { name: s.name, address: s.address },
    })
    storeMap[s.name] = record.id
    console.log(`    ✓ ${s.name} → ${s.address}`)
  }

  // ── 2. Categories ────────────────────────────────────────────────────────────
  console.log('\n  Upserting categories...')
  const categoryMap: Record<string, string> = {}
  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where:  { name: cat.name },
      update: { nameEs: cat.nameEs, sortOrder: cat.sortOrder },
      create: { name: cat.name, nameEs: cat.nameEs, sortOrder: cat.sortOrder },
    })
    categoryMap[cat.name] = record.id
    console.log(`    ✓ ${cat.name}`)
  }

  // ── 3. Suppliers ─────────────────────────────────────────────────────────────
  console.log('\n  Upserting suppliers...')
  const supplierMap: Record<string, string> = {}
  for (const sup of SUPPLIERS) {
    const supData = {
      contactName:    sup.contactName,
      phone:          sup.phone,
      email:          sup.email,
      notes:          sup.notes,
      address:        sup.address,
      paymentTerms:   sup.paymentTerms,
      leadTimeDays:   sup.leadTimeDays,
      minOrderAmount: sup.minOrderAmount,
      currency:       sup.currency,
      taxId:          sup.taxId,
      isActive:       sup.isActive,
    }
    const record = await (prisma.supplier as unknown as {
      upsert: (args: object) => Promise<{ id: string }>
    }).upsert({
      where:  { name: sup.name },
      update: supData,
      create: { name: sup.name, ...supData },
    })
    supplierMap[sup.name] = record.id
    console.log(`    ✓ ${sup.name}`)
  }

  // ── 4. Products ──────────────────────────────────────────────────────────────
  type ProductSeed = {
    sku: string; name: string; nameEs: string; categoryName: string
    supplierName: string; unit: string; costPrice: string; sellPrice: string
    reorderPoint: number; reorderQty: number; shelfLifeDays?: number
    storeName?: string
  }

  async function upsertProduct(p: ProductSeed): Promise<string> {
    const record = await prisma.product.upsert({
      where:  { sku: p.sku },
      update: {
        name: p.name, nameEs: p.nameEs,
        categoryId:    categoryMap[p.categoryName]!,
        supplierId:    supplierMap[p.supplierName],
        storeId:       p.storeName ? storeMap[p.storeName] : null,
        unit: p.unit, costPrice: p.costPrice, sellPrice: p.sellPrice,
        reorderPoint: p.reorderPoint, reorderQty: p.reorderQty,
        shelfLifeDays: p.shelfLifeDays ?? null,
      },
      create: {
        sku: p.sku, name: p.name, nameEs: p.nameEs,
        categoryId:    categoryMap[p.categoryName]!,
        supplierId:    supplierMap[p.supplierName],
        storeId:       p.storeName ? storeMap[p.storeName] : null,
        unit: p.unit, costPrice: p.costPrice, sellPrice: p.sellPrice,
        reorderPoint: p.reorderPoint, reorderQty: p.reorderQty,
        shelfLifeDays: p.shelfLifeDays ?? null,
      },
    })
    console.log(`    ✓ [${p.sku}] ${p.name}`)
    return record.id
  }

  console.log('\n  Upserting products...')
  const productMap: Record<string, string> = {}

  const allProducts: ProductSeed[] = [
    // Produce
    { sku: 'PRD-AVO-001', name: 'Avocado',              nameEs: 'Aguacate',             categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'each', costPrice: '0.55', sellPrice: '1.25', reorderPoint: 24, reorderQty: 48, shelfLifeDays: 5  },
    { sku: 'PRD-JAL-001', name: 'Jalapeño Peppers',     nameEs: 'Chiles jalapeños',     categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '0.80', sellPrice: '1.99', reorderPoint: 10, reorderQty: 20, shelfLifeDays: 7  },
    { sku: 'PRD-TOM-001', name: 'Tomatillos',           nameEs: 'Tomatillos',           categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '0.70', sellPrice: '1.79', reorderPoint: 10, reorderQty: 20, shelfLifeDays: 10 },
    { sku: 'PRD-CIL-001', name: 'Cilantro (bunch)',     nameEs: 'Cilantro (manojo)',    categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'each', costPrice: '0.30', sellPrice: '0.99', reorderPoint: 12, reorderQty: 24, shelfLifeDays: 5  },
    { sku: 'PRD-LIM-001', name: 'Limes',                nameEs: 'Limones',              categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '0.60', sellPrice: '1.49', reorderPoint: 10, reorderQty: 20, shelfLifeDays: 14 },
    { sku: 'PRD-MAN-001', name: 'Mangoes',              nameEs: 'Mangos',               categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'each', costPrice: '0.45', sellPrice: '1.19', reorderPoint: 12, reorderQty: 24, shelfLifeDays: 5  },
    { sku: 'PRD-NOP-001', name: 'Nopales (cactus)',     nameEs: 'Nopales',              categoryName: 'Produce',        supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '1.10', sellPrice: '2.49', reorderPoint: 5,  reorderQty: 10, shelfLifeDays: 7,  storeName: 'N. Lamar'   },
    // Dry Goods
    { sku: 'DRY-MAS-001', name: 'Maseca Corn Masa Flour (4.4lb)',    nameEs: 'Harina de maíz Maseca (2kg)',  categoryName: 'Dry Goods', supplierName: 'Sysco Mexican Foods',     unit: 'each', costPrice: '2.80', sellPrice: '4.99', reorderPoint: 12, reorderQty: 24 },
    { sku: 'DRY-ABU-001', name: 'Abuelita Hot Chocolate (6-tablet)', nameEs: 'Chocolate Abuelita',           categoryName: 'Dry Goods', supplierName: 'Sysco Mexican Foods',     unit: 'each', costPrice: '2.10', sellPrice: '3.99', reorderPoint: 8,  reorderQty: 12 },
    { sku: 'DRY-PIN-001', name: 'Pinto Beans (bulk, per lb)',        nameEs: 'Frijoles pintos (a granel)',   categoryName: 'Dry Goods', supplierName: 'Sysco Mexican Foods',     unit: 'lb',   costPrice: '0.65', sellPrice: '1.49', reorderPoint: 25, reorderQty: 50 },
    { sku: 'DRY-RIC-001', name: 'Long Grain White Rice (per lb)',    nameEs: 'Arroz blanco de grano largo',  categoryName: 'Dry Goods', supplierName: 'Sysco Mexican Foods',     unit: 'lb',   costPrice: '0.45', sellPrice: '0.99', reorderPoint: 25, reorderQty: 50 },
    { sku: 'DRY-CHI-001', name: 'Dried Ancho Chiles (4oz)',          nameEs: 'Chiles anchos secos (4oz)',    categoryName: 'Dry Goods', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.40', sellPrice: '2.99', reorderPoint: 6, reorderQty: 12 },
    { sku: 'DRY-TOR-001', name: 'Corn Tortillas (30-pack)',          nameEs: 'Tortillas de maíz (30 pzas)',  categoryName: 'Dry Goods', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.80', sellPrice: '3.49', reorderPoint: 20, reorderQty: 40, shelfLifeDays: 14 },
    { sku: 'DRY-SAL-001', name: 'Salsa Verde (16oz jar)',            nameEs: 'Salsa verde (frasco 16oz)',    categoryName: 'Dry Goods', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.60', sellPrice: '3.29', reorderPoint: 8,  reorderQty: 16 },
    // Dairy
    { sku: 'DAI-CRM-001', name: 'Mexican Crema (7.5oz)',             nameEs: 'Crema Mexicana (7.5oz)',       categoryName: 'Dairy', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.50', sellPrice: '2.99', reorderPoint: 8,  reorderQty: 16, shelfLifeDays: 21 },
    { sku: 'DAI-QFR-001', name: 'Queso Fresco (10oz)',               nameEs: 'Queso fresco (10oz)',          categoryName: 'Dairy', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '2.20', sellPrice: '4.49', reorderPoint: 6,  reorderQty: 12, shelfLifeDays: 14 },
    { sku: 'DAI-COT-001', name: 'Cotija Cheese (10oz)',              nameEs: 'Queso cotija (10oz)',          categoryName: 'Dairy', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '2.40', sellPrice: '4.99', reorderPoint: 4,  reorderQty: 8,  shelfLifeDays: 30 },
    { sku: 'DAI-MAN-001', name: 'Mantequilla (Mexican Butter, 7oz)', nameEs: 'Mantequilla (7oz)',            categoryName: 'Dairy', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.80', sellPrice: '3.49', reorderPoint: 4,  reorderQty: 8,  shelfLifeDays: 60 },
    // Meat & Seafood
    { sku: 'MEA-GBF-001', name: 'Ground Beef 80/20 (per lb)',        nameEs: 'Carne molida 80/20',           categoryName: 'Meat & Seafood', supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '3.80', sellPrice: '6.99',  reorderPoint: 10, reorderQty: 20, shelfLifeDays: 3 },
    { sku: 'MEA-CHO-001', name: 'Mexican Chorizo (12oz)',            nameEs: 'Chorizo mexicano (12oz)',      categoryName: 'Meat & Seafood', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '2.50', sellPrice: '4.99', reorderPoint: 8,  reorderQty: 12, shelfLifeDays: 7 },
    { sku: 'MEA-CAR-001', name: 'Carnitas (per lb, cooked)',         nameEs: 'Carnitas (por libra)',         categoryName: 'Meat & Seafood', supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '5.00', sellPrice: '9.99',  reorderPoint: 5,  reorderQty: 10, shelfLifeDays: 3 },
    { sku: 'MEA-SKT-001', name: 'Skirt Steak / Arrachera (per lb)', nameEs: 'Arrachera (por libra)',        categoryName: 'Meat & Seafood', supplierName: 'Fiesta Produce Co.',     unit: 'lb',   costPrice: '6.50', sellPrice: '11.99', reorderPoint: 5,  reorderQty: 10, shelfLifeDays: 3 },
    { sku: 'MEA-SHR-001', name: 'Gulf Shrimp (16-20ct, per lb)',    nameEs: 'Camarones del Golfo',          categoryName: 'Meat & Seafood', supplierName: 'Gulf Coast Seafood',     unit: 'lb',   costPrice: '7.00', sellPrice: '12.99', reorderPoint: 5,  reorderQty: 10, shelfLifeDays: 2, storeName: 'Cameron Rd' },
    // Beverages
    { sku: 'BEV-JRT-MAN', name: 'Jarritos Mandarin (12.5oz)',       nameEs: 'Jarritos mandarina (355ml)',   categoryName: 'Beverages', supplierName: 'Texas Star Beverages',   unit: 'each', costPrice: '0.65', sellPrice: '1.49', reorderPoint: 24, reorderQty: 48 },
    { sku: 'BEV-JRT-TAM', name: 'Jarritos Tamarind (12.5oz)',       nameEs: 'Jarritos tamarindo (355ml)',   categoryName: 'Beverages', supplierName: 'Texas Star Beverages',   unit: 'each', costPrice: '0.65', sellPrice: '1.49', reorderPoint: 24, reorderQty: 48 },
    { sku: 'BEV-JAM-001', name: 'Agua de Jamaica (1L)',             nameEs: 'Agua de jamaica (1L)',         categoryName: 'Beverages', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.20', sellPrice: '2.49', reorderPoint: 8,  reorderQty: 16, shelfLifeDays: 7 },
    { sku: 'BEV-HOR-001', name: 'Horchata (1L)',                    nameEs: 'Horchata (1L)',                categoryName: 'Beverages', supplierName: 'La Preferida Distribution', unit: 'each', costPrice: '1.20', sellPrice: '2.49', reorderPoint: 8,  reorderQty: 16, shelfLifeDays: 5 },
    { sku: 'BEV-MOD-001', name: 'Modelo Especial (12-pack)',        nameEs: 'Modelo especial (12 cervezas)', categoryName: 'Beverages', supplierName: 'Texas Star Beverages',  unit: 'case', costPrice: '11.00', sellPrice: '18.99', reorderPoint: 4, reorderQty: 8 },
    { sku: 'BEV-COK-001', name: 'Mexican Coke Glass Bottle (12oz)', nameEs: 'Coca-Cola de vidrio (355ml)', categoryName: 'Beverages', supplierName: 'Sysco Mexican Foods',     unit: 'each', costPrice: '0.90', sellPrice: '2.25', reorderPoint: 24, reorderQty: 48 },
  ]

  for (const p of allProducts) {
    productMap[p.sku] = await upsertProduct(p)
  }

  // ── 5. Get or create a system user ID for seeded records ─────────────────────
  // All ledger/task/PO records require a valid UUID for performedBy/createdBy.
  const profile = await prisma.profile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!profile) {
    console.log('\n  ⚠  No profiles found — skipping records that require a user ID.')
    console.log('     Create at least one user account in Supabase, then re-run the seed.')
    await printSummary()
    return
  }
  const sysUserId = profile.id
  console.log(`\n  Using profile ${sysUserId} as system user for seeded records.`)

  // ── 6. Assign stores to existing profiles ────────────────────────────────────
  const allProfiles = await prisma.profile.findMany({ orderBy: { createdAt: 'asc' } })
  const storeIds = Object.values(storeMap)
  for (let i = 0; i < allProfiles.length; i++) {
    const assignedStore = storeIds[i % storeIds.length]
    await prisma.profile.update({
      where: { id: allProfiles[i].id },
      data:  { storeId: assignedStore },
    })
  }
  console.log(`  Assigned ${allProfiles.length} profiles to stores.`)

  // ── 6b. Seed non-auth dummy employees ────────────────────────────────────────
  console.log('\n  Seeding dummy staff employees...')
  const DUMMY_EMPLOYEES = [
    { firstName: 'Maria',  lastName: 'Lopez',     position: 'Cashier',          phone: '(512) 421-1100', payType: 'hourly', storeIdx: 1, hireOffset: 365 },
    { firstName: 'Juan',   lastName: 'Martinez',  position: 'Stock Associate',   phone: '(512) 421-1101', payType: 'hourly', storeIdx: 0, hireOffset: 280 },
    { firstName: 'Sofia',  lastName: 'Rodriguez', position: 'Produce Clerk',     phone: '(512) 421-1102', payType: 'hourly', storeIdx: 2, hireOffset: 180 },
    { firstName: 'Diego',  lastName: 'Hernandez', position: 'Butcher',           phone: '(512) 421-1103', payType: 'hourly', storeIdx: 0, hireOffset: 500 },
    { firstName: 'Ana',    lastName: 'Gutierrez', position: 'Cashier',           phone: '(512) 421-1104', payType: 'hourly', storeIdx: 1, hireOffset: 90  },
    { firstName: 'Carlos', lastName: 'Morales',   position: 'Assistant Manager', phone: '(512) 421-1105', payType: 'salary', storeIdx: 0, hireOffset: 730 },
    { firstName: 'Rosa',   lastName: 'Perez',     position: 'Bakery Clerk',      phone: '(512) 421-1106', payType: 'hourly', storeIdx: 2, hireOffset: 60  },
    { firstName: 'Luis',   lastName: 'Torres',    position: 'Stock Associate',   phone: '(512) 421-1107', payType: 'hourly', storeIdx: 1, hireOffset: 120 },
  ]
  const daysBack = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }
  const nextYear = () => new Date(new Date().setFullYear(new Date().getFullYear() + 1))
  let dummyCreated = 0
  for (const emp of DUMMY_EMPLOYEES) {
    // Dedup by phone only — lastName may be NULL on pre-migration records
    const existing = await prisma.profile.findFirst({ where: { phone: emp.phone } })
    if (existing) {
      // Always restore intended names for dummy employees
      await prisma.profile.update({
        where: { id: existing.id },
        data:  { firstName: emp.firstName, lastName: emp.lastName },
      })
    } else {
      await prisma.profile.create({
        data: {
          id:             randomUUID(),
          firstName:      emp.firstName,
          lastName:       emp.lastName,
          position:       emp.position,
          phone:          emp.phone,
          payType:        emp.payType,
          role:           'staff',
          isActive:       true,
          storeId:        storeIds[emp.storeIdx],
          hireDate:       daysBack(emp.hireOffset),
          employeeNumber: `EMP-${String(100 + dummyCreated + 1).padStart(3, '0')}`,
          i9Verified:     dummyCreated % 2 === 0,
          foodHandlerCertExpiry: dummyCreated === 2
            ? daysBack(5)   // expired cert for testing
            : nextYear(),
        },
      })
      dummyCreated++
    }
  }
  console.log(`  Created ${dummyCreated} dummy staff employees (patched existing if needed).`)

  // ── 6d. Seed HR fields on existing profiles ──────────────────────────────────
  console.log('\n  Seeding HR profile data...')
  const positions = ['Owner', 'Store Manager', 'Cashier', 'Stock Associate', 'Produce Clerk']
  const payTypes  = ['salary', 'hourly', 'hourly', 'hourly', 'hourly']
  const phones    = ['(512) 555-1001', '(512) 555-1002', '(512) 555-1003', '(512) 555-1004', '(512) 555-1005']
  // Seed names for auth-user profiles — 30 unique names, no overlaps with DUMMY_EMPLOYEES
  const seedNames = [
    { firstName: 'Roberto',   lastName: 'Garza'     },
    { firstName: 'Carmen',    lastName: 'Vega'      },
    { firstName: 'Miguel',    lastName: 'Salinas'   },
    { firstName: 'Isabel',    lastName: 'Fuentes'   },
    { firstName: 'Alejandro', lastName: 'Cruz'      },
    { firstName: 'Patricia',  lastName: 'Moreno'    },
    { firstName: 'Fernando',  lastName: 'Castillo'  },
    { firstName: 'Lucia',     lastName: 'Mendoza'   },
    { firstName: 'Ricardo',   lastName: 'Flores'    },
    { firstName: 'Valentina', lastName: 'Reyes'     },
    { firstName: 'Eduardo',   lastName: 'Jimenez'   },
    { firstName: 'Adriana',   lastName: 'Soto'      },
    { firstName: 'Hector',    lastName: 'Ramirez'   },
    { firstName: 'Gabriela',  lastName: 'Nunez'     },
    { firstName: 'Andres',    lastName: 'Vargas'    },
    { firstName: 'Daniela',   lastName: 'Aguilar'   },
    { firstName: 'Marco',     lastName: 'Ortega'    },
    { firstName: 'Claudia',   lastName: 'Delgado'   },
    { firstName: 'Sergio',    lastName: 'Medina'    },
    { firstName: 'Alicia',    lastName: 'Sandoval'  },
    { firstName: 'Victor',    lastName: 'Espinoza'  },
    { firstName: 'Norma',     lastName: 'Ibarra'    },
    { firstName: 'Oscar',     lastName: 'Ramos'     },
    { firstName: 'Silvia',    lastName: 'Contreras' },
    { firstName: 'Ernesto',   lastName: 'Pacheco'   },
    { firstName: 'Veronica',  lastName: 'Leal'      },
    { firstName: 'Arturo',    lastName: 'Herrera'   },
    { firstName: 'Estela',    lastName: 'Miranda'   },
    { firstName: 'Ramon',     lastName: 'Cisneros'  },
    { firstName: 'Gloria',    lastName: 'Trujillo'  },
  ]
  // Skip dummy employees (identified by their 421- phone range) so 6b names aren't overwritten
  const dummyPhones = new Set(['(512) 421-1100','(512) 421-1101','(512) 421-1102','(512) 421-1103','(512) 421-1104','(512) 421-1105','(512) 421-1106','(512) 421-1107'])
  const authProfiles = allProfiles.filter(p => !dummyPhones.has(p.phone ?? ''))

  const now = new Date()
  const daysBeforeNow = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }

  for (let i = 0; i < authProfiles.length; i++) {
    const p = authProfiles[i]
    // Spread cert expiry dates: some valid, some expiring soon, one expired
    let certExpiry: Date | null = null
    if (i === 0) certExpiry = daysBeforeNow(10)              // expired 10 days ago
    else if (i === 1) certExpiry = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20) // 20 days left
    else certExpiry = new Date(now.getFullYear() + 1, now.getMonth(), 15) // ~1yr valid

    const hrData = {
      position:                 positions[i % positions.length],
      payType:                  payTypes[i % payTypes.length],
      phone:                    p.phone ?? phones[i % phones.length],
      emergencyContactName:     `Emergency Contact ${i + 1}`,
      emergencyContactPhone:    `(512) 555-${String(2000 + i).padStart(4, '0')}`,
      emergencyContactRelation: i % 2 === 0 ? 'Spouse' : 'Parent',
      i9Verified:               i < 3, // first 3 verified
      i9VerificationDate:       i < 3 ? daysBeforeNow(30) : null,
    }

    // Assign unique names — auth profiles only (dummy employees handled in 6b)
    const { firstName, lastName } = seedNames[i % seedNames.length]
    const nameData = { firstName, lastName }

    await prisma.profile.update({
      where: { id: p.id },
      data: {
        ...nameData,
        hireDate: daysBeforeNow(90 + i * 30),
        ...hrData,
        foodHandlerCertExpiry: certExpiry,
      },
    })
  }
  console.log(`  Seeded HR data for ${authProfiles.length} auth profiles (dummy employees skipped).`)

  // ── 7. Purchase Orders ────────────────────────────────────────────────────────
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d
  }

  type POSeed = { poNumber: string; status: string; supplierName: string; daysAgo: number; notes?: string }
  const POS: POSeed[] = [
    { poNumber: 'PO-2026-0001', status: 'received',  supplierName: 'Fiesta Produce Co.',       daysAgo: 45, notes: 'Weekly produce order — full delivery received.' },
    { poNumber: 'PO-2026-0002', status: 'received',  supplierName: 'Sysco Mexican Foods',      daysAgo: 38, notes: 'Dry goods restocking. Minor shortage on Maseca.' },
    { poNumber: 'PO-2026-0003', status: 'received',  supplierName: 'La Preferida Distribution',daysAgo: 30, notes: 'Dairy and specialty items.' },
    { poNumber: 'PO-2026-0004', status: 'shipped',   supplierName: 'Fiesta Produce Co.',       daysAgo: 5,  notes: 'Standard weekly order — in transit.' },
    { poNumber: 'PO-2026-0005', status: 'sent',      supplierName: 'Texas Star Beverages',     daysAgo: 3,  notes: 'Beverage restock for all three stores.' },
    { poNumber: 'PO-2026-0006', status: 'sent',      supplierName: 'Gulf Coast Seafood',       daysAgo: 2,  notes: 'Weekend shrimp delivery.' },
    { poNumber: 'PO-2026-0007', status: 'draft',     supplierName: 'Sysco Mexican Foods',      daysAgo: 1,  notes: 'Next month dry goods — still adding items.' },
    { poNumber: 'PO-2026-0008', status: 'cancelled', supplierName: 'La Preferida Distribution',daysAgo: 20, notes: 'Cancelled — supplier out of stock.' },
  ]

  console.log('\n  Upserting purchase orders...')
  const poMap: Record<string, string> = {}
  for (const po of POS) {
    const record = await prisma.purchaseOrder.upsert({
      where:  { poNumber: po.poNumber },
      update: { status: po.status, notes: po.notes },
      create: {
        poNumber:   po.poNumber,
        supplierId: supplierMap[po.supplierName]!,
        status:     po.status,
        createdBy:  sysUserId,
        notes:      po.notes ?? null,
        createdAt:  daysAgo(po.daysAgo),
        receivedAt: po.status === 'received' ? daysAgo(po.daysAgo - 2) : null,
        shippedAt:  po.status === 'shipped'  ? daysAgo(1) : null,
      },
    })
    poMap[po.poNumber] = record.id
    console.log(`    ✓ ${po.poNumber} (${po.status})`)
  }

  // PO items — add a few items to each PO (skip if PO already has items)
  const poItemCounts = await prisma.purchaseOrderItem.groupBy({ by: ['purchaseOrderId'], _count: { id: true } })
  const poWithItems = new Set(poItemCounts.map(x => x.purchaseOrderId))

  type POItemSeed = { sku: string; qty: number; cost: string }
  const PO_ITEMS: Record<string, POItemSeed[]> = {
    'PO-2026-0001': [
      { sku: 'PRD-AVO-001', qty: 48,  cost: '0.55' },
      { sku: 'PRD-JAL-001', qty: 20,  cost: '0.80' },
      { sku: 'PRD-LIM-001', qty: 25,  cost: '0.60' },
      { sku: 'PRD-CIL-001', qty: 30,  cost: '0.30' },
    ],
    'PO-2026-0002': [
      { sku: 'DRY-MAS-001', qty: 24, cost: '2.80' },
      { sku: 'DRY-PIN-001', qty: 50, cost: '0.65' },
      { sku: 'DRY-RIC-001', qty: 50, cost: '0.45' },
      { sku: 'DRY-ABU-001', qty: 12, cost: '2.10' },
    ],
    'PO-2026-0003': [
      { sku: 'DAI-CRM-001', qty: 16, cost: '1.50' },
      { sku: 'DAI-QFR-001', qty: 12, cost: '2.20' },
      { sku: 'DAI-COT-001', qty: 8,  cost: '2.40' },
      { sku: 'MEA-CHO-001', qty: 12, cost: '2.50' },
    ],
    'PO-2026-0004': [
      { sku: 'PRD-AVO-001', qty: 48, cost: '0.55' },
      { sku: 'PRD-TOM-001', qty: 20, cost: '0.70' },
      { sku: 'PRD-MAN-001', qty: 24, cost: '0.45' },
    ],
    'PO-2026-0005': [
      { sku: 'BEV-JRT-MAN', qty: 48, cost: '0.65' },
      { sku: 'BEV-JRT-TAM', qty: 48, cost: '0.65' },
      { sku: 'BEV-MOD-001', qty: 8,  cost: '11.00' },
      { sku: 'BEV-COK-001', qty: 48, cost: '0.90' },
    ],
    'PO-2026-0006': [
      { sku: 'MEA-SHR-001', qty: 20, cost: '7.00' },
    ],
    'PO-2026-0007': [
      { sku: 'DRY-MAS-001', qty: 36, cost: '2.75' },
      { sku: 'DRY-TOR-001', qty: 40, cost: '1.80' },
    ],
    'PO-2026-0008': [
      { sku: 'DAI-COT-001', qty: 16, cost: '2.40' },
    ],
  }

  for (const [poNumber, items] of Object.entries(PO_ITEMS)) {
    const poId = poMap[poNumber]
    if (!poId || poWithItems.has(poId)) continue
    for (const item of items) {
      const pid = productMap[item.sku]
      if (!pid) continue
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: poId,
          productId:       pid,
          qtyOrdered:      item.qty,
          qtyReceived:     ['PO-2026-0001','PO-2026-0002','PO-2026-0003'].includes(poNumber) ? item.qty : null,
          unitCost:        item.cost,
        },
      })
    }
  }
  console.log('  Purchase order items added.')

  // ── 8. Stock Ledger (90 days of history) ─────────────────────────────────────
  console.log('\n  Creating stock ledger entries (90-day history)...')

  const existingLedgerCount = await prisma.stockLedger.count()
  if (existingLedgerCount > 20) {
    console.log(`    Skipping — ${existingLedgerCount} entries already exist.`)
  } else {
    // Initial receiving entries (received from POs, 45-90 days ago)
    const initialStock: Record<string, number> = {
      'PRD-AVO-001': 96, 'PRD-JAL-001': 40, 'PRD-TOM-001': 35, 'PRD-CIL-001': 50,
      'PRD-LIM-001': 40, 'PRD-MAN-001': 36, 'PRD-NOP-001': 15,
      'DRY-MAS-001': 48, 'DRY-ABU-001': 24, 'DRY-PIN-001': 100,'DRY-RIC-001': 100,
      'DRY-CHI-001': 24, 'DRY-TOR-001': 60, 'DRY-SAL-001': 24,
      'DAI-CRM-001': 32, 'DAI-QFR-001': 24, 'DAI-COT-001': 16, 'DAI-MAN-001': 16,
      'MEA-GBF-001': 30, 'MEA-CHO-001': 24, 'MEA-CAR-001': 15, 'MEA-SKT-001': 15,
      'MEA-SHR-001': 20,
      'BEV-JRT-MAN': 96, 'BEV-JRT-TAM': 96, 'BEV-JAM-001': 32, 'BEV-HOR-001': 32,
      'BEV-MOD-001': 16, 'BEV-COK-001': 96,
    }

    let ledgerIdx = 0
    for (const [sku, qty] of Object.entries(initialStock)) {
      const pid = productMap[sku]
      if (!pid) continue
      await prisma.stockLedger.create({
        data: {
          productId:   pid,
          changeQty:   qty,
          reason:      'received',
          note:        'Initial stock',
          performedBy: sysUserId,
          externalId:  `seed-init-${sku}`,
          createdAt:   daysAgo(85 + (ledgerIdx % 10)),
        },
      })
      ledgerIdx++
    }
    console.log(`    ✓ Initial receiving entries (${Object.keys(initialStock).length} products)`)

    // Daily sales/adjustments over 90 days
    const dailySales: Array<{ sku: string; avgSale: number }> = [
      { sku: 'PRD-AVO-001', avgSale: 8  }, { sku: 'PRD-JAL-001', avgSale: 3  },
      { sku: 'PRD-LIM-001', avgSale: 3  }, { sku: 'PRD-CIL-001', avgSale: 5  },
      { sku: 'PRD-MAN-001', avgSale: 4  },
      { sku: 'DRY-MAS-001', avgSale: 4  }, { sku: 'DRY-PIN-001', avgSale: 8  },
      { sku: 'DRY-RIC-001', avgSale: 6  }, { sku: 'DRY-TOR-001', avgSale: 8  },
      { sku: 'DAI-CRM-001', avgSale: 4  }, { sku: 'DAI-QFR-001', avgSale: 3  },
      { sku: 'MEA-GBF-001', avgSale: 5  }, { sku: 'MEA-CHO-001', avgSale: 3  },
      { sku: 'BEV-JRT-MAN', avgSale: 10 }, { sku: 'BEV-JRT-TAM', avgSale: 8  },
      { sku: 'BEV-COK-001', avgSale: 12 }, { sku: 'BEV-MOD-001', avgSale: 2  },
    ]

    // Mid-period restocking runs
    const restockDays = [60, 45, 30, 15, 7]
    for (const dayOffset of restockDays) {
      for (const item of dailySales.slice(0, 10)) {
        const pid = productMap[item.sku]
        if (!pid) continue
        const restockQty = item.avgSale * 14  // ~2 weeks of supply
        const extId = `seed-restock-${item.sku}-${dayOffset}`
        const existing = await prisma.stockLedger.findUnique({ where: { externalId: extId } })
        if (!existing) {
          await prisma.stockLedger.create({
            data: {
              productId:   pid,
              changeQty:   restockQty,
              reason:      'received',
              note:        'Scheduled restocking',
              performedBy: sysUserId,
              externalId:  extId,
              createdAt:   daysAgo(dayOffset),
            },
          })
        }
      }
    }
    console.log('    ✓ Restocking entries across 90 days')

    // Daily sale entries (every 2 days, last 60 days, ~5 products/day)
    for (let day = 60; day >= 0; day -= 2) {
      const dayProducts = dailySales.filter((_, i) => (i + day) % 3 === 0).slice(0, 5)
      for (const item of dayProducts) {
        const pid = productMap[item.sku]
        if (!pid) continue
        const qty = Math.max(1, item.avgSale + (day % 3) - 1)
        const extId = `seed-sold-${item.sku}-day${day}`
        const existing = await prisma.stockLedger.findUnique({ where: { externalId: extId } })
        if (!existing) {
          await prisma.stockLedger.create({
            data: {
              productId:   pid,
              changeQty:   -qty,
              reason:      'sold',
              performedBy: sysUserId,
              externalId:  extId,
              createdAt:   daysAgo(day),
            },
          })
        }
      }
    }
    console.log('    ✓ Daily sales entries (60-day history)')

    // Adjustments (spoilage on perishables)
    const spoilageItems = [
      { sku: 'PRD-CIL-001', qty: 4, day: 40 },
      { sku: 'DAI-CRM-001', qty: 2, day: 35 },
      { sku: 'PRD-AVO-001', qty: 6, day: 25 },
      { sku: 'MEA-GBF-001', qty: 3, day: 20 },
      { sku: 'BEV-HOR-001', qty: 4, day: 15 },
      { sku: 'PRD-MAN-001', qty: 3, day: 10 },
      { sku: 'DAI-QFR-001', qty: 2, day: 8  },
    ]
    for (const s of spoilageItems) {
      const pid = productMap[s.sku]
      if (!pid) continue
      const extId = `seed-spoilage-${s.sku}-day${s.day}`
      const existing = await prisma.stockLedger.findUnique({ where: { externalId: extId } })
      if (!existing) {
        await prisma.stockLedger.create({
          data: {
            productId:   pid,
            changeQty:   -s.qty,
            reason:      'spoilage',
            note:        'Expired product removed from floor',
            performedBy: sysUserId,
            externalId:  extId,
            createdAt:   daysAgo(s.day),
          },
        })
      }
    }
    console.log('    ✓ Spoilage adjustment entries')
  }

  // ── 9. Project Tasks ─────────────────────────────────────────────────────────
  console.log('\n  Upserting project tasks...')

  type TaskSeed = { title: string; description: string; status: string; priority: string; assignee: string; daysUntilDue: number }
  const TASKS: TaskSeed[] = [
    // Backlog
    { title: 'Set up automated low-stock email alerts', description: 'When a product drops below its reorder point, send an email to managers automatically via Resend or SendGrid.', status: 'backlog', priority: 'high', assignee: 'Owner', daysUntilDue: 30 },
    { title: 'Build customer-facing product catalog page', description: 'Public /products page showing current inventory with photos, prices, and categories.', status: 'backlog', priority: 'medium', assignee: 'Owner', daysUntilDue: 60 },
    { title: 'Add barcode scanner support to Receive Goods', description: 'Allow staff to scan a product barcode to auto-fill SKU in the Receive Goods form.', status: 'backlog', priority: 'low', assignee: 'Manager', daysUntilDue: 90 },
    // In Progress
    { title: 'Integrate POS sales data into stock ledger', description: 'Build POST /api/webhooks/pos endpoint. Accept Square webhook, validate HMAC signature, create sold ledger entries, deduplicate via external_id.', status: 'in_progress', priority: 'high', assignee: 'Owner', daysUntilDue: 14 },
    { title: 'Multi-store inventory reports', description: 'Add store filter to all report pages so managers can view stock snapshots per location.', status: 'in_progress', priority: 'medium', assignee: 'Manager', daysUntilDue: 7 },
    { title: 'Staff scheduling mobile improvements', description: 'Make the weekly schedule grid responsive on phone screens. Managers use phones on the floor.', status: 'in_progress', priority: 'medium', assignee: 'Manager', daysUntilDue: 10 },
    // Review
    { title: 'Payroll export to QuickBooks CSV format', description: 'Export payroll period summary as a CSV importable into QuickBooks Online. Map columns per their import spec.', status: 'review', priority: 'high', assignee: 'Owner', daysUntilDue: 5 },
    { title: 'Dark mode polish pass', description: 'Check all pages in dark mode for contrast issues. Fix any remaining hard-coded light colors.', status: 'review', priority: 'low', assignee: 'Owner', daysUntilDue: 3 },
    // Done
    { title: 'Add store locations to inventory and staff', description: 'Added Store model with 3 locations. Products and profiles can be assigned to a specific store.', status: 'done', priority: 'medium', assignee: 'Owner', daysUntilDue: -1 },
    { title: 'Fix dark mode sidebar staying dark in light mode', description: 'Removed dark:bg-[#1a1714] from sidebar — was compiled as media query, not class toggle.', status: 'done', priority: 'high', assignee: 'Owner', daysUntilDue: -1 },
    { title: 'Analytics page with date range filter', description: 'Built executive analytics dashboard with 90-day stock flow chart, KPI cards, category breakdown.', status: 'done', priority: 'medium', assignee: 'Owner', daysUntilDue: -1 },
    { title: 'Seed all database tables with dummy data', description: 'Comprehensive seed.ts covering stores, products, POs, stock ledger, tasks, schedule, payroll.', status: 'done', priority: 'low', assignee: 'Owner', daysUntilDue: -1 },
  ]

  for (const t of TASKS) {
    const existing = await prisma.projectTask.findFirst({ where: { title: t.title } })
    if (!existing) {
      const due = new Date()
      due.setDate(due.getDate() + t.daysUntilDue)
      await prisma.projectTask.create({
        data: {
          title:       t.title,
          description: t.description,
          status:      t.status,
          priority:    t.priority,
          assignee:    t.assignee,
          dueDate:     t.daysUntilDue > 0 ? due : null,
          createdBy:   sysUserId,
        },
      })
      console.log(`    ✓ [${t.status}] ${t.title}`)
    }
  }

  // ── 10. Schedule (3 weeks of shifts) ─────────────────────────────────────────
  console.log('\n  Creating schedule shifts...')

  const shiftsExist = await prisma.schedule.count()
  if (shiftsExist > 10) {
    console.log(`    Skipping — ${shiftsExist} shifts already exist.`)
  } else {
    const profiles2 = await prisma.profile.findMany({ orderBy: { createdAt: 'asc' } })
    if (profiles2.length === 0) {
      console.log('    No profiles found — skipping schedule.')
    } else {
      // 3 weeks: 2 weeks ago, last week, this week
      const weekOffsets = [-14, -7, 0]
      const SHIFTS = [
        // Mon, Tue, Wed, Thu, Fri, Sat = day 0–5
        { day: 0, start: '08:00', end: '14:00', position: 'Cashier' },
        { day: 1, start: '08:00', end: '14:00', position: 'Cashier' },
        { day: 2, start: '08:00', end: '14:00', position: 'Stock'   },
        { day: 3, start: '10:00', end: '18:00', position: 'Cashier' },
        { day: 4, start: '10:00', end: '18:00', position: 'Stock'   },
        { day: 5, start: '08:00', end: '16:00', position: 'Cashier' },
        { day: 0, start: '14:00', end: '21:00', position: 'Stock'   },
        { day: 1, start: '14:00', end: '21:00', position: 'Cashier' },
        { day: 2, start: '14:00', end: '21:00', position: 'Stock'   },
        { day: 3, start: '14:00', end: '21:00', position: 'Manager on Duty' },
        { day: 4, start: '14:00', end: '21:00', position: 'Cashier' },
        { day: 5, start: '16:00', end: '21:00', position: 'Cashier' },
      ]

      for (const weekDelta of weekOffsets) {
        const ws = new Date()
        const day = ws.getDay()
        const diff = day === 0 ? -6 : 1 - day
        ws.setDate(ws.getDate() + diff + weekDelta)
        ws.setHours(0, 0, 0, 0)

        for (let si = 0; si < SHIFTS.length; si++) {
          const shift = SHIFTS[si]
          const prof = profiles2[si % profiles2.length]
          await prisma.schedule.create({
            data: {
              profileId: prof.id,
              weekStart: ws,
              dayOfWeek: shift.day,
              startTime: shift.start,
              endTime:   shift.end,
              position:  shift.position,
              createdBy: sysUserId,
            },
          })
        }
      }
      console.log(`    ✓ Created shifts for ${weekOffsets.length} weeks × ${SHIFTS.length} slots across ${profiles2.length} profile(s).`)
    }
  }

  // ── 11. Payroll Periods + Entries ────────────────────────────────────────────
  console.log('\n  Creating payroll periods...')

  const payProfiles = await prisma.profile.findMany({ orderBy: { createdAt: 'asc' } })
  const HOURLY_RATES: number[] = [15.00, 16.50, 18.00, 20.00, 24.00]

  const periodDefs = [
    { start: daysAgo(28), end: daysAgo(22), status: 'closed' },
    { start: daysAgo(21), end: daysAgo(15), status: 'closed' },
    { start: daysAgo(14), end: daysAgo(8),  status: 'closed' },
    { start: daysAgo(7),  end: daysAgo(1),  status: 'open'   },
  ]

  for (let pi = 0; pi < periodDefs.length; pi++) {
    const pd = periodDefs[pi]
    let period = await prisma.payrollPeriod.findFirst({
      where: { periodStart: pd.start },
    })
    if (!period) {
      period = await prisma.payrollPeriod.create({
        data: {
          periodStart: pd.start,
          periodEnd:   pd.end,
          frequency:   'weekly',
          status:      pd.status,
          createdBy:   sysUserId,
        },
      })
      console.log(`    ✓ Period ${pd.start.toDateString()} – ${pd.end.toDateString()} (${pd.status})`)

      if (payProfiles.length > 0) {
        for (let ei = 0; ei < payProfiles.length; ei++) {
          const prof = payProfiles[ei]
          const existing = await prisma.payrollEntry.findFirst({
            where: { payrollPeriodId: period.id, profileId: prof.id },
          })
          if (!existing) {
            const baseHours = 32 + (ei % 4) * 2
            const actualHours = pd.status === 'closed'
              ? (baseHours + (pi % 3) - 1).toString()
              : null
            await prisma.payrollEntry.create({
              data: {
                payrollPeriodId: period.id,
                profileId:       prof.id,
                hourlyRate:      HOURLY_RATES[ei % HOURLY_RATES.length].toFixed(2),
                actualHours:     actualHours,
                createdBy:       sysUserId,
              },
            })
          }
        }
        console.log(`      → ${payProfiles.length} payroll entries created`)
      }
    }
  }

  // ── 12. Time Entries (Timekeeping) ──────────────────────────────────────────
  console.log('\n  Creating time entries...')

  const existingTimeEntries = await prisma.timeEntry.count()
  if (existingTimeEntries > 10) {
    console.log(`    Skipping — ${existingTimeEntries} time entries already exist.`)
  } else {
    // Fetch all profiles with their store assignments
    const staffProfiles = await prisma.profile.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, storeId: true },
    })

    // Generate ~3 weeks of clock-in/out entries, spread across profiles/stores
    // 5 days/week × 3 weeks = 15 work days
    let teCount = 0
    for (let dayOffset = 21; dayOffset >= 1; dayOffset--) {
      const date = new Date()
      date.setDate(date.getDate() - dayOffset)
      const dow = date.getDay()
      if (dow === 0 || dow === 6) continue  // skip weekends

      // Pick 3–5 staff members for each day
      const dayStaff = staffProfiles.filter((_, i) => (i + dayOffset) % 3 !== 0).slice(0, 5)
      for (const prof of dayStaff) {
        const storeId = prof.storeId ?? storeIds[0]
        const extId = `seed-te-${prof.id}-day${dayOffset}`
        const existing = await prisma.timeEntry.findFirst({ where: { notes: extId } })
        if (existing) continue

        // Shift: morning (8–16) or afternoon (12–20), vary by profile index
        const idx = staffProfiles.findIndex(p => p.id === prof.id)
        const isMorning = idx % 2 === 0
        const clockIn = new Date(date)
        clockIn.setHours(isMorning ? 8 : 12, Math.floor(Math.random() * 10), 0, 0)
        const clockOut = new Date(date)
        clockOut.setHours(isMorning ? 16 : 20, Math.floor(Math.random() * 15), 0, 0)
        const breakMins = 30
        const hoursWorked = ((clockOut.getTime() - clockIn.getTime()) / 3600000 - breakMins / 60).toFixed(2)

        await prisma.timeEntry.create({
          data: {
            profileId:    prof.id,
            storeId,
            clockInAt:    clockIn,
            clockOutAt:   clockOut,
            breakMinutes: breakMins,
            hoursWorked,
            source:       'clock_in_app',
            approvedBy:   sysUserId,
            notes:        extId,
            createdBy:    sysUserId,
          },
        })
        teCount++
      }
    }
    console.log(`    ✓ Created ${teCount} time entries across 3 weeks.`)
  }

  // ── 13. Time-Off Requests ─────────────────────────────────────────────────
  console.log('\n  Creating time-off requests...')

  const existingTimeOff = await (prisma as unknown as {
    timeOffRequest: { count: () => Promise<number> }
  }).timeOffRequest.count()

  if (existingTimeOff > 0) {
    console.log(`    Skipping — ${existingTimeOff} time-off requests already exist.`)
  } else {
    const torProfiles = await prisma.profile.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })

    type TORSeed = {
      profileIdx: number; type: string; startOffset: number; days: number
      status: string; note?: string; approvedOffset?: number
    }
    const TOR_SEEDS: TORSeed[] = [
      // N. Lamar staff
      { profileIdx: 0, type: 'vacation',  startOffset: -30, days: 5,  status: 'approved', note: 'Family trip to Mexico City', approvedOffset: -35 },
      { profileIdx: 1, type: 'sick',      startOffset: -10, days: 2,  status: 'approved', note: 'Flu — doctor note submitted', approvedOffset: -10 },
      { profileIdx: 3, type: 'personal',  startOffset:  14, days: 1,  status: 'pending',  note: 'Moving apartments' },
      // Cameron Rd staff
      { profileIdx: 4, type: 'vacation',  startOffset:  21, days: 3,  status: 'pending',  note: 'Spring break with kids' },
      { profileIdx: 5, type: 'sick',      startOffset:  -5, days: 1,  status: 'denied',   note: 'Called in sick (no notice)', approvedOffset: -5 },
      { profileIdx: 6, type: 'personal',  startOffset: -45, days: 2,  status: 'approved', note: 'Court date', approvedOffset: -46 },
      // I-35 staff
      { profileIdx: 2, type: 'vacation',  startOffset:  30, days: 5,  status: 'pending',  note: 'Summer vacation' },
      { profileIdx: 7, type: 'holiday',   startOffset: -60, days: 1,  status: 'approved', note: 'Día de los Muertos', approvedOffset: -62 },
      { profileIdx: 8, type: 'sick',      startOffset:  -3, days: 1,  status: 'pending',  note: 'Stomach bug' },
      // Remaining — spread across stores
      { profileIdx: 0, type: 'personal',  startOffset:  45, days: 2,  status: 'pending',  note: 'Appointment' },
      { profileIdx: 9, type: 'vacation',  startOffset: -90, days: 7,  status: 'approved', note: 'Annual leave', approvedOffset: -92 },
    ]

    for (const seed of TOR_SEEDS) {
      const prof = torProfiles[seed.profileIdx % torProfiles.length]
      if (!prof) continue
      const dateStart = new Date()
      dateStart.setDate(dateStart.getDate() + seed.startOffset)
      const dateEnd = new Date(dateStart)
      dateEnd.setDate(dateEnd.getDate() + seed.days - 1)

      await (prisma as unknown as {
        timeOffRequest: { create: (args: object) => Promise<unknown> }
      }).timeOffRequest.create({
        data: {
          profileId:  prof.id,
          type:       seed.type,
          dateStart,
          dateEnd,
          totalDays:  seed.days,
          status:     seed.status,
          note:       seed.note ?? null,
          approvedBy: seed.approvedOffset !== undefined ? sysUserId : null,
          approvedAt: seed.approvedOffset !== undefined
            ? (() => { const d = new Date(); d.setDate(d.getDate() + seed.approvedOffset!); return d })()
            : null,
          createdBy: prof.id,
        },
      })
    }
    console.log(`    ✓ Created ${TOR_SEEDS.length} time-off requests.`)
  }

  // ── 14. Notifications ────────────────────────────────────────────────────────
  console.log('\n  Creating notifications...')

  const existingNotifications = await prisma.notification.count()
  if (existingNotifications > 0) {
    console.log(`    Skipping — ${existingNotifications} notifications already exist.`)
  } else {
    type NotifSeed = {
      type: string; title: string; body: string
      isRead: boolean; daysAgoN: number; link?: string
    }
    const NOTIFS: NotifSeed[] = [
      { type: 'low_stock',          title: 'Low Stock: Avocado',              body: 'Avocado (PRD-AVO-001) is at or below its reorder point of 24 units.',           isRead: false, daysAgoN: 0,  link: '/dashboard/inventory' },
      { type: 'low_stock',          title: 'Low Stock: Ground Beef 80/20',    body: 'Ground Beef 80/20 (MEA-GBF-001) is at or below its reorder point of 10 units.', isRead: false, daysAgoN: 1,  link: '/dashboard/inventory' },
      { type: 'po_overdue',         title: 'PO Overdue: PO-2026-0004',        body: 'Purchase order PO-2026-0004 from Fiesta Produce Co. has been in "shipped" status for over 5 days.', isRead: false, daysAgoN: 2, link: '/dashboard/purchase-orders' },
      { type: 'food_handler_expiry',title: 'Food Handler Cert Expiring',      body: 'Employee #1\'s food handler certification expired 10 days ago. Schedule renewal immediately.', isRead: false, daysAgoN: 3,  link: '/dashboard/employees' },
      { type: 'food_handler_expiry',title: 'Food Handler Cert Expiring Soon', body: 'One employee\'s food handler certification expires in 20 days. Schedule renewal now.', isRead: true, daysAgoN: 5, link: '/dashboard/employees' },
      { type: 'count_variance',     title: 'Inventory Count Variance',        body: 'Completed count at N. Lamar found a −8 unit variance on Jalapeño Peppers. A correction entry has been logged.', isRead: true,  daysAgoN: 7,  link: '/dashboard/inventory/counts' },
      { type: 'low_stock',          title: 'Low Stock: Cilantro',             body: 'Cilantro (PRD-CIL-001) is at or below its reorder point of 12 units.',           isRead: true,  daysAgoN: 8,  link: '/dashboard/inventory' },
      { type: 'general',            title: 'Seed Data Loaded',                body: 'Development seed data has been loaded successfully. All 3 store locations are populated.', isRead: true, daysAgoN: 10, link: undefined },
      { type: 'po_overdue',         title: 'PO Received: PO-2026-0003',       body: 'Purchase order PO-2026-0003 from La Preferida Distribution has been marked received.', isRead: true, daysAgoN: 12, link: '/dashboard/purchase-orders' },
      { type: 'shift_reminder',     title: 'Shift Coverage Gap',              body: 'Friday at I-35 has no cashier scheduled for the afternoon shift. Please assign staff.', isRead: false, daysAgoN: 1, link: '/dashboard/schedule' },
    ]

    for (const n of NOTIFS) {
      const createdAt = daysAgo(n.daysAgoN)
      await prisma.notification.create({
        data: {
          profileId: sysUserId,
          type:      n.type,
          title:     n.title,
          body:      n.body,
          isRead:    n.isRead,
          readAt:    n.isRead ? createdAt : null,
          link:      n.link ?? null,
          createdAt,
        },
      })
    }
    console.log(`    ✓ Created ${NOTIFS.length} notifications.`)
  }

  // ── 15. Inventory Counts ─────────────────────────────────────────────────────
  console.log('\n  Creating inventory counts...')

  const existingCounts = await prisma.inventoryCount.count()
  if (existingCounts > 0) {
    console.log(`    Skipping — ${existingCounts} inventory counts already exist.`)
  } else {
    // Fetch all product IDs with their cost prices for variance value calculation
    const countProducts = await prisma.product.findMany({
      where:  { isActive: true },
      select: { id: true, sku: true, costPrice: true },
    })
    if (countProducts.length === 0) {
      console.log('    No products found — skipping inventory counts.')
    } else {
      type CountDef = {
        storeIdx: number; daysAgoN: number; status: string
        notes?: string; items: { sku: string; systemQty: number; countedQty: number }[]
      }
      const COUNT_DEFS: CountDef[] = [
        // N. Lamar — completed count
        {
          storeIdx: 0, daysAgoN: 14, status: 'completed',
          notes: 'Monthly full count — all categories',
          items: [
            { sku: 'PRD-AVO-001', systemQty: 30, countedQty: 28 },
            { sku: 'PRD-JAL-001', systemQty: 12, countedQty: 12 },
            { sku: 'PRD-LIM-001', systemQty: 18, countedQty: 16 },
            { sku: 'DRY-MAS-001', systemQty: 22, countedQty: 22 },
            { sku: 'DRY-PIN-001', systemQty: 45, countedQty: 43 },
            { sku: 'BEV-JRT-MAN', systemQty: 60, countedQty: 58 },
            { sku: 'BEV-COK-001', systemQty: 48, countedQty: 50 },
          ],
        },
        // Cameron Rd — completed count
        {
          storeIdx: 1, daysAgoN: 7, status: 'completed',
          notes: 'Spot check — produce and dairy only',
          items: [
            { sku: 'PRD-CIL-001', systemQty: 10, countedQty:  8 },
            { sku: 'PRD-MAN-001', systemQty: 15, countedQty: 15 },
            { sku: 'DAI-CRM-001', systemQty:  8, countedQty:  7 },
            { sku: 'DAI-QFR-001', systemQty:  6, countedQty:  6 },
            { sku: 'MEA-SHR-001', systemQty:  5, countedQty:  4 },
          ],
        },
        // I-35 — in-progress count
        {
          storeIdx: 2, daysAgoN: 1, status: 'in_progress',
          notes: 'Quarterly count — in progress',
          items: [
            { sku: 'PRD-AVO-001', systemQty: 20, countedQty: 20 },
            { sku: 'DRY-TOR-001', systemQty: 18, countedQty: 17 },
            { sku: 'BEV-MOD-001', systemQty:  4, countedQty:  3 },
          ],
        },
        // N. Lamar — draft count (most recent)
        {
          storeIdx: 0, daysAgoN: 0, status: 'draft',
          notes: 'Weekly produce spot-check',
          items: [
            { sku: 'PRD-AVO-001', systemQty: 24, countedQty: 24 },
            { sku: 'PRD-JAL-001', systemQty: 10, countedQty: 10 },
          ],
        },
      ]

      for (const def of COUNT_DEFS) {
        const storeId = storeIds[def.storeIdx]
        if (!storeId) continue
        const createdAt = daysAgo(def.daysAgoN)

        const count = await prisma.inventoryCount.create({
          data: {
            storeId,
            status:      def.status,
            notes:       def.notes ?? null,
            countedBy:   sysUserId,
            completedBy: def.status === 'completed' ? sysUserId : null,
            completedAt: def.status === 'completed' ? createdAt : null,
            createdAt,
          },
        })

        for (const item of def.items) {
          const product = countProducts.find(p => p.sku === item.sku)
          if (!product) continue
          const variance    = item.countedQty - item.systemQty
          const costPrice   = Number(product.costPrice ?? 0)
          const varianceVal = (variance * costPrice).toFixed(2)
          const isReconciled = def.status === 'completed'

          await prisma.inventoryCountItem.create({
            data: {
              inventoryCountId: count.id,
              productId:        product.id,
              systemQty:        item.systemQty.toString(),
              countedQty:       item.countedQty.toString(),
              varianceQty:      variance.toString(),
              varianceValue:    varianceVal,
              isReconciled,
              notes:            variance !== 0 ? `Variance: ${variance > 0 ? '+' : ''}${variance}` : null,
            },
          })
        }

        console.log(`    ✓ Count at ${STORES[def.storeIdx].name} (${def.status}) — ${def.items.length} items`)
      }
    }
  }

  // ── 15b. Assign storeId to existing stock ledger entries (for Analytics store filter) ──
  console.log('\n  Assigning store IDs to stock ledger entries...')
  const nullLedger = await prisma.stockLedger.findMany({
    where: { storeId: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (nullLedger.length > 0) {
    // Spread evenly across stores in round-robin order
    let updated = 0
    for (let i = 0; i < nullLedger.length; i++) {
      await prisma.stockLedger.update({
        where: { id: nullLedger[i].id },
        data:  { storeId: storeIds[i % storeIds.length] },
      })
      updated++
    }
    console.log(`  Assigned storeId to ${updated} ledger entries.`)
  } else {
    console.log('  All ledger entries already have storeId.')
  }

  // ── 16. Assign storeId to Purchase Orders ────────────────────────────────────
  console.log('\n  Assigning store IDs to purchase orders...')
  const allPOs = await prisma.purchaseOrder.findMany({ select: { id: true, poNumber: true } })
  for (let i = 0; i < allPOs.length; i++) {
    const po = allPOs[i]
    const assignedStore = storeIds[i % storeIds.length]
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data:  { storeId: assignedStore },
    })
  }
  console.log(`  Assigned storeId to ${allPOs.length} purchase orders.`)

  await printSummary()

  async function printSummary() {
    const timeEntryCount    = await prisma.timeEntry.count()
    const timeOffCount      = await (prisma as unknown as {
      timeOffRequest: { count: () => Promise<number> }
    }).timeOffRequest.count()
    const notificationCount = await prisma.notification.count()
    const invCountCount     = await prisma.inventoryCount.count()

    const counts = {
      stores:            await prisma.store.count(),
      categories:        await prisma.category.count(),
      suppliers:         await prisma.supplier.count(),
      products:          await prisma.product.count(),
      purchaseOrders:    await prisma.purchaseOrder.count(),
      ledgerEntries:     await prisma.stockLedger.count(),
      tasks:             await prisma.projectTask.count(),
      scheduleShifts:    await prisma.schedule.count(),
      payrollPeriods:    await prisma.payrollPeriod.count(),
      payrollEntries:    await prisma.payrollEntry.count(),
      timeEntries:       timeEntryCount,
      timeOffRequests:   timeOffCount,
      notifications:     notificationCount,
      inventoryCounts:   invCountCount,
    }
    console.log('\n── Seed complete ────────────────────────────────')
    for (const [k, v] of Object.entries(counts)) {
      console.log(`  ${k.padEnd(22)} ${v}`)
    }
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
