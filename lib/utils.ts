import { keccak256, hexToBytes } from 'viem'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function usdc(n: number) { return BigInt(Math.round(n * 1_000_000)); }
export function fromUsdc(v: bigint) { return Number(v) / 1_000_000; }
export function formatUsd(v: bigint) { return `$${fromUsdc(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
export function formatTs(sec: number) { const d = new Date(sec * 1000); return d.toLocaleString(); }
export function timeLeft(sec: number) { const now = Math.floor(Date.now()/1000); const s = Math.max(0, sec - now); const m = Math.floor(s/60), r = s%60; return `${m}m ${r}s`; }
export function randomSalt32(): `0x${string}` {
  const arr = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) crypto.getRandomValues(arr);
  else for (let i=0;i<32;i++) arr[i] = Math.floor(Math.random()*256);
  return ('0x' + Array.from(arr, b => b.toString(16).padStart(2,'0')).join('')) as `0x${string}`;
}
export function commitOf(salt: `0x${string}`): `0x${string}` { return keccak256(hexToBytes(salt)); }

// ✅ Add this at the bottom:
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
