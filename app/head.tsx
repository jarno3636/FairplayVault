// app/head.tsx
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://fairplay-vault.vercel.app').replace(/\/$/, '')

export default function Head() {
  // This is the card Warpcast shows in the feed for /
  const miniAppEmbed = {
    version: '1',
    imageUrl: `${SITE}/miniapp-card.png?v=8`, // 1200x800 card you made
    button: {
      title: 'FairPlay Vault',
      action: {
        type: 'launch_frame',
        name: 'FairPlay Vault',
        url: `${SITE}/mini`,                 // your in-app landing (or just SITE if you prefer)
        splashImageUrl: `${SITE}/icon-192.png?v=8`,
        splashBackgroundColor: '#0b1220',
      },
    },
  }

  return (
    <>
      {/* keep your usual SEO if you want */}
      <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />
      <meta name="fc:miniapp:domain" content="fairplay-vault.vercel.app" />
      {/* optional small preload */}
      <link rel="preload" as="image" href={`${SITE}/miniapp-card.png?v=8`} />
    </>
  )
}
