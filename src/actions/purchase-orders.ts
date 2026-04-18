'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'

export type POResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// ── Types ─────────────────────────────────────────────────────────────────────

export type POStatus = 'draft' | 'sent' | 'shipped' | 'received' | 'cancelled'

export interface POActivityEntry {
  action:  'created' | 'edited' | 'sent' | 'shipped' | 'received' | 'cancelled'
  byName:  string
  at:      string   // ISO timestamp
  note?:   string   // tracking ref, cancel reason, etc.
}

export interface PORow {
  id:               string
  poNumber:         string | null
  supplierId:       string
  supplierName:     string
  storeId:          string | null
  status:           POStatus
  notes:            string | null
  trackingRef:      string | null
  expectedAt:       string | null
  invoiceNumber:    string | null
  invoiceDate:      string | null
  createdBy:        string
  createdAt:        string
  shippedAt:        string | null
  receivedAt:       string | null
  itemCount:        number
  // Audit actor IDs (raw — resolved to names in getPurchaseOrderDetail)
  sentAt:           string | null
  sentBy:           string | null
  receivedBy:       string | null
  cancelledAt:      string | null
  cancelledBy:      string | null
  cancelReason:     string | null
  editedAt:         string | null
  editedBy:         string | null
}

export interface POItemRow {
  id:              string
  purchaseOrderId: string
  productId:       string
  productName:     string
  sku:             string
  unit:            string
  qtyOrdered:      string
  qtyShipped:      string | null
  qtyReceived:     string | null
  unitCost:        string | null
}

export interface PODetailRow extends PORow {
  items:    POItemRow[]
  activity: POActivityEntry[]
}

// ── Validation ────────────────────────────────────────────────────────────────

