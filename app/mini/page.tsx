// app/mini/page.tsx

export const dynamic = 'force-static' // keep lightweight & crawler-friendly

export default function MiniLanding() {
  return (
    <main className="min-h-[60vh] grid place-items-center p-6 text-center bg-slate-950 text-slate-100">
      <div>
        <h1 className="text-2xl font-semibold">FairPlay Vault Mini App</h1>
        <p className="mt-2 text-slate-400">
          If you’re seeing this page, you opened the embed URL directly in a browser.
        </p>
        <a
          href="/"
          className="btn mt-4 inline-block rounded-lg bg-cyan-500 px-4 py-2 text-white hover:bg-cyan-400"
        >
          Open Full App
        </a>
        <noscript>
          <p className="mt-3 text-xs text-slate-500">
            Enable JavaScript to use the app.
          </p>
        </noscript>
      </div>
    </main>
  )
}
