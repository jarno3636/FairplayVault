// lib/abi/FairplayVault.ts
import type { Abi } from 'viem'
import raw from './FairplayVault_ABI.json'

// Type the imported JSON as a viem Abi (no "as const" on a variable)
export const FAIRPLAY_VAULT_ABI: Abi = raw as unknown as Abi