const CreatePOSchema = z.object({
  supplierId:    z.string().uuid('Select a supplier.'),
  storeId:       z.string().uuid().nullable().optional(),
  notes:         z.string().max(1000).trim().optional().nullable(),
  invoiceNumber: z.string().max(100).trim().nullable().optional(),
  invoiceDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

const AddItemSchema = z.object({
  productId:  z.string().uuid('Select a product.'),
  qtyOrdered: z.coerce.number().positive('Quantity must be greater than 0.'),
  unitCost:   z.preprocess(v => v === '' ? null : v,
    z.coerce.number().min(0).nullable().optional()
  ),
})

const UpdateItemSchema = z.object({
  qtyOrdered: z.coerce.number().positive('Quantity must be greater than 0.'),
  unitCost:   z.preprocess(v => v === '' ? null : v,
    z.coerce.number().min(0).nullable().optional()
  ),
})

const UpdatePOSchema = z.object({
  notes:         z.string().max(1000).trim().nullable().optional(),
  invoiceNumber: z.string().max(100).trim().nullable().optional(),
  invoiceDate:   z.preprocess(v => v === '' ? null : v,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  ),
})

const MarkShippedSchema = z.object({
  trackingRef: z.string().max(200).trim().optional().nullable(),
  expectedAt:  z.preprocess(v => v === '' ? null : v,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
  ),
})

const ReceiveItemSchema = z.object({
  itemId:      z.string().uuid(),
  qtyReceived: z.coerce.number().min(0, 'Quantity cannot be negative.'),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generates a PO number like "PO-2025-0042" */
async function generatePoNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.purchaseOrder.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`) } },
  })
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`
}

function mapPORow(
  po: {
    id: string; poNumber: string | null; supplierId: string; status: string;
    notes: string | null; trackingRef: string | null; expectedAt: Date | null;
    createdBy: string; createdAt: Date; shippedAt: Date | null; receivedAt: Date | null;
    supplier: { name: string }; items: { id: string }[];
    storeId?: string | null; invoiceNumber?: string | null; invoiceDate?: Date | null;
    sentAt?: Date | null; sentBy?: string | null;
    receivedBy?: string | null; cancelledAt?: Date | null; cancelledBy?: string | null;
    cancelReason?: string | null; editedAt?: Date | null; editedBy?: string | null;
  }
): PORow {
  return {
    id:            po.id,
    poNumber:      po.poNumber,
    supplierId:    po.supplierId,
    supplierName:  po.supplier.name,
    storeId:       po.storeId ?? null,
    status:        po.status as POStatus,
    notes:         po.notes,
    trackingRef:   po.trackingRef,
    expectedAt:    po.expectedAt?.toISOString().slice(0, 10) ?? null,
    invoiceNumber: po.invoiceNumber ?? null,
    invoiceDate:   po.invoiceDate?.toISOString().slice(0, 10) ?? null,
    createdBy:     po.createdBy,
    createdAt:     po.createdAt.toISOString(),
    shippedAt:     po.shippedAt?.toISOString() ?? null,
    receivedAt:    po.receivedAt?.toISOString() ?? null,
    itemCount:     po.items.length,
    sentAt:        po.sentAt?.toISOString() ?? null,
    sentBy:        po.sentBy ?? null,
    receivedBy:    po.receivedBy ?? null,
    cancelledAt:   po.cancelledAt?.toISOString() ?? null,
    cancelledBy:   po.cancelledBy ?? null,
    cancelReason:  po.cancelReason ?? null,
    editedAt:      po.editedAt?.toISOString() ?? null,
    editedBy:      po.editedBy ?? null,
  }
}

function mapItemRow(
  item: {
    id: string; purchaseOrderId: string; productId: string; qtyOrdered: { toString(): string };
    qtyShipped: { toString(): string } | null; qtyReceived: { toString(): string } | null;
    unitCost: { toString(): string } | null;
    product: { name: string; sku: string; unit: string };
  }
): POItemRow {
  return {
    id:              item.id,
    purchaseOrderId: item.purchaseOrderId,
    productId:       item.productId,
    productName:     item.product.name,
    sku:             item.product.sku,
    unit:            item.product.unit,
    qtyOrdered:      item.qtyOrdered.toString(),
    qtyShipped:      item.qtyShipped?.toString() ?? null,
    qtyReceived:     item.qtyReceived?.toString() ?? null,
    unitCost:        item.unitCost?.toString() ?? null,
  }
}

const PO_INCLUDE = {
  supplier: { select: { name: true } },
  items:    { select: { id: true } },
}

const PO_ITEMS_INCLUDE = {
  product: { select: { name: true, sku: true, unit: true } },
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPurchaseOrders(filters?: {
  supplierId?: string
  status?: POStatus
  dateFrom?: string
  dateTo?: string
}): Promise<POResult<PORow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const where: Record<string, unknown> = {}
    if (filters?.supplierId) where.supplierId = filters.supplierId
    if (filters?.status)     where.status     = filters.status
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(filters.dateFrom)
      if (filters.dateTo)   (where.createdAt as Record<string, unknown>).lte = new Date(filters.dateTo + 'T23:59:59Z')
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: PO_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return { success: true, data: orders.map(mapPORow) }
  } catch {
    return { success: false, error: 'Failed to load purchase orders.' }
  }
}

export async function getPurchaseOrderDetail(orderId: string): Promise<POResult<PODetailRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const po = await prisma.purchaseOrder.findUnique({
      where:   { id: orderId },
      include: { supplier: { select: { name: true } }, items: { include: PO_ITEMS_INCLUDE, orderBy: { product: { name: 'asc' } } } },
    })
    if (!po) return { success: false, error: 'Purchase order not found.' }

    // Resolve actor IDs → display names in one batch query
    const actorIds = [...new Set(
      [po.createdBy, po.sentBy, po.receivedBy, po.cancelledBy, po.editedBy].filter(Boolean) as string[]
    )]
    const profiles = await prisma.profile.findMany({
      where:  { id: { in: actorIds } },
      select: { id: true, firstName: true, lastName: true, position: true },
    })
    const nameMap = new Map(profiles.map(p => [
      p.id,
      (p.firstName && p.lastName) ? `${p.firstName} ${p.lastName}` : (p.position ?? `User ${p.id.slice(0, 6)}`),
    ]))
    const name = (id: string | null) => (id ? (nameMap.get(id) ?? `User ${id.slice(0, 6)}`) : 'Unknown')

    // Build chronological activity log
    const activity: POActivityEntry[] = []
    activity.push({ action: 'created', byName: name(po.createdBy), at: po.createdAt.toISOString() })
    if (po.editedAt && po.editedBy)
      activity.push({ action: 'edited', byName: name(po.editedBy), at: po.editedAt.toISOString() })
    if (po.sentAt && po.sentBy)
      activity.push({ action: 'sent', byName: name(po.sentBy), at: po.sentAt.toISOString() })
    if (po.shippedAt)
      activity.push({ action: 'shipped', byName: name(null), at: po.shippedAt.toISOString(), note: po.trackingRef ?? undefined })
    if (po.receivedAt && po.receivedBy)
      activity.push({ action: 'received', byName: name(po.receivedBy), at: po.receivedAt.toISOString() })
    if (po.cancelledAt && po.cancelledBy)
      activity.push({ action: 'cancelled', byName: name(po.cancelledBy), at: po.cancelledAt.toISOString(), note: po.cancelReason ?? undefined })

    return {
      success: true,
      data: {
        ...mapPORow({ ...po, items: po.items }),
        items:    po.items.map(mapItemRow),
        activity,
      },
    }
  } catch {
    return { success: false, error: 'Failed to load order detail.' }
  }
}

