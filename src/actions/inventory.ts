'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'

// ── Result + row types ───────────────────────────────────────────────────────

export type InventoryResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface ProductRow {
  id:              string
  sku:             string
  name:            string
  nameEs:          string | null
  categoryId:      string
  categoryName:    string
  supplierId:      string | null
  supplierName:    string | null
  storeId:         string | null
  storeName:       string | null
  unit:            string
  costPrice:       string | null
  sellPrice:       string | null
  reorderPoint:    number
  reorderQty:      number
  shelfLifeDays:   number | null
  isActive:        boolean
  currentStock:    number
  isLowStock:      boolean
  createdAt:       string
  updatedAt:       string
  // Phase 4 additions
  barcode:         string | null
  barcodeType:     string | null
  taxCategory:     string | null
  vendorSku:       string | null
  minOrderQty:     number | null
  casePackQty:     number | null
  brand:           string | null
  countryOfOrigin: string | null
  weightGrams:     number | null
  isPerishable:    boolean
  productNotes:    string | null
  expirationDate:  string | null
}

export interface CategoryOption { id: string; name: string; nameEs: string }
export interface SupplierOption  { id: string; name: string }
export interface StoreOption     { id: string; name: string; address: string }

// ── Zod schema ───────────────────────────────────────────────────────────────

const ProductSchema = z.object({
  sku:             z.string().min(1, 'SKU is required.').max(50).trim().toUpperCase(),
  name:            z.string().min(1, 'Name is required.').max(200).trim(),
  nameEs:          z.string().max(200).trim().nullable().optional(),
  categoryId:      z.string().uuid('Select a category.'),
  supplierId:      z.string().uuid().nullable().optional(),
  storeId:         z.string().uuid().nullable().optional(),
  unit:            z.string().min(1).max(20).trim(),
  costPrice:       z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price.').nullable().optional(),
  sellPrice:       z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price.').nullable().optional(),
  reorderPoint:    z.coerce.number().int().min(0).default(0),
  reorderQty:      z.coerce.number().int().min(0).default(0),
  shelfLifeDays:   z.coerce.number().int().min(1).nullable().optional(),
  // Phase 4 additions
  barcode:         z.string().max(100).trim().nullable().optional(),
  barcodeType:     z.enum(['UPC', 'EAN', 'PLU', 'QR', 'other']).nullable().optional(),
  taxCategory:     z.enum(['standard', 'food_exempt', 'reduced']).nullable().optional(),
  vendorSku:       z.string().max(100).trim().nullable().optional(),
  minOrderQty:     z.preprocess(v => v === '' ? null : v, z.coerce.number().int().min(1).nullable().optional()),
  casePackQty:     z.preprocess(v => v === '' ? null : v, z.coerce.number().int().min(1).nullable().optional()),
  brand:           z.string().max(200).trim().nullable().optional(),
  countryOfOrigin: z.string().max(100).trim().nullable().optional(),
  weightGrams:     z.preprocess(v => v === '' ? null : v, z.coerce.number().min(0).nullable().optional()),
  isPerishable:    z.preprocess(v => v === 'true' || v === true, z.boolean()).default(false),
  productNotes:    z.string().max(1000).trim().nullable().optional(),
  expirationDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date (YYYY-MM-DD).').nullable().optional(),
})

// ── Helper ───────────────────────────────────────────────────────────────────

type PrismaProduct = {
  id: string; sku: string; name: string; nameEs: string | null
  categoryId: string; supplierId: string | null; storeId: string | null
  unit: string; costPrice: unknown; sellPrice: unknown
  reorderPoint: number; reorderQty: number; shelfLifeDays: number | null
  isActive: boolean; createdAt: Date; updatedAt: Date
  // Relations — Prisma may return extra fields; we only access `name`
  category: { name: string; [k: string]: unknown }
  supplier: ({ name: string; [k: string]: unknown }) | null
  store:    ({ name: string; [k: string]: unknown }) | null
  // Phase 4 — optional until migration runs
  barcode?: string | null
  barcodeType?: string | null
  taxCategory?: string | null
  vendorSku?: string | null
  minOrderQty?: unknown   // Decimal in DB — convert with Number() in serialise()
  casePackQty?: unknown
  brand?: string | null
  countryOfOrigin?: string | null
  weightGrams?: unknown
  isPerishable?: boolean
  productNotes?: string | null
  expirationDate?: Date | null
}

