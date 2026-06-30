const PRIVATE_IPV4_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
]

let cachedMachineIp: string | null | undefined
let discoveryInFlight: Promise<string | undefined> | null = null

function isValidIpv4(ip: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false
  return ip.split('.').every((octet) => {
    const value = Number(octet)
    return value >= 0 && value <= 255
  })
}

function isValidIpv6(ip: string): boolean {
  if (!ip.includes(':')) return false
  const normalized = ip.toLowerCase()
  if (normalized === '::') return true
  return /^(?:[0-9a-f]{1,4}:){1,7}[0-9a-f]{1,4}$|^::(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}$|^(?:[0-9a-f]{1,4}:){1,7}:$|^(?:[0-9a-f]{1,4}:){0,6}::(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4}$/.test(
    normalized,
  )
}

function isPrivateIpv4(ip: string): boolean {
  return isValidIpv4(ip) && PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(ip))
}

function isPrivateIpv6(ip: string): boolean {
  if (!isValidIpv6(ip)) return false
  const normalized = ip.toLowerCase()
  return (
    normalized.startsWith('fe80:') ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd')
  )
}

function isUsableMachineIp(ip: string): boolean {
  if (!ip || ip.includes('.local')) return false
  if (ip === '0.0.0.0' || ip === '::') return false
  if (isValidIpv4(ip) && ip.startsWith('127.')) return false
  return isPrivateIpv4(ip) || isPrivateIpv6(ip)
}

function isPublicIpv4(ip: string): boolean {
  if (!isValidIpv4(ip)) return false
  if (isPrivateIpv4(ip)) return false
  if (ip.startsWith('127.') || ip.startsWith('169.254.')) return false
  return true
}

function pickBestMachineIp(ips: Iterable<string>): string | undefined {
  const candidates = [...ips].filter(isUsableMachineIp)
  if (candidates.length === 0) return undefined

  const score = (ip: string): number => {
    if (ip.startsWith('192.168.')) return 3
    if (ip.startsWith('10.')) return 2
    if (isPrivateIpv6(ip)) return 1
    return 0
  }

  return candidates.sort((left, right) => score(right) - score(left))[0]
}

function pickBestClientIp(ips: Iterable<string>): string | undefined {
  const machineIp = pickBestMachineIp(ips)
  if (machineIp) return machineIp

  const publicIpv4 = [...ips].filter(isPublicIpv4).sort()[0]
  return publicIpv4
}

function collectCandidateAddresses(candidate: RTCIceCandidate): string[] {
  const addresses: string[] = []
  if (candidate.address) addresses.push(candidate.address)
  if (candidate.relatedAddress) addresses.push(candidate.relatedAddress)

  // Only parse IPv4 from the SDP candidate line. ICE ufrag/network-id tokens
  // (e.g. "fdb3") match loose hex patterns and must not be treated as IPv6.
  const ipv4Matches = candidate.candidate.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g) ?? []
  addresses.push(...ipv4Matches)
  return addresses
}

async function discoverMachineIp(): Promise<string | undefined> {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    cachedMachineIp = null
    return undefined
  }

  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    })
    pc.createDataChannel('signflow-ip')

    const discovered = new Set<string>()

    const machineIp = await new Promise<string | undefined>((resolve) => {
      let settled = false
      let earlyResolveTimer: number | undefined

      const finish = () => {
        if (settled) return
        settled = true
        window.clearTimeout(timeoutId)
        if (earlyResolveTimer !== undefined) {
          window.clearTimeout(earlyResolveTimer)
        }
        pc.onicecandidate = null
        pc.close()
        resolve(pickBestClientIp(discovered))
      }

      const considerEarlyFinish = () => {
        const best = pickBestClientIp(discovered)
        if (best?.startsWith('192.168.')) {
          finish()
          return
        }
        if (best && earlyResolveTimer === undefined) {
          earlyResolveTimer = window.setTimeout(finish, 300)
        }
      }

      const timeoutId = window.setTimeout(finish, 2500)

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          finish()
          return
        }

        for (const address of collectCandidateAddresses(event.candidate)) {
          if (isUsableMachineIp(address) || isPublicIpv4(address)) {
            discovered.add(address)
          }
        }
        considerEarlyFinish()
      }

      void pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(finish)
    })

    cachedMachineIp = machineIp ?? null
    return machineIp
  } catch {
    cachedMachineIp = null
    return undefined
  }
}

/** Discover the user's machine IP (LAN preferred, public network IP as fallback). */
export async function getMachineIp(): Promise<string | undefined> {
  if (cachedMachineIp !== undefined) {
    return cachedMachineIp ?? undefined
  }

  if (!discoveryInFlight) {
    discoveryInFlight = discoverMachineIp().finally(() => {
      discoveryInFlight = null
    })
  }

  return discoveryInFlight
}

export async function getMachineIpHeaders(): Promise<Record<string, string>> {
  const machineIp = await getMachineIp()
  return machineIp ? { 'X-Client-Machine-Ip': machineIp } : {}
}

/** Warm the machine IP cache during signing flows. */
export function prefetchMachineIp(): void {
  void getMachineIp()
}
