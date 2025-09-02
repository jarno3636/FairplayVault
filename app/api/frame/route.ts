// app/api/frame/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge' // fast HTML on Vercel

// ------- helpers -------
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

  // Visible body text helps when you hit this route in a browser
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
  <body style="font-family: ui-sans-serif, system-ui; background:#0b1220; color:#cbd5e1; padding:16px;">
    <div style="max-width:780px;margin:0 auto">
      <h1 style="margin:0 0 8px;font-size:18px;">Frame OK</h1>
      <p style="margin:0 0 4px;">Screen: <strong>${pageUrl.split('#').pop() || 'home'}</strong></p>
      <p style="margin:0 0 12px;">Image: <code style="font-family:monospace">${image}</code></p>
      <p style="opacity:.7;font-size:12px">This page is primarily meta tags for Warpcast.</p>
    </div>
  </body>
</html>`
}

// screen registry (title, image, web page)
function screenConfig(baseUrl: string, screen: string, v: string) {
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

// Build 3 buttons with Button 1 staying in-frame (post)
function buildButtons(baseUrl: string, screen: string, v: string) {
  // 1) In-frame "Open" (cycles screens via POST)
  const inFrameOpenBtn = { label: 'Open', action: 'post' as const }

  // 2) & 3) nav buttons
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
    inFrameOpenBtn,
    { label: fallbacks[0].label, action: 'post' as const },
    { label: fallbacks[1].label, action: 'post' as const },
  ]
}

// Map which screen to show after a button click
function routeButton(screen: string, buttonIndex: number) {
  // Button 1: "Open" (stay in-frame) — cycle forward through main screens
  if (buttonIndex === 1) {
    const map: Record<string, string> = {
      home: 'pools',
      pools: 'create',
      create: 'instructions',
      products: 'about',
      instructions: 'pools',
      about: 'products',
    }
    return map[screen] || 'pools'
  }

  // Button 2
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

  // Button 3
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

  return screen
}

// ------- handlers -------
function respond(html: string) {
  return new NextResponse(html, {
    status: 200,
    headers: {
      // No static caching — always fresh for validators
      'cache-control': 'no-store, max-age=0',
      'content-type': 'text/html; charset=utf-8',
    },
  })
}

export async function HEAD(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const search = req.nextUrl.searchParams
  const screen = sanitizeScreen(search.get('screen'))
  const v = search.get('v') || '9'

  const { title, image, pageUrl } = screenConfig(baseUrl, screen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`
  const buttons = buildButtons(baseUrl, screen, v)

  return respond(htmlFor({ title, image, pageUrl, postUrl, buttons }))
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const search = req.nextUrl.searchParams
  const screen = sanitizeScreen(search.get('screen'))
  const v = search.get('v') || '9'

  const { title, image, pageUrl } = screenConfig(baseUrl, screen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`
  const buttons = buildButtons(baseUrl, screen, v)

  return respond(htmlFor({ title, image, pageUrl, postUrl, buttons }))
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

  return respond(htmlFor({ title, image, pageUrl, postUrl, buttons }))
}
