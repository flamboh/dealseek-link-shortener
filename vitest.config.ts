import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations')
  return {
    plugins: [
      cloudflareTest({
        main: './worker/test/entry.ts',
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations, VISITOR_SALT: 'test-salt' },
          durableObjects: {
            LINK_STATS: { className: 'LinkStats', useSQLite: true },
            CREATE_LIMITER: { className: 'CreateLimiter', useSQLite: true },
          },
        },
      }),
    ],
    test: {
      include: ['worker/**/*.test.ts', 'guard/**/*.test.ts', 'shared/**/*.test.ts'],
      setupFiles: ['./worker/test/apply-migrations.ts'],
    },
  }
})