function serialise(p: PrismaProduct, currentStock: number): ProductRow {
  return {
    id: p.id, sku: p.sku, name: p.name, nameEs: p.nameEs,
    categoryId: p.categoryId, categoryName: p.category.name,
    supplierId: p.supplierId, supplierName: p.supplier?.name ?? null,
    storeId: p.storeId, storeName: p.store?.name ?? null,
    unit: p.unit,
    costPrice:  p.costPrice  != null ? String(p.costPrice)  : null,
    sellPrice:  p.sellPrice  != null ? String(p.sellPrice)  : null,
    reorderPoint: p.reorderPoint, reorderQty: p.reorderQty,
    shelfLifeDays: p.shelfLifeDays, isActive: p.isActive,
    currentStock,
    isLowStock: currentStock <= p.reorderPoint,
    createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString(),
    barcode:         p.barcode         ?? null,
    barcodeType:     p.barcodeType     ?? null,
    taxCategory:     p.taxCategory     ?? null,
    vendorSku:       p.vendorSku       ?? null,
    minOrderQty:     p.minOrderQty != null ? Number(p.minOrderQty) : null,
    casePackQty:     p.casePackQty != null ? Number(p.casePackQty) : null,
    brand:           p.brand           ?? null,
    countryOfOrigin: p.countryOfOrigin ?? null,
    weightGrams:     p.weightGrams != null ? Number(p.weightGrams) : null,
    isPerishable:    p.isPerishable    ?? false,
    productNotes:    p.productNotes    ?? null,
    expirationDate:  p.expirationDate ? p.expirationDate.toISOString().slice(0, 10) : null,
  }
}

// ── getProducts ──────────────────────────────────────────────────────────────

export async function getProducts(filters?: {
  search?:          string
  categoryId?:      string
  storeId?:         string
  lowStockOnly?:    boolean
  expiringOnly?:    boolean
  includeInactive?: boolean
  show?:            'active' | 'archived' | 'all'
}): Promise<InventoryResult<ProductRow[]>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  const canSeeInactive = hasMinimumRole(user.role, 'manager')

  // Determine isActive filter
  let isActiveFilter: boolean | undefined = true
  if (filters?.show === 'archived' && canSeeInactive) isActiveFilter = false
  else if (filters?.show === 'all'    && canSeeInactive) isActiveFilter = undefined
  else if (filters?.includeInactive   && canSeeInactive) isActiveFilter = undefined

  try {
    const [products, stockGroups] = await Promise.all([
      prisma.product.findMany({
        where: {
          isActive: isActiveFilter,
          ...(filters?.categoryId && { categoryId: filters.categoryId }),
          // When filtering by store: show products assigned to that store OR available at all stores (storeId = null)
          ...(filters?.storeId && {
            OR: [
              { storeId: filters.storeId },
              { storeId: null },
            ],
          }),
          ...(filters?.search && {
            OR: [
              { name:   { contains: filters.search, mode: 'insensitive' } },
              { sku:    { contains: filters.search, mode: 'insensitive' } },
              { nameEs: { contains: filters.search, mode: 'insensitive' } },
            ],
          }),
          ...(filters?.expiringOnly && {
            expirationDate: {
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              not: null,
            },
          }),
        },
        include: { category: true, supplier: true, store: true },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.stockLedger.groupBy({
        by:   ['productId'],
        _sum: { changeQty: true },
      }),
    ])

    const stockMap = new Map(
      stockGroups.map((g) => [g.productId, Number(g._sum.changeQty ?? 0)]),
    )

    let rows = products.map((p) => serialise(p, stockMap.get(p.id) ?? 0))
    if (filters?.lowStockOnly) rows = rows.filter((p) => p.isLowStock)

    return { success: true, data: rows }
  } catch {
    return { success: false, error: 'Could not load products.' }
  }
}

// ── getProduct ───────────────────────────────────────────────────────────────

export async function getProduct(id: string): Promise<InventoryResult<ProductRow>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  try {
    const [product, stock] = await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: { category: true, supplier: true, store: true },
      }),
      prisma.stockLedger.aggregate({
        where: { productId: id },
        _sum:  { changeQty: true },
      }),
    ])

    if (!product) return { success: false, error: 'Product not found.' }
    const currentStock = Number(stock._sum.changeQty ?? 0)
    return { success: true, data: serialise(product, currentStock) }
  } catch {
    return { success: false, error: 'Could not load product.' }
  }
}

