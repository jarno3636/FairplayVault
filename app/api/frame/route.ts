// app/api/frame/route.ts  (ensure this is the current one)
import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'edge'
export const dynamic = 'force-dynamic'        // <= disable static
export const revalidate = 0                   // <= disable ISR

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

async function parseBody(req: NextRequest) {
  try {
    const raw = await req.text()
    if (!raw) return {}
    return JSON.parse(raw)
  } catch { return {} }
}

function htmlFor(opts: {
  title: string; image: string; pageUrl: string; postUrl: string;
  buttons: Array<{ label: string; action?: 'post' | 'post_redirect'; target?: string }>
}) {
  const { title, image, pageUrl, postUrl, buttons } = opts
  const btnMeta = buttons.map((b, i) => {
    const idx = i + 1
    return [
      `<meta property="fc:frame:button:${idx}" content="${b.label}" />`,
      b.action ? `<meta property="fc:frame:button:${idx}:action" content="${b.action}" />` : '',
      b.target ? `<meta property="fc:frame:button:${idx}:target" content="${b.target}" />` : '',
    ].filter(Boolean).join('\n    ')
  }).join('\n    ')

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${clamp(title, 80)}</title>

    <meta property="og:title" content="${clamp(title, 80)}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />

    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${image}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${btnMeta}
  </head>
  <body style="font-family: system-ui; color:#e2e8f0; background:#0b1220; padding:16px;">
    <div style="max-width:720px;margin:0 auto;">
      <h1 style="margin:0 0 8px 0;font-size:18px;">Frame OK</h1>
      <p style="margin:0 0 12px 0;">Meta tags are present. This route is intended for Warpcast to read &lt;meta&gt;.</p>
      <code style="display:block;white-space:pre-wrap;background:#111827;border:1px solid #334155;border-radius:8px;padding:12px;">
fc:frame:image → ${image}
fc:frame:post_url → ${postUrl}
      </code>
    </div>
  </body>
</html>`
}

function screenConfig(baseUrl: string, screen: string, v: string) {
  const card = `${baseUrl}/miniapp-card.png?v=${encodeURIComponent(v)}`
  const og = (name: string) => `${baseUrl}/og/${name}.png?v=${encodeURIComponent(v)}`
  switch (screen) {
    case 'pools':        return { title:'FairPlay Vault — Recent Pools',     image:og('pools'),        pageUrl:`${baseUrl}/#recent` }
    case 'create':       return { title:'FairPlay Vault — Create a Pool',    image:og('create'),       pageUrl:`${baseUrl}/#create` }
    case 'products':     return { title:'FairPlay Vault — Products & SDK',   image:og('products'),     pageUrl:`${baseUrl}/products` }
    case 'instructions': return { title:'FairPlay Vault — Instructions',     image:og('instructions'), pageUrl:`${baseUrl}/instructions` }
    case 'about':        return { title:'FairPlay Vault — About',            image:og('about'),        pageUrl:`${baseUrl}/about` }
    case 'home':
    default:             return { title:'FairPlay Vault — Provably-fair USDC pools on Base', image:card, pageUrl:`${baseUrl}/` }
  }
}

function buildButtons(baseUrl: string, screen: string, v: string) {
  const openMiniBtn = {
    label: 'Open in Mini App',
    action: 'post_redirect' as const,
    target: `${baseUrl}/mini?from=frame&screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`,
  }
  const nav: Record<string, Array<{ label: string }>> = {
    home:[{label:'Browse Pools'},{label:'Create Pool'}],
    pools:[{label:'Create Pool'},{label:'Products'}],
    create:[{label:'Browse Pools'},{label:'Instructions'}],
    products:[{label:'Instructions'},{label:'About'}],
    instructions:[{label:'Create Pool'},{label:'Browse Pools'}],
    about:[{label:'Products'},{label:'Browse Pools'}],
  }
  const fb = nav[screen] || nav.home
  return [openMiniBtn, { label: fb[0].label, action: 'post' as const }, { label: fb[1].label, action: 'post' as const }]
}

function routeButton(screen: string, buttonIndex: number) {
  if (buttonIndex === 2) return ({home:'pools',pools:'create',create:'pools',products:'instructions',instructions:'create',about:'products'} as any)[screen] || 'pools'
  if (buttonIndex === 3) return ({home:'create',pools:'products',create:'instructions',products:'about',instructions:'pools',about:'pools'} as any)[screen] || 'create'
  return screen
}

function noStore() {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store, max-age=0, must-revalidate',
  }
}

export async function HEAD(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const q = req.nextUrl.searchParams
  const screen = (q.get('screen') || 'home').toString()
  const v = (q.get('v') || '9').toString()
  const { title, image, pageUrl } = screenConfig(baseUrl, screen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`
  return new NextResponse(htmlFor({ title, image, pageUrl, postUrl, buttons: buildButtons(baseUrl, screen, v) }), { status: 200, headers: noStore() })
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const q = req.nextUrl.searchParams
  const screen = (q.get('screen') || 'home').toString()
  const v = (q.get('v') || '9').toString()
  const { title, image, pageUrl } = screenConfig(baseUrl, screen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}&v=${encodeURIComponent(v)}`
  return new NextResponse(htmlFor({ title, image, pageUrl, postUrl, buttons: buildButtons(baseUrl, screen, v) }), { status: 200, headers: noStore() })
}

export async function POST(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const q = req.nextUrl.searchParams
  const screen = (q.get('screen') || 'home').toString()
  const v = (q.get('v') || '9').toString()
  const body = await parseBody(req)
  const btnIndex = Number(((body as any)?.untrustedData?.buttonIndex ?? (body as any)?.buttonIndex) ?? 0) || 0
  const nextScreen = routeButton(screen, btnIndex)
  const { title, image, pageUrl } = screenConfig(baseUrl, nextScreen, v)
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(nextScreen)}&v=${encodeURIComponent(v)}`
  return new NextResponse(htmlFor({ title, image, pageUrl, postUrl, buttons: buildButtons(baseUrl, nextScreen, v) }), { status: 200, headers: noStore() })
}
