import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/useAppStore'

export interface ProductRow {
  id:            string
  sku:           string | null
  barcode:       string | null
  name:          string
  namEs:         string | null
  category:      string | null
  unit:          string
  currentStock:  number
  reorderPoint:  number | null
  imageUrl:      string | null
  storeId:       string | null
}

export function useProducts(search = '') {
  const activeStore = useAppStore(s => s.activeStore)
  const [products, setProducts]   = useState<ProductRow[]>([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from('products')
      .select(`
        id, sku, barcode, name, name_es,
        categories(name), unit, reorder_point, image_url, store_id,
        stock_ledger(change_qty)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (activeStore) query = query.eq('store_id', activeStore)
    if (search)      query = query.ilike('name', `%${search}%`)

    const { data, error: err } = await query
    if (err) { setError(err.message); setLoading(false); return }

    const rows: ProductRow[] = (data ?? []).map((p: {
      id: string; sku: string | null; barcode: string | null; name: string;
      name_es: string | null; categories: { name: string } | null; unit: string;
      reorder_point: number | null; image_url: string | null; store_id: string | null;
      stock_ledger: { change_qty: number }[];
    }) => ({
      id:           p.id,
      sku:          p.sku,
      barcode:      p.barcode,
      name:         p.name,
      namEs:        p.name_es,
      category:     p.categories?.name ?? null,
      unit:         p.unit,
      currentStock: (p.stock_ledger ?? []).reduce((s: number, e: { change_qty: number }) => s + e.change_qty, 0),
      reorderPoint: p.reorder_point,
      imageUrl:     p.image_url,
      storeId:      p.store_id,
    }))

    setProducts(rows)
    setLoading(false)
  }, [activeStore, search])

  useEffect(() => { fetch() }, [fetch])

  return { products, loading, error, refetch: fetch }
}

export async function lookupByBarcode(barcode: string): Promise<ProductRow | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, sku, barcode, name, name_es, categories(name), unit, reorder_point, image_url, store_id,
      stock_ledger(change_qty)
    `)
    .eq('barcode', barcode)
    .eq('is_active', true)
    .single()

  if (error || !data) return null

  const d = data as {
    id: string; sku: string | null; barcode: string | null; name: string;
    name_es: string | null; categories: { name: string } | null; unit: string;
    reorder_point: number | null; image_url: string | null; store_id: string | null;
    stock_ledger: { change_qty: number }[];
  }

  return {
    id:           d.id,
    sku:          d.sku,
    barcode:      d.barcode,
    name:         d.name,
    namEs:        d.name_es,
    category:     d.categories?.name ?? null,
    unit:         d.unit,
    currentStock: (d.stock_ledger ?? []).reduce((s, e) => s + e.change_qty, 0),
    reorderPoint: d.reorder_point,
    imageUrl:     d.image_url,
    storeId:      d.store_id,
  }
}