// ── getStores ─────────────────────────────────────────────────────────────────

export async function getStores(): Promise<StoreOption[]> {
  try {
    const stores = await prisma.store.findMany({ orderBy: { name: 'asc' } })
    return stores.map((s) => ({ id: s.id, name: s.name, address: s.address }))
  } catch {
    return []
  }
}

// ── getCategories ────────────────────────────────────────────────────────────

export async function getCategories(): Promise<CategoryOption[]> {
  try {
    const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })
    return cats.map((c) => ({ id: c.id, name: c.name, nameEs: c.nameEs }))
  } catch {
    return []
  }
}

// ── getSuppliers ─────────────────────────────────────────────────────────────

export async function getSuppliers(): Promise<SupplierOption[]> {
  try {
    const sups = await prisma.supplier.findMany({ orderBy: { name: 'asc' } })
    return sups.map((s) => ({ id: s.id, name: s.name }))
  } catch {
    return []
  }
}

// ── getInventoryStats ─────────────────────────────────────────────────────────

export async function getInventoryStats(): Promise<{
  totalSkus:     number
  lowStockCount: number
  soonToExpire:  number
}> {
  try {
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const [totalSkus, allProducts, stockGroups, soonToExpire] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({
        where:  { isActive: true },
        select: { id: true, reorderPoint: true },
      }),
      prisma.stockLedger.groupBy({ by: ['productId'], _sum: { changeQty: true } }),
      prisma.product.count({
        where: {
          isActive:       true,
          expirationDate: { lte: sevenDaysOut, not: null },
        },
      }),
    ])

    const stockMap = new Map(
      stockGroups.map((g) => [g.productId, Number(g._sum.changeQty ?? 0)]),
    )
    const lowStockCount = allProducts.filter(
      (p) => (stockMap.get(p.id) ?? 0) <= p.reorderPoint,
    ).length

    return { totalSkus, lowStockCount, soonToExpire }
  } catch {
    return { totalSkus: 0, lowStockCount: 0, soonToExpire: 0 }
  }
}

// ── createProduct ─────────────────────────────────────────────────────────────

