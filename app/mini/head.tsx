// app/mini/head.tsx
export default function MiniHead() {
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

  const miniAppMeta = {
    version: '1',
    imageUrl: `${SITE}/miniapp-card.png?v=4`,
    button: {
      title: 'FairPlay Vault',
      action: {
        type: 'launch_frame',
        name: 'FairPlay Vault',
        url: `${SITE}/mini`,
        splashImageUrl: `${SITE}/icon-192.png?v=4`,
        splashBackgroundColor: '#0b1220',
      },
    },
  }

  return (
    <>
      <title>FairPlay Vault — Mini App</title>
      <meta name="description" content="Create and join provably-fair commit–reveal USDC pools on Base." />

      {/* Farcaster Mini App meta for this route */}
      <meta name="fc:miniapp" content={JSON.stringify(miniAppMeta)} />
      <meta name="fc:miniapp:domain" content="fairplay-vault.vercel.app" />
      {/* Back-compat */}
      <meta name="fc:frame" content={JSON.stringify(miniAppMeta)} />

      {/* Nice-to-have OG/Twitter for the /mini URL */}
      <meta property="og:title" content="FairPlay Vault" />
      <meta property="og:description" content="Provably-fair USDC pools on Base." />
      <meta property="og:image" content={`${SITE}/miniapp-card.png?v=4`} />
      <meta property="og:url" content={`${SITE}/mini`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="FairPlay Vault" />
      <meta name="twitter:description" content="Provably-fair USDC pools on Base." />
      <meta name="twitter:image" content={`${SITE}/miniapp-card.png?v=4`} />
    </>
  )
}
