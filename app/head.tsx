// app/head.tsx
/* Renders *global* <head> tags for the root ("/") route. */
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

// Mini App JSON payload (must be name="fc:miniapp")
const fcMiniApp = JSON.stringify({
  version: '1',
  imageUrl: `${SITE}/miniapp-card.png`,
  button: {
    title: 'FairPlay Vault',
    action: {
      type: 'launch_frame',
      name: 'FairPlay Vault',
      url: `${SITE}/mini`,                 // in-Warpcast webview URL
      splashImageUrl: `${SITE}/icon-192.png`,
      splashBackgroundColor: '#0b1220',
    },
  },
})

export default function Head() {
  return (
    <>
      {/* --- Farcaster Frame vNext (REQUIRES property=...) --- */}
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content={`${SITE}/miniapp-card.png`} />
      <meta property="fc:frame:post_url" content={`${SITE}/api/frame?screen=home`} />

      <meta property="fc:frame:button:1" content="Open in App" />
      <meta property="fc:frame:button:1:action" content="post_redirect" />
      <meta property="fc:frame:button:1:target" content={`${SITE}/mini?from=frame&screen=home`} />

      <meta property="fc:frame:button:2" content="Browse Pools" />
      <meta property="fc:frame:button:2:action" content="post" />

      <meta property="fc:frame:button:3" content="Create Pool" />
      <meta property="fc:frame:button:3:action" content="post" />

      {/* --- Farcaster Mini App (REQUIRES name=...) --- */}
      <meta name="fc:miniapp" content={fcMiniApp} />
      <meta name="fc:miniapp:domain" content="fairplay-vault.vercel.app" />
    </>
  )
}
