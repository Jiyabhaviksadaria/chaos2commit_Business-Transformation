// SSRF Protection Utilities
export function isPrivateIP(ip: string): boolean {
  if (ip === "::1" || ip === "127.0.0.1") return true
  
  if (ip.includes(":")) {
    const lower = ip.toLowerCase()
    return lower.startsWith("fd") || lower.startsWith("fc") || lower.startsWith("fe80")
  }
  
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4) return false
  if (parts.some(p => isNaN(p) || p < 0 || p > 255)) return false
  
  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true
  
  return false
}