export async function createProduct(
  _prev: InventoryResult | null,
  formData: FormData,
): Promise<InventoryResult<ProductRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = ProductSchema.safeParse({
    sku:             formData.get('sku'),
    name:            formData.get('name'),
    nameEs:          formData.get('nameEs')          || null,
    categoryId:      formData.get('categoryId'),
    supplierId:      formData.get('supplierId')      || null,
    storeId:         formData.get('storeId')         || null,
    unit:            formData.get('unit')            || 'each',
    costPrice:       formData.get('costPrice')       || null,
    sellPrice:       formData.get('sellPrice')       || null,
    reorderPoint:    formData.get('reorderPoint')    || 0,
    reorderQty:      formData.get('reorderQty')      || 0,
    shelfLifeDays:   formData.get('shelfLifeDays')   || null,
    barcode:         formData.get('barcode')         || null,
    barcodeType:     formData.get('barcodeType')     || null,
    taxCategory:     formData.get('taxCategory')     || null,
    vendorSku:       formData.get('vendorSku')       || null,
    minOrderQty:     formData.get('minOrderQty')     || '',
    casePackQty:     formData.get('casePackQty')     || '',
    brand:           formData.get('brand')           || null,
    countryOfOrigin: formData.get('countryOfOrigin') || null,
    weightGrams:     formData.get('weightGrams')     || '',
    isPerishable:    formData.get('isPerishable'),
    productNotes:    formData.get('productNotes')    || null,
    expirationDate:  formData.get('expirationDate')  || null,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  try {
    const product = await prisma.product.create({
      data: {
        sku:             parsed.data.sku,
        name:            parsed.data.name,
        nameEs:          parsed.data.nameEs          ?? null,
        categoryId:      parsed.data.categoryId,
        supplierId:      parsed.data.supplierId      ?? null,
        storeId:         parsed.data.storeId         ?? null,
        unit:            parsed.data.unit,
        costPrice:       parsed.data.costPrice       ?? null,
        sellPrice:       parsed.data.sellPrice       ?? null,
        reorderPoint:    parsed.data.reorderPoint,
        reorderQty:      parsed.data.reorderQty,
        shelfLifeDays:   parsed.data.shelfLifeDays   ?? null,
        ...(parsed.data.barcode         != null && { barcode:         parsed.data.barcode }),
        ...(parsed.data.barcodeType     != null && { barcodeType:     parsed.data.barcodeType }),
        ...(parsed.data.taxCategory     != null && { taxCategory:     parsed.data.taxCategory }),
        ...(parsed.data.vendorSku       != null && { vendorSku:       parsed.data.vendorSku }),
        ...(parsed.data.minOrderQty     != null && { minOrderQty:     parsed.data.minOrderQty }),
        ...(parsed.data.casePackQty     != null && { casePackQty:     parsed.data.casePackQty }),
        ...(parsed.data.brand           != null && { brand:           parsed.data.brand }),
        ...(parsed.data.countryOfOrigin != null && { countryOfOrigin: parsed.data.countryOfOrigin }),
        ...(parsed.data.weightGrams     != null && { weightGrams:     parsed.data.weightGrams }),
        isPerishable:    parsed.data.isPerishable,
        ...(parsed.data.productNotes    != null && { productNotes:    parsed.data.productNotes }),
        expirationDate:  parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
      },
      include: { category: true, supplier: true, store: true },
    })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, data: serialise(product, 0) }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      return { success: false, error: 'A product with that SKU already exists.' }
    }
    return { success: false, error: 'Failed to create product.' }
  }
}

// ── updateProduct ─────────────────────────────────────────────────────────────

export async function updateProduct(
  id: string,
  _prev: InventoryResult | null,
  formData: FormData,
): Promise<InventoryResult<ProductRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = ProductSchema.safeParse({
    sku:             formData.get('sku'),
    name:            formData.get('name'),
    nameEs:          formData.get('nameEs')          || null,
    categoryId:      formData.get('categoryId'),
    supplierId:      formData.get('supplierId')      || null,
    storeId:         formData.get('storeId')         || null,
    unit:            formData.get('unit')            || 'each',
    costPrice:       formData.get('costPrice')       || null,
    sellPrice:       formData.get('sellPrice')       || null,
    reorderPoint:    formData.get('reorderPoint')    || 0,
    reorderQty:      formData.get('reorderQty')      || 0,
    shelfLifeDays:   formData.get('shelfLifeDays')   || null,
    barcode:         formData.get('barcode')         || null,
    barcodeType:     formData.get('barcodeType')     || null,
    taxCategory:     formData.get('taxCategory')     || null,
    vendorSku:       formData.get('vendorSku')       || null,
    minOrderQty:     formData.get('minOrderQty')     || '',
    casePackQty:     formData.get('casePackQty')     || '',
    brand:           formData.get('brand')           || null,
    countryOfOrigin: formData.get('countryOfOrigin') || null,
    weightGrams:     formData.get('weightGrams')     || '',
    isPerishable:    formData.get('isPerishable'),
    productNotes:    formData.get('productNotes')    || null,
    expirationDate:  formData.get('expirationDate')  || null,
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  try {
    const [product, stock] = await Promise.all([
      prisma.product.update({
        where: { id },
        data: {
          sku:             parsed.data.sku,
          name:            parsed.data.name,
          nameEs:          parsed.data.nameEs          ?? null,
          categoryId:      parsed.data.categoryId,
          supplierId:      parsed.data.supplierId      ?? null,
          storeId:         parsed.data.storeId         ?? null,
          unit:            parsed.data.unit,
          costPrice:       parsed.data.costPrice       ?? null,
          sellPrice:       parsed.data.sellPrice       ?? null,
          reorderPoint:    parsed.data.reorderPoint,
          reorderQty:      parsed.data.reorderQty,
          shelfLifeDays:   parsed.data.shelfLifeDays   ?? null,
          barcode:         parsed.data.barcode         ?? null,
          barcodeType:     parsed.data.barcodeType     ?? null,
          taxCategory:     parsed.data.taxCategory     ?? 'exempt',
          vendorSku:       parsed.data.vendorSku       ?? null,
          minOrderQty:     parsed.data.minOrderQty     ?? null,
          casePackQty:     parsed.data.casePackQty     ?? null,
          brand:           parsed.data.brand           ?? null,
          countryOfOrigin: parsed.data.countryOfOrigin ?? null,
          weightGrams:     parsed.data.weightGrams     ?? null,
          isPerishable:    parsed.data.isPerishable,
          productNotes:    parsed.data.productNotes    ?? null,
          expirationDate:  parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : null,
        },
        include: { category: true, supplier: true, store: true },
      }),
      prisma.stockLedger.aggregate({ where: { productId: id }, _sum: { changeQty: true } }),
    ])
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, data: serialise(product, Number(stock._sum.changeQty ?? 0)) }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      return { success: false, error: 'A product with that SKU already exists.' }
    }
    return { success: false, error: 'Failed to update product.' }
  }
}

