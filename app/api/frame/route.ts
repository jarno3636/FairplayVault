import { NextRequest } from 'next/server'

// --- helpers ---------------------------------------------------------------
function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = (req.headers.get('x-forwarded-proto') || 'https').toString()
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toString()
  return `${proto}://${host}`.replace(/\/$/, '')
}

// tiny clamps/sanitizers (only used inside meta tags)
const clamp = (s = '', n = 80) => String(s).replace(/\s+/g, ' ').slice(0, n)
const sanitizeScreen = (s?: string | null) =>
  (s || 'home').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'home'

// parse POST body (Warpcast can send string or json)
async function parseBody(req: NextRequest) {
  const raw = await req.text()
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function htmlFor(opts: {
  title: string
  image: string
  pageUrl: string
  postUrl: string
  buttons: Array<{ label: string; action?: 'post' | 'post_redirect'; target?: string }>
}) {
  const { title, image, pageUrl, postUrl, buttons } = opts

  // Build button meta set
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
function screenConfig(baseUrl: string, screen: string) {
  // You can replace these image paths with real artwork:
  // put files in /public/og/...
  const og = (name: string) => `${baseUrl}/og/${name}.png`

  switch (screen) {
    case 'pools':
      return {
        title: 'FairPlay Vault — Recent Pools',
        image: og('pools'),              // e.g. public/og/pools.png (1200x630)
        pageUrl: `${baseUrl}/#recent`,
      }
    case 'create':
      return {
        title: 'FairPlay Vault — Create a Pool',
        image: og('create'),             // e.g. public/og/create.png
        pageUrl: `${baseUrl}/#create`,
      }
    case 'products':
      return {
        title: 'FairPlay Vault — Products & SDK',
        image: og('products'),
        pageUrl: `${baseUrl}/products`,
      }
    case 'instructions':
      return {
        title: 'FairPlay Vault — Instructions',
        image: og('instructions'),
        pageUrl: `${baseUrl}/instructions`,
      }
    case 'about':
      return {
        title: 'FairPlay Vault — About',
        image: og('about'),
        pageUrl: `${baseUrl}/about`,
      }
    case 'home':
    default:
      return {
        title: 'FairPlay Vault — Provably-fair USDC pools on Base',
        // Use your 1200x800 card if you like; Warpcast letterboxes fine.
        image: `${baseUrl}/miniapp-card.png`,
        pageUrl: `${baseUrl}/`,
      }
  }
}

function buildButtons(baseUrl: string, screen: string) {
  // Button 1 always opens the Mini App (inside Warpcast)
  const openMiniBtn = {
    label: 'Open in Mini App',
    action: 'post_redirect' as const,
    target: `${baseUrl}/mini?from=frame&screen=${encodeURIComponent(screen)}`,
  }

  // Secondary buttons switch in-cast screens (POST back to this endpoint)
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
    // #2 and #3: in-frame nav (we’ll map clicks in POST)
    { label: fallbacks[0].label, action: 'post' as const },
    { label: fallbacks[1].label, action: 'post' as const },
  ]
}

// map a secondary button click -> new screen
function routeButton(screen: string, buttonIndex: number) {
  if (buttonIndex === 2) {
    // second button
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
    // third button
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
  // button 1 is post_redirect to /mini; we never re-render for it
  return screen
}

// --- handlers --------------------------------------------------------------
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const search = req.nextUrl.searchParams
  const screen = sanitizeScreen(search.get('screen'))
  const { title, image, pageUrl } = screenConfig(baseUrl, screen)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}`
  const buttons = buildButtons(baseUrl, screen)

  const html = htmlFor({ title, image, pageUrl, postUrl, buttons })
  return new Response(html, {
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

  const body = await parseBody(req)
  // Warpcast sends button index as untrustedData.buttonIndex
  const btn =
    Number(body?.untrustedData?.buttonIndex) ||
    Number(body?.buttonIndex) ||
    0

  // If user pressed #2/#3, switch screens in-frame
  const nextScreen = routeButton(screen, btn)

  const { title, image, pageUrl } = screenConfig(baseUrl, nextScreen)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(nextScreen)}`
  const buttons = buildButtons(baseUrl, nextScreen)

  const html = htmlFor({ title, image, pageUrl, postUrl, buttons })
  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}
