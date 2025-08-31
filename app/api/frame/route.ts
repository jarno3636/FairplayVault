import { NextRequest, NextResponse } from 'next/server'

// ---- helpers ----
function getBaseUrl(req: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (envUrl) return envUrl.replace(/\/$/, '')
  const proto = (req.headers.get('x-forwarded-proto') || 'https').toString()
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').toString()
  return `${proto}://${host}`.replace(/\/$/, '')
}

const clamp = (s: string = '', n = 64) => String(s).replace(/\s+/g, ' ').slice(0, n)
const sanitizeScreen = (s: string | null | undefined) =>
  (s || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24) || 'home'

async function readJsonBody(req: NextRequest): Promise<any> {
  try {
    const text = await req.text()
    if (!text) return {}
    return JSON.parse(text)
  } catch {
    return {}
  }
}

function htmlFor(o: { title: string; image: string; pageUrl: string; postUrl: string }) {
  const { title, image, pageUrl, postUrl } = o
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="utf-8" />
    <meta property="og:title" content="${title}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />

    <!-- Frame vNext meta -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${image}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />

    <!-- Buttons -->
    <meta property="fc:frame:button:1" content="Open" />
    <meta property="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:button:2" content="Shuffle" />
    <meta property="fc:frame:button:2:action" content="post" />
  </head>
  <body></body>
</html>`
}

function responseHTML(html: string) {
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
    },
  })
}

// ---- GET ----
export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const url = new URL(req.url)
  const screen = sanitizeScreen(url.searchParams.get('screen'))

  let title = 'FairPlay Vault — Provably-fair USDC pools on Base'
  let image = `${baseUrl}/og.png`
  let pageUrl = `${baseUrl}`
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}`

  // Map screens -> images/pages (customize as you like)
  if (screen === 'home') {
    title = 'FairPlay Vault — Create or Join a Pool'
    image = `${baseUrl}/miniapp-card.png`
    pageUrl = `${baseUrl}/`
  } else if (screen === 'products') {
    title = 'FairPlay Vault — Products & SDK'
    image = `${baseUrl}/og.png`
    pageUrl = `${baseUrl}/products`
  }

  return responseHTML(htmlFor({ title, image, pageUrl, postUrl }))
}

// ---- POST (button interactions) ----
export async function POST(req: NextRequest) {
  const baseUrl = getBaseUrl(req)
  const url = new URL(req.url)
  const screen = sanitizeScreen(url.searchParams.get('screen'))
  const body = await readJsonBody(req)

  let title = 'FairPlay Vault — Provably-fair USDC pools on Base'
  let image = `${baseUrl}/miniapp-card.png`
  let pageUrl = `${baseUrl}/`
  const postUrl = `${baseUrl}/api/frame?screen=${encodeURIComponent(screen)}`

  // Example: buttonIndex 2 shuffles image
  const btn = String(
    body?.untrustedData?.buttonIndex ?? body?.buttonIndex ?? ''
  )

  if (btn === '2') {
    image = `${baseUrl}/og.png`
    title = clamp(title, 80)
  }

  return responseHTML(htmlFor({ title, image, pageUrl, postUrl }))
}