// ── importProducts ────────────────────────────────────────────────────────────

export interface ImportResult {
  created: number
  skipped: number
  errors:  { row: number; message: string }[]
}

export async function importProducts(
  _prev: InventoryResult | null,
  formData: FormData,
): Promise<InventoryResult<ImportResult>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Please upload a CSV file.' }
  }
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    return { success: false, error: 'File must be a .csv file.' }
  }

  const text = await file.text()
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) {
    return { success: false, error: 'CSV must have a header row and at least one data row.' }
  }

  // Parse header — normalise: lowercase, strip BOM, trim quotes
  const header = lines[0]
    .replace(/^\uFEFF/, '')
    .split(',')
    .map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))

  const col = (name: string) => header.indexOf(name)

  const REQ = ['sku', 'name', 'category', 'unit']
  const missing = REQ.filter((c) => col(c) === -1)
  if (missing.length > 0) {
    return { success: false, error: `CSV is missing required columns: ${missing.join(', ')}.` }
  }

  // Load lookup maps once
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
  ])
  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))
  const supMap = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]))

  const errors: { row: number; message: string }[] = []
  let created = 0
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const cells  = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''))

    const get = (name: string) => cells[col(name)]?.trim() ?? ''

    const sku      = get('sku').toUpperCase()
    const name     = get('name')
    const category = get('category')
    const unit     = get('unit') || 'each'

    if (!sku || !name || !category) {
      errors.push({ row: rowNum, message: 'sku, name, and category are required.' })
      continue
    }

    const categoryId = catMap.get(category.toLowerCase())
    if (!categoryId) {
      errors.push({ row: rowNum, message: `Unknown category "${category}".` })
      continue
    }

    const supplierRaw = get('supplier')
    const supplierId  = supplierRaw ? (supMap.get(supplierRaw.toLowerCase()) ?? null) : null

    const costRaw  = get('cost_price')
    const sellRaw  = get('sell_price')
    const costPrice  = costRaw  && /^\d+(\.\d{1,2})?$/.test(costRaw)  ? costRaw  : null
    const sellPrice  = sellRaw  && /^\d+(\.\d{1,2})?$/.test(sellRaw)  ? sellRaw  : null
    const reorderPoint  = parseInt(get('reorder_point')  || '0', 10)  || 0
    const reorderQty    = parseInt(get('reorder_qty')    || '0', 10)  || 0
    const shelfLifeDays = parseInt(get('shelf_life_days')|| '0', 10)  || null

    try {
      await prisma.product.create({
        data: {
          sku, name,
          nameEs:        get('name_es') || null,
          categoryId,
          supplierId:    supplierId ?? null,
          unit,
          costPrice:     costPrice  ?? null,
          sellPrice:     sellPrice  ?? null,
          reorderPoint,
          reorderQty,
          shelfLifeDays: shelfLifeDays ?? null,
        },
      })
      created++
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2002') {
        skipped++
      } else {
        errors.push({ row: rowNum, message: `Failed to create product "${sku}".` })
      }
    }
  }

  revalidatePath('/dashboard/inventory')
  revalidatePath('/dashboard')
  return { success: true, data: { created, skipped, errors } }
}

