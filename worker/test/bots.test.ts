import { describe, expect, it } from 'vitest'
import { isBot, shouldCountClick } from '../bots'

const BROWSERS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
  'Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
  'curl/8.5.0',
]

const BOTS = [
  'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  'Mozilla/5.0 (compatible; Slackbot/1.0)',
  'Twitterbot/1.0',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  'WhatsApp/2.23.20.0',
  'TelegramBot (like TwitterBot)',
  'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0',
  'Mozilla/5.0 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'SomeCrawler/1.0',
  'Example-Spider/2.1',
  'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5',
  'Mozilla/5.0 (compatible; Embedly/0.2; +http://support.embed.ly/)',
  'Iframely/1.3.1 (+https://iframely.com/docs/about)',
  'Mastodon/4.2.0 (http.rb/5.1.1; +https://mastodon.social/)',
  '',
  '   ',
]

function get(headers: Record<string, string>, method = 'GET'): Request {
  return new Request('https://links.example/Bcdfghjk', { method, headers })
}

describe('isBot', () => {
  it.each(BROWSERS)('lets a person through: %s', (userAgent) => {
    expect(isBot(userAgent)).toBe(false)
  })

  it.each(BOTS)('flags a bot or preview fetcher: %s', (userAgent) => {
    expect(isBot(userAgent)).toBe(true)
  })

  it('treats a missing user agent as a bot', () => {
    expect(isBot(null)).toBe(true)
  })
})

describe('shouldCountClick', () => {
  it('counts a GET from a browser', () => {
    expect(shouldCountClick(get({ 'user-agent': BROWSERS[0] }))).toBe(true)
  })

  it('skips HEAD requests', () => {
    expect(shouldCountClick(get({ 'user-agent': BROWSERS[0] }, 'HEAD'))).toBe(false)
  })

  it('skips bots', () => {
    expect(shouldCountClick(get({ 'user-agent': BOTS[0] }))).toBe(false)
  })

  it('skips browser prefetch and prerender', () => {
    expect(shouldCountClick(get({ 'user-agent': BROWSERS[1], 'sec-purpose': 'prefetch' }))).toBe(false)
    expect(shouldCountClick(get({ 'user-agent': BROWSERS[1], 'sec-purpose': 'prefetch;prerender' }))).toBe(false)
    expect(shouldCountClick(get({ 'user-agent': BROWSERS[1], purpose: 'prefetch' }))).toBe(false)
  })
})
