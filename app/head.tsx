// app/head.tsx
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

export default function Head() {
  // Farcaster Mini App meta visible at the ROOT URL
  const miniAppMeta = {
    version: '1',
    imageUrl: `${SITE}/og.png?v=4`,
    button: {
      title: 'Open FairPlay Vault',
      action: {
        // Newer spec prefers "launch_miniapp"; keep legacy below for safety
        type: 'launch_miniapp',
        name: 'FairPlay Vault',
        url: `${SITE}/`,
        splashImageUrl: `${SITE}/icon-192.png?v=4`,
        splashBackgroundColor: '#0b1220',
      },
    },
  }

  // Back-compat for older clients that still read fc:frame
  const legacyFrameMeta = {
    ...miniAppMeta,
    button: {
      ...miniAppMeta.button,
      action: { ...miniAppMeta.button.action, type: 'launch_frame' },
    },
  }

  return (
    <>
      {/* Farcaster Mini App tags */}
      <meta name="fc:miniapp" content={JSON.stringify(miniAppMeta)} />
      <meta name="fc:frame" content={JSON.stringify(legacyFrameMeta)} />

      {/* Solid OG/Twitter so the cast preview looks good */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content="FairPlay Vault" />
      <meta property="og:description" content="Provably-fair USDC pools on Base." />
      <meta property="og:url" content={SITE} />
      <meta property="og:image" content={`${SITE}/og.png?v=4`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="FairPlay Vault" />
      <meta name="twitter:description" content="Provably-fair USDC pools on Base." />
      <meta name="twitter:image" content={`${SITE}/og.png?v=4`} />
    </>
  )
}
