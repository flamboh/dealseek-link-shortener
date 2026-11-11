import { DurableObject } from 'cloudflare:workers'
import { addHash, createSketch, estimate } from './hll'

export interface LinkStatsSnapshot {
  clicks: number
  visitors: number
}

export class LinkStats extends DurableObject<Env> {
  private total = 0
  private registers = createSketch()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    const sql = ctx.storage.sql
    sql.exec(
      'CREATE TABLE IF NOT EXISTS stats (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL, registers BLOB NOT NULL)',
    )
    const row = sql.exec<{ total: number; registers: ArrayBuffer }>('SELECT total, registers FROM stats WHERE id = 1').toArray()[0]
    if (row) {
      this.total = row.total
      this.registers = new Uint8Array(row.registers)
    }
  }

  record(visitor: bigint): void {
    this.total += 1
    const sql = this.ctx.storage.sql
    if (addHash(this.registers, visitor)) {
      sql.exec(
        'INSERT INTO stats (id, total, registers) VALUES (1, ?, ?) ON CONFLICT (id) DO UPDATE SET total = excluded.total, registers = excluded.registers',
        this.total,
        this.registers.buffer,
      )
    } else {
      sql.exec('UPDATE stats SET total = ? WHERE id = 1', this.total)
    }
  }

  stats(): LinkStatsSnapshot {
    return { clicks: this.total, visitors: Math.min(this.total, Math.round(estimate(this.registers))) }
  }
}
