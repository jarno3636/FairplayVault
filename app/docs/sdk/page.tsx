// pages in docs: app/docs/sdk/page.tsx (optional)
export default function SdkDocs() {
  return (
    <main className="prose prose-invert">
      <h1>Fairplay SDK</h1>
      <p>Typed client for interacting with a Fairplay Vault on Base.</p>
      <pre><code>{`import { fp } from '@/lib/fairplay' // your setup
const pool = await fp.getPool(123n)
`}</code></pre>
    </main>
  )
}
