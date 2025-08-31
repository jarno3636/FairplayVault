// app/api/frame/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // faster static HTML in Vercel

// --- helpers ---------------------------------------------------------------
function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = (req.headers.get('x-forwarded-proto') || 'https').toString()
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toString()
  return `${proto}://${host}`.replace(/\/$/, '')
}

const clamp = (s = '', n = 80) => String(s).replace(/\s+/g, ' ').slice(0, n)
const sanitizeScreen = (s?: string | null) =>
  (s || 'home').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'home'

// POST body may be JSON or raw string; parse safely
async function parseBody(req: NextRequest) {
  try {
    const raw = await req.text()
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function htmlFor(opts: {
  title: string
  image: string
  pageUrl: string
  postUrl: string
  buttons: Array<{ label: string; action?: 'post' | 'post_redirect'; target?: string }>
}) {
  const { title, image, pageUrl, postUrl, buttons } = opts

  const btnMeta = buttons
    .map((b, i) => {
      const idx = i + 1
      const lines = [
        `<meta property="fc:frame:button:${idx}" content="${b.label}" />`,
        b.action ? `<meta property="fc:frame:button:${idx}:action" content="${b.action}" />` : '',
        b.target ? `<meta property="fc:frame:button:${idx}:target" content="${b.target}" />` : '',
      ].filter(Boolean)
      return lines.join('\n    ')
    })
    .join('\n    ')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${clamp(title, 80)}</title>

    <!-- OpenGraph / Twitter -->
    <meta property="og:title" content="${clamp(title, 80)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />

    <!-- Farcaster Frame vNext -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${image}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${btnMeta}
  </head>
  <body></body>
</html>`
}

// screen registry (title, image, web page)
function screenConfig(baseUrl: string, screen: string, v: string) {
  // If you haven't created /public/og/*.png, this fallback always exists:
  const card = `${baseUrl}/miniapp-card.png?v=${encodeURIComponent(v)}`
  const og = (name: string) => `${baseUrl}/og/${name}.png?v=${encodeURIComponent(v)}`

  switch (screen) {
    case 'pools':
      return { title: 'FairPlay Vault — Recent Pools', image: og('pools'), pageUrl: `${baseUrl}/#recent` }
    case 'create':
      return { title: 'FairPlay Vault — Create a Pool', image: og('create'), pageUrl: `${baseUrl}/#create` }
    case 'products':
      return { title: 'FairPlay Vault — Products & SDK', image: og('products'), pageUrl: `${baseUrl}/products` }
    case 'instructions':
      return { title: 'FairPlay Vault — Instructions', image: og('instructions'), pageUrl: `${baseUrl}/instructions` }
    case 'about':
      return { title: 'FairPlay Vault — About', image: og('about'), pageUrl: `${baseUrl}/about` }
    case 'home':
    default:
      return { title: 'FairPlay Vault — Provably-fair USDC pools on Base', image: card, pageUrl: `${baseUrl}/` }
  }
}

function buildButtons(baseUrl: string, screen: string, v: string) {
  const openMiniBtn = {
    label: 'Open in Mini App',
    action: 'post_redirect' as const,
    target: `${baseUrl}/mini?from=frame&screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`,
  }

  const navButtons: Record<string, Array<{ label: string }>> = {
    home:        [{ label: 'Browse Pools' }, { label: 'Create Pool' }],
    pools:       [{ label: 'Create Pool' },  { label: 'Products' }],
    create:      [{ label: 'Browse Pools' }, { label: 'Instructions' }],
    products:    [{ label: 'Instructions' }, { label: 'About' }],
    instructions:[{ label: 'Create Pool' },  { label: 'Browse Pools' }],
    about:       [{ label: 'Products' },     { label: 'Browse Pools' }],
  }
  const fallbacks = navButtons[screen] || navButtons.home

  return [
    openMiniBtn,
    { label: fallbacks[0].label, action: 'post' as const },
    { label: fallbacks[1].label, action: 'post' as const },
  ]
}

function routeButton(screen: string, buttonIndex: number) {
  if (buttonIndex === 2) {
    const map: Record<string, string> = {
      home: 'pools',
      pools: 'create',
      create: 'pools',
      products: 'instructions',
      instructions: 'create',
      about: 'products',
    }
    return map[screen] || 'pools'
  }
  if (buttonIndex === 3) {
    const map: Record<string, string> = {
      home: 'create',
      pools: 'products',
      create: 'instructions',
      products: 'about',
      instructions: 'pools',
      about: 'pools',
    }
    return map[screen] || 'create'
  }
  return screen // #1 is post_redirect
}

// --- handlers --------------------------------------------------------------
export async function HEAD(req: NextRequest) {
  // Some crawlers do a HEAD first; respond with same headers as GET
  const baseUrl = getBaseUrl(req)
  const search = req.nextUrl.searchParams
  const screen = sanitizeScreen(search.get('screen'))
  const v = search.get('v') || '9'

  const { title, image, pageUrl } = screenConfig(baseUrl, screen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`
  const buttons = buildButtons(baseUrl, screen, v)

  const body = htmlFor({ title, image, pageUrl, postUrl, buttons })
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const search = req.nextUrl.searchParams
  const screen = sanitizeScreen(search.get('screen'))
  const v = search.get('v') || '9'

  const { title, image, pageUrl } = screenConfig(baseUrl, screen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`
  const buttons = buildButtons(baseUrl, screen, v)

  const body = htmlFor({ title, image, pageUrl, postUrl, buttons })
  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}

export async function POST(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const search = req.nextUrl.searchParams
  const screen = sanitizeScreen(search.get('screen'))
  const v = search.get('v') || '9'

  const body = await parseBody(req)
  const rawIndex =
    (body && Number((body.untrustedData?.buttonIndex as any) ?? (body.buttonIndex as any))) || 0
  const btnIndex = Number.isFinite(rawIndex) ? Number(rawIndex) : 0

  const nextScreen = routeButton(screen, btnIndex)
  const { title, image, pageUrl } = screenConfig(baseUrl, nextScreen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(nextScreen)}&v=${encodeURIComponent(v)}`
  const buttons = buildButtons(baseUrl, nextScreen, v)

  const out = htmlFor({ title, image, pageUrl, postUrl, buttons })
  return new NextResponse(out, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