export async function getSupplierOrders(supplierId: string): Promise<POResult<PORow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const orders = await prisma.purchaseOrder.findMany({
      where:   { supplierId },
      include: PO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: orders.map(mapPORow) }
  } catch {
    return { success: false, error: 'Failed to load supplier orders.' }
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createPurchaseOrder(
  _prev: POResult | null,
  formData: FormData,
): Promise<POResult<PORow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const parsed = CreatePOSchema.safeParse({
    supplierId:    formData.get('supplierId'),
    storeId:       formData.get('storeId')       || null,
    notes:         formData.get('notes')         || null,
    invoiceNumber: formData.get('invoiceNumber') || null,
    invoiceDate:   formData.get('invoiceDate')   || null,
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  try {
    const poNumber = await generatePoNumber()
    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId: d.supplierId,
        poNumber,
        notes:     d.notes ?? null,
        createdBy: user.id,
        ...(d.storeId       && { storeId:       d.storeId }),
        ...(d.invoiceNumber && { invoiceNumber: d.invoiceNumber }),
        ...(d.invoiceDate   && { invoiceDate:   new Date(d.invoiceDate) }),
      },
      include: PO_INCLUDE,
    })
    revalidatePath('/dashboard/inventory/purchase-orders')
    return { success: true, data: mapPORow(po) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function addOrderItem(
  orderId: string,
  _prev: POResult | null,
  formData: FormData,
): Promise<POResult<POItemRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId } })
  if (!po) return { success: false, error: 'Order not found.' }
  if (po.status !== 'draft') return { success: false, error: 'Items can only be added to draft orders.' }

  const parsed = AddItemSchema.safeParse({
    productId:  formData.get('productId'),
    qtyOrdered: formData.get('qtyOrdered'),
    unitCost:   formData.get('unitCost'),
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  try {
    const item = await prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: orderId,
        productId:       d.productId,
        qtyOrdered:      d.qtyOrdered,
        unitCost:        d.unitCost ?? null,
      },
      include: PO_ITEMS_INCLUDE,
    })
    revalidatePath(`/dashboard/inventory/purchase-orders/${orderId}`)
    return { success: true, data: mapItemRow(item) }
  } catch {
    return { success: false, error: 'Failed to add item.' }
  }
}

