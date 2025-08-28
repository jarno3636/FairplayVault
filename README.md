# Fairplay Frontend (Pro)

Production-ready Next.js dApp for the **FairplayVault** on Base.

## Stack
- Next.js 14 (App Router) + TypeScript
- wagmi v2 + viem
- RainbowKit v2 (WalletConnect)
- TailwindCSS (dark UI)
- React Query, React Hot Toast
- Axios for sentinel integration

## Quick start
```bash
cp .env.local.sample .env.local
# set NEXT_PUBLIC_WALLETCONNECT_ID
npm i
npm run dev
```

## Pages
- `/` Dashboard: connect, create pool (single or dual-commit), list recent pools
- `/pool/[id]`: enter, reveal (creator), finalize; live updates
- `/fees`: withdraw protocol/builder fees to your address

## Security
- Creator salt can be stored encrypted (AES-GCM) in localStorage with a passphrase
- Strict headers, no inline scripts by default

## Build & run
```bash
npm run build
npm start
```

## Docker
```
docker build -t fairplay-frontend .
docker run -p 3000:3000 --env-file .env.local fairplay-frontend
```
