import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastInput {
  type: ToastType
  message: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  add: (toast: ToastInput) => string
  dismiss: (id: string) => void
}

const MAX_TOASTS = 5
let toastCounter = 0
const dismissTimers = new Map<string, number>()

function defaultDuration(type: ToastType): number {
  return type === 'error' ? 6000 : 4000
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  add: (toast) => {
    const id = `toast-${++toastCounter}`
    set((state) => ({
      toasts: [...state.toasts, { id, type: toast.type, message: toast.message }].slice(-MAX_TOASTS),
    }))

    const timeout = window.setTimeout(() => {
      dismissTimers.delete(id)
      get().dismiss(id)
    }, toast.duration ?? defaultDuration(toast.type))

    dismissTimers.set(id, timeout)
    return id
  },

  dismiss: (id) => {
    const timeout = dismissTimers.get(id)
    if (timeout !== undefined) {
      window.clearTimeout(timeout)
      dismissTimers.delete(id)
    }
    set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
  },
}))