export async function updateOrderItem(
  itemId: string,
  _prev: POResult | null,
  formData: FormData,
): Promise<POResult<POItemRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const item = await prisma.purchaseOrderItem.findUnique({
    where:   { id: itemId },
    include: { purchaseOrder: { select: { status: true } } },
  })
  if (!item) return { success: false, error: 'Item not found.' }
  if (item.purchaseOrder.status !== 'draft') {
    return { success: false, error: 'Items can only be edited on draft orders.' }
  }

  const parsed = UpdateItemSchema.safeParse({
    qtyOrdered: formData.get('qtyOrdered'),
    unitCost:   formData.get('unitCost'),
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  try {
    const updated = await prisma.purchaseOrderItem.update({
      where:   { id: itemId },
      data:    { qtyOrdered: d.qtyOrdered, unitCost: d.unitCost ?? null },
      include: PO_ITEMS_INCLUDE,
    })
    revalidatePath(`/dashboard/inventory/purchase-orders/${item.purchaseOrderId}`)
    return { success: true, data: mapItemRow(updated) }
  } catch {
    return { success: false, error: 'Failed to update item.' }
  }
}

export async function removeOrderItem(itemId: string): Promise<POResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const item = await prisma.purchaseOrderItem.findUnique({
    where:   { id: itemId },
    include: { purchaseOrder: { select: { status: true } } },
  })
  if (!item) return { success: false, error: 'Item not found.' }
  if (item.purchaseOrder.status !== 'draft') {
    return { success: false, error: 'Items can only be removed from draft orders.' }
  }

  try {
    await prisma.purchaseOrderItem.delete({ where: { id: itemId } })
    revalidatePath(`/dashboard/inventory/purchase-orders/${item.purchaseOrderId}`)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to remove item.' }
  }
}

export async function markOrderSent(orderId: string): Promise<POResult<PORow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId }, include: PO_INCLUDE })
  if (!po) return { success: false, error: 'Order not found.' }
  if (po.status !== 'draft') return { success: false, error: 'Only draft orders can be marked as sent.' }
  if (po.items.length === 0) return { success: false, error: 'Add at least one item before sending.' }

  try {
    const updated = await prisma.purchaseOrder.update({
      where:   { id: orderId },
      data:    { status: 'sent', sentBy: user.id, sentAt: new Date() },
      include: PO_INCLUDE,
    })
    revalidatePath(`/dashboard/inventory/purchase-orders/${orderId}`)
    revalidatePath('/dashboard/inventory/purchase-orders')
    return { success: true, data: mapPORow(updated) }
  } catch {
    return { success: false, error: 'Failed to update order.' }
  }
}

export async function markOrderShipped(
  orderId: string,
  _prev: POResult | null,
  formData: FormData,
): Promise<POResult<PORow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId } })
  if (!po) return { success: false, error: 'Order not found.' }
  if (po.status !== 'sent') return { success: false, error: 'Only sent orders can be marked as shipped.' }

  const parsed = MarkShippedSchema.safeParse({
    trackingRef: formData.get('trackingRef') || null,
    expectedAt:  formData.get('expectedAt')  || null,
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  try {
    const updated = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status:      'shipped',
        shippedAt:   new Date(),
        trackingRef: d.trackingRef ?? null,
        expectedAt:  d.expectedAt ? new Date(d.expectedAt) : null,
      },
      include: PO_INCLUDE,
    })
    revalidatePath(`/dashboard/inventory/purchase-orders/${orderId}`)
    revalidatePath('/dashboard/inventory/purchase-orders')
    return { success: true, data: mapPORow(updated) }
  } catch {
    return { success: false, error: 'Failed to update order.' }
  }
}

