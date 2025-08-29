// lib/admin.ts
export function getAdminAddresses(): string[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || ''
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}
export function isAdminAddress(addr?: string | null) {
  return !!addr && getAdminAddresses().includes(addr.toLowerCase())
}
