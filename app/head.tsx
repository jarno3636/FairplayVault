// app/head.tsx
export default function Head() {
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

  // mini app JSON (keep this small)
  const miniAppEmbed = {
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

  return (
    <>
      {/* OG/Twitter (safe to keep) */}
      <meta property="og:title" content="FairPlay Vault — Provably-fair USDC pools on Base" />
      <meta property="og:description" content="Create and join commit–reveal USDC pools on Base. Transparent, no VRF required." />
      <meta property="og:url" content={SITE} />
      <meta property="og:image" content={`${SITE}/miniapp-card.png`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />

      {/* Farcaster FRAME (must use property=..., not name=...) */}
      <meta property="fc:frame" content="vNext" />
      <meta property="fc:frame:image" content={`${SITE}/miniapp-card.png`} />
      <meta property="fc:frame:post_url" content={`${SITE}/api/frame?screen=home`} />
      <meta property="fc:frame:button:1" content="Open" />
      <meta property="fc:frame:button:1:action" content="post" />
      <meta property="fc:frame:button:2" content="Shuffle" />
      <meta property="fc:frame:button:2:action" content="post" />

      {/* Farcaster Mini App embed (this one is name="fc:miniapp") */}
      <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />
      <meta name="fc:miniapp:domain" content="fairplay-vault.vercel.app" />
    </>
  )
}
