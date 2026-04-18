import { cookies } from 'next/headers'

const COOKIE = 'lh-store-filter'

/**
 * Returns the list of selected store IDs from the cookie.
 * Empty array means "all stores" (no filter applied).
 */
export async function getSelectedStoreIds(): Promise<string[]> {
  const jar = await cookies()
  const val = jar.get(COOKIE)?.value
  if (!val) return []
  return val.split(',').filter(Boolean)
}

/**
 * Returns a Prisma `storeId` filter appropriate for the selection.
 * If no stores selected (all), returns undefined (no filter).
 */
export async function getStoreFilter(): Promise<{ storeId?: { in: string[] } }> {
  const ids = await getSelectedStoreIds()
  if (ids.length === 0) return {}
  return { storeId: { in: ids } }
}
