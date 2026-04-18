'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'

export type SupplierResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface SupplierRow {
  id:                   string
  name:                 string
  contactName:          string | null
  phone:                string | null
  email:                string | null
  website:              string | null
  address:              string | null
  paymentTerms:         string | null
  paymentMethod:        string | null
  leadTimeDays:         number | null
  minOrderAmount:       string | null
  deliveryFeeThreshold: string | null
  currency:             string
  taxId:                string | null
  accountNumber:        string | null
  deliveryDays:         string | null
  orderingEmail:        string | null
  returnPolicy:         string | null
  catalogUrl:           string | null
  isActive:             boolean
  isApproved:           boolean
  deactivationReason:   string | null
  notes:                string | null
  createdAt:            string
  updatedAt:            string
}

const SupplierSchema = z.object({
  name:                 z.string().min(1, 'Name is required.').max(200).trim(),
  contactName:          z.string().max(200).trim().nullable().optional(),
  phone:                z.string().max(50).trim().nullable().optional(),
  email:                z.string().email('Invalid email.').nullable().optional().or(z.literal('')),
  website:              z.string().url('Invalid URL.').nullable().optional().or(z.literal('')),
  address:              z.string().max(300).trim().nullable().optional(),
  paymentTerms:         z.string().max(50).trim().nullable().optional(),
  paymentMethod:        z.string().max(50).trim().nullable().optional(),
  leadTimeDays:         z.preprocess(v => v === '' ? null : v,
    z.coerce.number().int().min(0).max(365).nullable().optional()),
  minOrderAmount:       z.preprocess(v => v === '' ? null : v,
    z.coerce.number().min(0).nullable().optional()),
  deliveryFeeThreshold: z.preprocess(v => v === '' ? null : v,
    z.coerce.number().min(0).nullable().optional()),
  currency:             z.string().length(3).default('USD'),
  taxId:                z.string().max(20).trim().nullable().optional(),
  accountNumber:        z.string().max(100).trim().nullable().optional(),
  deliveryDays:         z.string().max(100).trim().nullable().optional(),
  orderingEmail:        z.string().email('Invalid ordering email.').nullable().optional().or(z.literal('')),
  returnPolicy:         z.string().max(500).trim().nullable().optional(),
  catalogUrl:           z.string().url('Invalid catalog URL.').nullable().optional().or(z.literal('')),
  isActive:             z.preprocess(v => v === 'true' || v === true, z.boolean()).default(true),
  isApproved:           z.preprocess(v => v === 'true' || v === true, z.boolean()).default(true),
  deactivationReason:   z.string().max(200).trim().nullable().optional(),
  notes:                z.string().max(1000).trim().nullable().optional(),
})

function toRow(s: {
  id: string; name: string; contactName: string | null; phone: string | null
  email: string | null; website: string | null; address: string | null
  paymentTerms: string | null; paymentMethod: string | null; leadTimeDays: number | null
  minOrderAmount: unknown; deliveryFeeThreshold: unknown; currency: string
  taxId: string | null; accountNumber: string | null; deliveryDays: string | null
  orderingEmail: string | null; returnPolicy: string | null; catalogUrl: string | null
  isActive: boolean; isApproved: boolean; deactivationReason: string | null
  notes: string | null; createdAt: Date; updatedAt: Date
}): SupplierRow {
  return {
    id:                   s.id,
    name:                 s.name,
    contactName:          s.contactName,
    phone:                s.phone,
    email:                s.email,
    website:              s.website,
    address:              s.address,
    paymentTerms:         s.paymentTerms,
    paymentMethod:        s.paymentMethod,
    leadTimeDays:         s.leadTimeDays,
    minOrderAmount:       s.minOrderAmount != null ? String(s.minOrderAmount) : null,
    deliveryFeeThreshold: s.deliveryFeeThreshold != null ? String(s.deliveryFeeThreshold) : null,
    currency:             s.currency,
    taxId:                s.taxId,
    accountNumber:        s.accountNumber,
    deliveryDays:         s.deliveryDays,
    orderingEmail:        s.orderingEmail,
    returnPolicy:         s.returnPolicy,
    catalogUrl:           s.catalogUrl,
    isActive:             s.isActive,
    isApproved:           s.isApproved,
    deactivationReason:   s.deactivationReason,
    notes:                s.notes,
    createdAt:            s.createdAt.toISOString(),
    updatedAt:            s.updatedAt.toISOString(),
  }
}

export async function getSuppliers(includeInactive = false): Promise<SupplierResult<SupplierRow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      where:   includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: suppliers.map(toRow) }
  } catch {
    return { success: false, error: 'Failed to load suppliers.' }
  }
}

function parseFormData(formData: FormData) {
  return SupplierSchema.safeParse({
    name:                 formData.get('name'),
    contactName:          formData.get('contactName')          || null,
    phone:                formData.get('phone')                 || null,
    email:                formData.get('email')                 || null,
    website:              formData.get('website')               || null,
    address:              formData.get('address')               || null,
    paymentTerms:         formData.get('paymentTerms')          || null,
    paymentMethod:        formData.get('paymentMethod')         || null,
    leadTimeDays:         formData.get('leadTimeDays')          || '',
    minOrderAmount:       formData.get('minOrderAmount')        || '',
    deliveryFeeThreshold: formData.get('deliveryFeeThreshold')  || '',
    currency:             formData.get('currency')              || 'USD',
    taxId:                formData.get('taxId')                 || null,
    accountNumber:        formData.get('accountNumber')         || null,
    deliveryDays:         formData.get('deliveryDays')          || null,
    orderingEmail:        formData.get('orderingEmail')         || null,
    returnPolicy:         formData.get('returnPolicy')          || null,
    catalogUrl:           formData.get('catalogUrl')            || null,
    isActive:             formData.get('isActive'),
    isApproved:           formData.get('isApproved'),
    deactivationReason:   formData.get('deactivationReason')    || null,
    notes:                formData.get('notes')                 || null,
  })
}

export async function createSupplier(
  _prev: SupplierResult | null,
  formData: FormData,
): Promise<SupplierResult<SupplierRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = parseFormData(formData)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  try {
    const supplier = await prisma.supplier.create({ data: { ...parsed.data, isActive: true } })
    revalidatePath('/suppliers')
    revalidatePath('/inventory/new')
    return { success: true, data: toRow(supplier) }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2002') {
      return { success: false, error: 'A supplier with that name already exists.' }
    }
    return { success: false, error: 'Failed to create supplier.' }
  }
}

export async function updateSupplier(
  id: string,
  _prev: SupplierResult | null,
  formData: FormData,
): Promise<SupplierResult<SupplierRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = parseFormData(formData)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }

  try {
    const supplier = await prisma.supplier.update({ where: { id }, data: parsed.data })
    revalidatePath('/suppliers')
    return { success: true, data: toRow(supplier) }
  } catch {
    return { success: false, error: 'Failed to update supplier.' }
  }
}
