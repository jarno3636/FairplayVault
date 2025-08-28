export const dynamic = 'force-dynamic'

export default function Instructions() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="card">
        <h2>How to create a pool</h2>
        <ol className="list-decimal pl-6 space-y-2 text-slate-300">
          <li>Click <b>Create Pool</b> and set entry price, deadlines, and fees.</li>
          <li>Optionally add a sentinel commit hash (from your sentinel service).</li>
          <li>Confirm the transaction; your pool is now open until the entry deadline.</li>
        </ol>
      </div>
      <div className="card">
        <h2>Entering a pool</h2>
        <ol className="list-decimal pl-6 space-y-2 text-slate-300">
          <li>Approve USDC (one-time) and Enter with desired quantity.</li>
          <li>After the deadline, waits for reveal window.</li>
        </ol>
      </div>
      <div className="card">
        <h2>Reveal & finalize</h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-300">
          <li>Creator (and sentinel if configured) must reveal salts before their deadlines.</li>
          <li>Once conditions are met, the winner is drawn and paid instantly.</li>
          <li>If reveals are missed, anyone can finalize; missed bonds are slashed.</li>
        </ul>
      </div>
    </div>
  )
}
