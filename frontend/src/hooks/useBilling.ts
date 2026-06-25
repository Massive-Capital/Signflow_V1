import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export function useBilling() {
  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: api.billing.getInvoices,
  })

  const usageQuery = useQuery({
    queryKey: ['usage'],
    queryFn: api.billing.getUsage,
  })

  return { invoicesQuery, usageQuery }
}
