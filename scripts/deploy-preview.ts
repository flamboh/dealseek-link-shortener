import { appendFileSync } from 'node:fs'

const WORKER_NAME = 'dealseek-link-shortener-preview'
const STATS_WORKER_CONFIG = 'dist/dealseek_link_stats/wrangler.json'
const GUARD_WORKER_CONFIG = 'dist/dealseek_link_guard/wrangler.json'
const MAX_ALIAS_LENGTH = 63 - WORKER_NAME.length - 1

async function attempt(cmd: string[], env: Record<string, string> = {}): Promise<{ ok: boolean; output: string }> {
  const proc = Bun.spawn(cmd, { env: { ...process.env, ...env }, stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()])
  process.stdout.write(stdout)
  process.stderr.write(stderr)
  return { ok: (await proc.exited) === 0, output: stdout + stderr }
}

async function run(cmd: string[], env: Record<string, string> = {}): Promise<string> {
  const result = await attempt(cmd, env)
  if (!result.ok) throw new Error(`Command failed: ${cmd.join(' ')}`)
  return result.output
}

export function toPreviewAlias(branch: string): string {
  let alias = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!/^[a-z]/.test(alias)) alias = `b-${alias}`
  return alias.slice(0, MAX_ALIAS_LENGTH).replace(/-+$/, '')
}

async function currentBranch(): Promise<string> {
  const fromEnv = process.env.PREVIEW_BRANCH || process.env.GITHUB_HEAD_REF
  if (fromEnv) return fromEnv
  const proc = Bun.spawn(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { stdout: 'pipe' })
  return (await new Response(proc.stdout).text()).trim()
}

const alias = toPreviewAlias(await currentBranch())
console.log(`Preview alias: ${alias}`)

await run(['bunx', 'wrangler', 'd1', 'migrations', 'apply', 'DB', '--remote', '--env', 'preview', '--config', 'wrangler.jsonc'])
await run(['bun', 'run', 'build'], { CLOUDFLARE_ENV: 'preview' })
await run(['bunx', 'wrangler', 'deploy', '--config', STATS_WORKER_CONFIG])
await run(['bunx', 'wrangler', 'deploy', '--config', GUARD_WORKER_CONFIG])
const upload = ['bunx', 'wrangler', 'versions', 'upload', '--preview-alias', alias]
let result = await attempt(upload)
if (!result.ok && result.output.includes('does not yet exist')) {
  console.log(`\n${WORKER_NAME} does not exist yet. Deploying it once, then retrying the upload.`)
  await run(['bunx', 'wrangler', 'deploy'])
  result = await attempt(upload)
}
if (!result.ok) throw new Error('wrangler versions upload failed.')
const output = result.output

const aliasUrl = output.match(/Version Preview Alias URL:\s*(\S+)/)?.[1]
const versionUrl = output.match(/Version Preview URL:\s*(\S+)/)?.[1]
const url = aliasUrl ?? versionUrl
if (!url) throw new Error('Could not find the preview URL in the wrangler output.')

console.log(`\nPreview URL: ${url}`)
if (versionUrl && versionUrl !== url) console.log(`Version URL: ${versionUrl}`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\nalias=${alias}\n`)
