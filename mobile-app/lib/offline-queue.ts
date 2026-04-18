import * as SQLite from 'expo-sqlite'
import { supabase } from './supabase'

let db: SQLite.SQLiteDatabase | null = null

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db
  db = await SQLite.openDatabaseAsync('offline_queue.db')
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_queue (
      id          TEXT PRIMARY KEY,
      op          TEXT NOT NULL,
      payload     TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0
    );
  `)
  return db
}

export async function enqueue(op: string, payload: object): Promise<void> {
  const database = await getDb()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  await database.runAsync(
    'INSERT INTO offline_queue (id, op, payload, created_at) VALUES (?, ?, ?, ?)',
    [id, op, JSON.stringify(payload), Date.now()],
  )
}

export async function drainQueue(): Promise<void> {
  const database = await getDb()
  const rows = await database.getAllAsync<{
    id: string; op: string; payload: string; retry_count: number
  }>('SELECT * FROM offline_queue ORDER BY created_at ASC')

  for (const row of rows) {
    try {
      const payload = JSON.parse(row.payload)
      let error: unknown = null

      if (row.op === 'adjust_stock') {
        const { error: err } = await supabase.from('stock_ledger').insert(payload)
        error = err
      } else if (row.op === 'receive_goods') {
        const { error: err } = await supabase.from('stock_ledger').insert(payload)
        error = err
      }

      if (!error) {
        await database.runAsync('DELETE FROM offline_queue WHERE id = ?', [row.id])
      } else {
        await database.runAsync(
          'UPDATE offline_queue SET retry_count = retry_count + 1 WHERE id = ?',
          [row.id],
        )
      }
    } catch {
      await database.runAsync(
        'UPDATE offline_queue SET retry_count = retry_count + 1 WHERE id = ?',
        [row.id],
      )
    }
  }
}

export async function getQueueLength(): Promise<number> {
  const database = await getDb()
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM offline_queue',
  )
  return result?.count ?? 0
}
