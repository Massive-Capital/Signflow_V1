const PRIVATE_IPV4_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
]

let cachedMachineIp: string | null | undefined
let discoveryInFlight: Promise<string | undefined> | null = null

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(ip))
}

function isPrivateIpv6(ip: string): boolean {
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
  if (ip.startsWith('127.')) return false
  return isPrivateIpv4(ip) || isPrivateIpv6(ip)
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

async function discoverMachineIp(): Promise<string | undefined> {
  if (typeof window === 'undefined' || typeof RTCPeerConnection === 'undefined') {
    cachedMachineIp = null
    return undefined
  }

  try {
    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('signflow-ip')

    const discovered = new Set<string>()
    const ipPattern = /([0-9]{1,3}(?:\.[0-9]{1,3}){3}|[a-f0-9:]+)/gi

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
        resolve(pickBestMachineIp(discovered))
      }

      const considerEarlyFinish = () => {
        const best = pickBestMachineIp(discovered)
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

        const matches = event.candidate.candidate.match(ipPattern) ?? []
        for (const match of matches) {
          if (isUsableMachineIp(match)) {
            discovered.add(match)
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

/** Discover the user's local machine IP (LAN), not their public network IP. */
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