// ── getProductDetail ──────────────────────────────────────────────────────────

export interface ProductDetail {
  margin: number | null
  supplierContactName: string | null
  supplierPhone:       string | null
  supplierEmail:       string | null
  lastPO: {
    poNumber:   string | null
    status:     string
    orderedAt:  string
    expectedAt: string | null
    qtyOrdered: number | null
    unitCost:   string | null
  } | null
  recentMovements: Array<{ qty: number; reason: string; date: string }>
}

export async function getProductDetail(
  productId: string,
): Promise<InventoryResult<ProductDetail>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        costPrice:  true,
        sellPrice:  true,
        supplierId: true,
        supplier: {
          select: { contactName: true, phone: true, email: true },
        },
      },
    })
    if (!product) return { success: false, error: 'Product not found.' }

    // Margin
    let margin: number | null = null
    if (product.costPrice && product.sellPrice) {
      const cost = Number(product.costPrice)
      const sell = Number(product.sellPrice)
      if (sell > 0) margin = Math.round(((sell - cost) / sell) * 100)
    }

    // Last PO that contains this product
    const lastPOItem = await prisma.purchaseOrderItem.findFirst({
      where: { productId },
      orderBy: { purchaseOrder: { createdAt: 'desc' } },
      include: {
        purchaseOrder: {
          select: {
            poNumber:   true,
            status:     true,
            createdAt:  true,
            expectedAt: true,
          },
        },
      },
    })

    // Recent stock movements (last 5)
    const movements = await prisma.stockLedger.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { changeQty: true, reason: true, createdAt: true },
    })

    return {
      success: true,
      data: {
        margin,
        supplierContactName: product.supplier?.contactName ?? null,
        supplierPhone:       product.supplier?.phone       ?? null,
        supplierEmail:       product.supplier?.email       ?? null,
        lastPO: lastPOItem ? {
          poNumber:   lastPOItem.purchaseOrder.poNumber,
          status:     lastPOItem.purchaseOrder.status,
          orderedAt:  lastPOItem.purchaseOrder.createdAt.toISOString(),
          expectedAt: lastPOItem.purchaseOrder.expectedAt?.toISOString() ?? null,
          qtyOrdered: lastPOItem.qtyOrdered ? Number(lastPOItem.qtyOrdered) : null,
          unitCost:   lastPOItem.unitCost   ? String(lastPOItem.unitCost)   : null,
        } : null,
        recentMovements: movements.map(m => ({
          qty:    Number(m.changeQty),
          reason: m.reason,
          date:   m.createdAt.toISOString(),
        })),
      },
    }
  } catch {
    return { success: false, error: 'Failed to load product details.' }
  }
}

// ── archiveProduct ────────────────────────────────────────────────────────────

export async function archiveProduct(id: string): Promise<InventoryResult<void>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'owner')) {
    return { success: false, error: 'Only owners can archive products.' }
  }
  try {
    await prisma.product.update({ where: { id }, data: { isActive: false } })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to archive product.' }
  }
}

export async function unarchiveProduct(id: string): Promise<InventoryResult<void>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'owner')) {
    return { success: false, error: 'Only owners can restore products.' }
  }
  try {
    await prisma.product.update({ where: { id }, data: { isActive: true } })
    revalidatePath('/dashboard/inventory')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to restore product.' }
  }
}

export async function deleteProduct(id: string): Promise<InventoryResult<void>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'owner')) {
    return { success: false, error: 'Only owners can delete products.' }
  }
  try {
    const ledgerCount = await prisma.stockLedger.count({ where: { productId: id } })
    if (ledgerCount > 0) {
      return { success: false, error: `Cannot delete — this product has ${ledgerCount} stock movement record${ledgerCount !== 1 ? 's' : ''}. Archive it instead to preserve history.` }
    }
    await prisma.product.delete({ where: { id } })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to delete product.' }
  }
}