export async function markOrderReceived(
  orderId: string,
  _prev: POResult | null,
  formData: FormData,
): Promise<POResult<PORow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const po = await prisma.purchaseOrder.findUnique({
    where:   { id: orderId },
    include: { items: { include: { product: { select: { name: true, sku: true, unit: true } } } } },
  })
  if (!po) return { success: false, error: 'Order not found.' }
  if (po.status !== 'shipped' && po.status !== 'sent') {
    return { success: false, error: 'Only shipped or sent orders can be marked as received.' }
  }

  // Parse per-item received quantities from formData
  // Form fields: qtyReceived_{itemId}
  const receiveItems: Array<{ itemId: string; qtyReceived: number }> = []
  for (const item of po.items) {
    const raw = formData.get(`qtyReceived_${item.id}`)
    const parsed = ReceiveItemSchema.safeParse({ itemId: item.id, qtyReceived: raw })
    if (!parsed.success) return { success: false, error: `${item.product.name}: ${parsed.error.errors[0].message}` }
    receiveItems.push({ itemId: item.id, qtyReceived: parsed.data.qtyReceived })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Update each item's qtyReceived
      for (const { itemId, qtyReceived } of receiveItems) {
        await tx.purchaseOrderItem.update({
          where: { id: itemId },
          data:  { qtyReceived },
        })
      }

      // Create stock ledger entries for received quantities
      for (const { itemId, qtyReceived } of receiveItems) {
        if (qtyReceived <= 0) continue
        const item = po.items.find(i => i.id === itemId)!
        await tx.stockLedger.create({
          data: {
            productId:       item.productId,
            changeQty:       qtyReceived,
            reason:          'received',
            performedBy:     user.id,
            purchaseOrderId: orderId,
          },
        })
      }

      // Close the order
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data:  { status: 'received', receivedAt: new Date(), receivedBy: user.id },
      })
    })

    revalidatePath(`/dashboard/inventory/purchase-orders/${orderId}`)
    revalidatePath('/dashboard/inventory/purchase-orders')
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')

    const updated = await prisma.purchaseOrder.findUnique({
      where:   { id: orderId },
      include: { supplier: { select: { name: true } }, items: { select: { id: true } } },
    })
    return { success: true, data: mapPORow(updated!) }
  } catch {
    return { success: false, error: 'Failed to receive order.' }
  }
}

export async function updatePurchaseOrder(
  orderId: string,
  _prev: POResult | null,
  formData: FormData,
): Promise<POResult<PORow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId } })
  if (!po) return { success: false, error: 'Order not found.' }

  const parsed = UpdatePOSchema.safeParse({
    notes:         formData.get('notes')         || null,
    invoiceNumber: formData.get('invoiceNumber') || null,
    invoiceDate:   formData.get('invoiceDate')   || null,
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  try {
    const updated = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        notes:         d.notes         ?? null,
        invoiceNumber: d.invoiceNumber ?? null,
        invoiceDate:   d.invoiceDate   ? new Date(d.invoiceDate) : null,
        editedAt:      new Date(),
        editedBy:      user.id,
      },
      include: PO_INCLUDE,
    })
    revalidatePath(`/dashboard/inventory/purchase-orders/${orderId}`)
    return { success: true, data: mapPORow(updated) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: msg }
  }
}

export async function cancelOrder(orderId: string): Promise<POResult<PORow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id: orderId } })
  if (!po) return { success: false, error: 'Order not found.' }
  if (po.status === 'received' || po.status === 'cancelled') {
    return { success: false, error: 'This order cannot be cancelled.' }
  }

  try {
    const updated = await prisma.purchaseOrder.update({
      where:   { id: orderId },
      data:    { status: 'cancelled', cancelledBy: user.id, cancelledAt: new Date() },
      include: PO_INCLUDE,
    })
    revalidatePath(`/dashboard/inventory/purchase-orders/${orderId}`)
    revalidatePath('/dashboard/inventory/purchase-orders')
    return { success: true, data: mapPORow(updated) }
  } catch {
    return { success: false, error: 'Failed to cancel order.' }
  }
}
