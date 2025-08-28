export const dynamic = 'force-dynamic'

export default function About() {
  return (
    <div className="prose prose-invert max-w-3xl">
      <h1>About Fairplay</h1>
      <p>
        Fairplay is a commit–reveal pool engine for USDC on Base. Creators configure deadlines and fees,
        participants enter at a fixed price, and a winner is drawn using revealed salts + blockhash.
      </p>
      <h2>Why commit–reveal?</h2>
      <ul>
        <li>No reliance on external VRF services.</li>
        <li>Simple & cheap: salts are pre-committed and revealed later.</li>
        <li>Optional dual-commit sentinel adds neutrality.</li>
      </ul>
      <h2>Security model</h2>
      <p>
        Creator and (optional) sentinel post bonds and must reveal on time. Missed reveals are slashed to the protocol.
        Always verify contracts and keep pools moderate in size while you iterate.
      </p>
      <p className="text-slate-400 text-sm">
        Contract: <code>{process.env.NEXT_PUBLIC_VAULT_ADDRESS}</code>
      </p>
    </div>
  )
}
