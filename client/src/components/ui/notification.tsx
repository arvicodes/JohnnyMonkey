import React from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface NotificationProps {
  type?: 'success' | 'error' | 'info'
  title?: string
  message: string
  onClose?: () => void
  className?: string
}

export function Notification({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  className 
}: NotificationProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: AlertCircle
  }

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  const Icon = icons[type]

  return (
    <div className={cn(
      'flex items-start p-4 border rounded-lg',
      colors[type],
      className
    )}>
      <Icon className="w-5 h-5 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        {title && (
          <h4 className="font-medium mb-1">{title}</h4>
        )}
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 p-1 hover:bg-black/10 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
