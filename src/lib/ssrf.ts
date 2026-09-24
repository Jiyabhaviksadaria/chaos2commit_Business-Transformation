import dns from "node:dns/promises"
import net from "node:net"

/** Error type used by URL ingestion so callers can return a safe client message. */
export class SsrfError extends Error {
  constructor(message: string, public readonly code = "SSRF_BLOCKED") {
    super(message)
    this.name = "SsrfError"
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false

  const [a, b, c] = parts
  return (
    a === 0 || // current network
    a === 10 || // RFC1918
    a === 127 || // loopback
    (a === 100 && b >= 64 && b <= 126) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local / cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) || // IETF protocol assignments
    (a === 192 && b === 0 && c === 2) || // TEST-NET-1
    (a === 192 && b === 168) ||
    (a === 192 && b === 88 && c === 99) || // deprecated 6to4 anycast
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast, future-use and reserved
  )
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0].replace(/^\[|\]$/g, "")
  if (normalized === "::1" || normalized === "::") return true

  // IPv4-mapped and IPv4-compatible IPv6 addresses must be checked too.
  const embedded = normalized.match(/(?:^|:)(?:\d{1,3}\.){3}\d{1,3}$/)?.[0].replace(/^:/, "")
  if (embedded && isPrivateIpv4(embedded)) return true

  if (normalized.startsWith("fe80") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true
  if (normalized.startsWith("ff")) return true // multicast
  if (normalized.startsWith("2001:db8")) return true // documentation
  if (normalized.startsWith("2001:0")) return true // Teredo
  if (normalized.startsWith("2001:2")) return true // benchmarking
  if (normalized.startsWith("2001:10")) return true // ORCHID
  return false
}

/**
 * Returns true for addresses that must never be reached by the URL scraper.
 * This intentionally errs on the side of blocking unusual/reserved ranges.
 */
export function isPrivateIP(ip: string): boolean {
  const value = ip.trim().replace(/^\[|\]$/g, "")
  if (net.isIPv4(value)) return isPrivateIpv4(value)
  if (net.isIPv6(value)) return isPrivateIpv6(value)
  return false
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata",
])

function hostnameIsBlocked(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "")
  return (
    BLOCKED_HOSTNAMES.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1"
  )
}

/** Parse and validate a user supplied URL without making a network request. */
export function parseExternalUrl(raw: string): URL {
  let value = raw.trim()
  if (!value) throw new SsrfError("Please enter a website URL.", "INVALID_URL")
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = `https://${value}`

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new SsrfError("Enter a valid website URL, such as https://example.com.", "INVALID_URL")
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfError("Only HTTP and HTTPS website URLs are supported.", "INVALID_PROTOCOL")
  }
  if (parsed.username || parsed.password) {
    throw new SsrfError("Website URLs containing credentials are not allowed.", "INVALID_URL")
  }
  if (!parsed.hostname || hostnameIsBlocked(parsed.hostname)) {
    throw new SsrfError("Access to local or private network addresses is forbidden.", "PRIVATE_ADDRESS")
  }
  const literalHost = parsed.hostname.replace(/^\[|\]$/g, "")
  if (net.isIP(literalHost) && isPrivateIP(literalHost)) {
    throw new SsrfError("Access to local or private network addresses is forbidden.", "PRIVATE_ADDRESS")
  }
  if (parsed.port && !["80", "443"].includes(parsed.port)) {
    throw new SsrfError("The website URL uses a port that is not allowed.", "INVALID_PORT")
  }

  return parsed
}

/** Resolve every DNS answer and reject private, loopback, link-local or reserved targets. */
export async function assertPublicUrl(url: URL | string): Promise<URL> {
  const parsed = typeof url === "string" ? parseExternalUrl(url) : url
  if (hostnameIsBlocked(parsed.hostname)) {
    throw new SsrfError("Access to local or private network addresses is forbidden.", "PRIVATE_ADDRESS")
  }

  // A literal IP does not need DNS, but still must pass the address classifier.
  if (net.isIP(parsed.hostname.replace(/^\[|\]$/g, ""))) {
    if (isPrivateIP(parsed.hostname)) {
      throw new SsrfError("Access to local or private network addresses is forbidden.", "PRIVATE_ADDRESS")
    }
    return parsed
  }

  let addresses: Array<{ address: string }>
  let lookupTimer: ReturnType<typeof setTimeout> | undefined
  try {
    addresses = await Promise.race([
      dns.lookup(parsed.hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        lookupTimer = setTimeout(() => reject(new SsrfError("The website hostname lookup timed out.", "DNS_FAILURE")), 5_000)
      }),
    ])
  } catch {
    throw new SsrfError("The website hostname could not be resolved.", "DNS_FAILURE")
  } finally {
    if (lookupTimer) clearTimeout(lookupTimer)
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateIP(address))) {
    throw new SsrfError("Access to local or private network addresses is forbidden.", "PRIVATE_ADDRESS")
  }
  return parsed
}

/** Validate, canonicalize, and resolve a URL for one request/redirect hop. */
export async function validateExternalUrl(raw: string): Promise<URL> {
  return assertPublicUrl(parseExternalUrl(raw))
}

export function canonicalizeUrl(url: URL | string): string {
  const parsed = typeof url === "string" ? parseExternalUrl(url) : url
  parsed.hash = ""
  // Do not treat a trailing slash as a different source when comparing URLs.
  if (parsed.pathname === "/") parsed.pathname = ""
  return parsed.toString()
}
