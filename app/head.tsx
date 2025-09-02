// app/head.tsx
// Farcaster Mini App + Frame meta for the homepage ("/").
// Keep OG/Twitter SEO in layout/page metadata as you have—this file only handles fc:*.

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

const fcMiniApp = {
  version: '1',
  imageUrl: `${SITE}/miniapp-card.png`,
  button: {
    title: 'FairPlay Vault',
    action: {
      type: 'launch_frame',
      name: 'FairPlay Vault',
      url: `${SITE}/mini`,
      splashImageUrl: `${SITE}/icon-192.png`,
      splashBackgroundColor: '#0b1220',
    },
  },
}

export default function Head() {
  return (
    <>
      {/* ---- Farcaster Frame vNext (Button 1 stays in-frame via post) ---- */}
      <meta name="fc:frame" content="vNext" />
      <meta name="fc:frame:image" content={`${SITE}/miniapp-card.png`} />
      <meta name="fc:frame:post_url" content={`${SITE}/api/frame?screen=home`} />

      <meta name="fc:frame:button:1" content="Open" />
      <meta name="fc:frame:button:1:action" content="post" />

      <meta name="fc:frame:button:2" content="Browse Pools" />
      <meta name="fc:frame:button:2:action" content="post" />

      <meta name="fc:frame:button:3" content="Create Pool" />
      <meta name="fc:frame:button:3:action" content="post" />

      {/* ---- Farcaster Mini App embed ---- */}
      <meta name="fc:miniapp" content={JSON.stringify(fcMiniApp)} />
      <meta name="fc:miniapp:domain" content="fairplay-vault.vercel.app" />
    </>
  )
}
