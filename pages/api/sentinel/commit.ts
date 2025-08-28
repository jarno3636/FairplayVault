import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const base = process.env.NEXT_PUBLIC_SENTINEL_URL
    if (!base) return res.status(400).json({ error: 'NEXT_PUBLIC_SENTINEL_URL not set' })
    const r = await fetch(base + '/commit', { cache: 'no-store' })
    const data = await r.json()
    res.status(200).json(data)
  } catch (e:any) {
    res.status(500).json({ error: e.message || String(e) })
  }
}
