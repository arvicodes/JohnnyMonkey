import React, { useRef, useEffect, useState } from 'react'
import { Map, BarChart3, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

interface BottomNavigationProps {
  currentTab: string
  onTabChange: (tab: string) => void
}

export default function BottomNavigation({ currentTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    { id: 'map', label: 'Karte', icon: Map },
    { id: 'progress', label: 'Fortschritt', icon: BarChart3 },
    { id: 'collection', label: 'Sammlung', icon: Settings },
    { id: 'profile', label: 'Profil', icon: Settings },
  ]

  const [focusedIndex, setFocusedIndex] = useState(0)
  const navRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % tabs.length)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + tabs.length) % tabs.length)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onTabChange(tabs[focusedIndex].id)
    }
  }

  useEffect(() => {
    const currentIndex = tabs.findIndex(tab => tab.id === currentTab)
    if (currentIndex !== -1) {
      setFocusedIndex(currentIndex)
    }
  }, [currentTab])

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200"
      ref={navRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="flex">
        {tabs.map((tab, index) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          const isFocused = focusedIndex === index
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center py-2 px-1',
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700',
                isFocused && !isActive && 'ring-2 ring-blue-500 bg-blue-25'
              )}
              tabIndex={isFocused ? 0 : -1}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
