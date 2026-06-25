import { useCallback, useState } from 'react'

export function useConfirmAction<T>() {
  const [target, setTarget] = useState<T | null>(null)

  const request = useCallback((item: T) => setTarget(item), [])
  const cancel = useCallback(() => setTarget(null), [])

  return {
    target,
    isOpen: target !== null,
    request,
    cancel,
  }
}
