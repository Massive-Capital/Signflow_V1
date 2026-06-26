import { useToastStore, type ToastType } from '../stores/toastStore'

function show(type: ToastType, message: string, duration?: number): string {
  return useToastStore.getState().add({ type, message, duration })
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export const toast = {
  success: (message: string, duration?: number) => show('success', message, duration),
  error: (message: string, duration?: number) => show('error', message, duration),
  info: (message: string, duration?: number) => show('info', message, duration),
  warning: (message: string, duration?: number) => show('warning', message, duration),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
}
