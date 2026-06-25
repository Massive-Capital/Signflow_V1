import type { Recipient } from '../types'

/** Pre-seeded roles for investor-portal template embed (no recipient setup UI). */
export const EMBED_DEFAULT_RECIPIENTS: Recipient[] = [
  {
    id: 'rec_investor',
    name: 'Investor',
    email: 'investor@embed.local',
    role: 'buyer',
    color: '#dc2626',
    order: 1,
  },
  {
    id: 'rec_sponsor',
    name: 'Sponsor',
    email: 'sponsor@embed.local',
    role: 'seller',
    color: '#2563eb',
    order: 2,
  },
]
