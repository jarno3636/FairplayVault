// app/mini/head.tsx
export default function Head() {
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')
  const CARD = `${SITE}/miniapp-card.png?v=7`
  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <meta name="theme-color" content="#0b1220" />
      <meta name="fc:miniapp" content={JSON.stringify({
        version: '1',
        imageUrl: CARD,
        button: {
          title: 'Open FairPlay Vault',
          action: {
            type: 'launch_frame',
            name: 'FairPlay Vault',
            url: `${SITE}/mini?v=7`,
            splashImageUrl: `${SITE}/icon-192.png`,
            splashBackgroundColor: '#0b1220'
          }
        }
      })} />
      <meta property="og:title" content="FairPlay Vault — Mini App" />
      <meta property="og:description" content="Provably-fair USDC pools on Base." />
      <meta property="og:image" content={CARD} />
      <meta property="og:url" content={`${SITE}/mini`} />
      <meta name="twitter:card" content="summary_large_image" />
    </>
  )
}
