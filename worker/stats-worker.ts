export { LinkStats } from './link-stats'

export default {
  fetch: () => new Response('Not found.', { status: 404 }),
} satisfies ExportedHandler<Env>
