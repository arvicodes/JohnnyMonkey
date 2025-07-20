import { useState, useEffect } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  return { toasts, toast, dismiss }
} 