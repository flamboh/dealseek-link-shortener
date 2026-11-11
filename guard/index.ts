import { DurableObject } from 'cloudflare:workers'
import { attemptCreate, type CreateDecision, EMPTY_STATE, forgetAt, type LimitState } from './create-limit'

const STATE_KEY = 'state'

export class CreateLimiter extends DurableObject {
  async attempt(): Promise<CreateDecision> {
    const now = Date.now()
    const previous = this.ctx.storage.kv.get<LimitState>(STATE_KEY) ?? EMPTY_STATE
    const { state, decision } = attemptCreate(previous, now)
    if (state !== previous) {
      this.ctx.storage.kv.put(STATE_KEY, state)
      await this.ctx.storage.setAlarm(forgetAt(state))
    }
    return decision
  }

  async alarm(): Promise<void> {
    const state = this.ctx.storage.kv.get<LimitState>(STATE_KEY)
    if (!state) return
    const at = forgetAt(state)
    if (Date.now() >= at) await this.ctx.storage.deleteAll()
    else await this.ctx.storage.setAlarm(at)
  }
}

export default {
  fetch: () => new Response('Not found.', { status: 404 }),
} satisfies ExportedHandler
