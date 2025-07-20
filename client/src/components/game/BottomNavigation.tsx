import React from 'react'
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
    { id: 'settings', label: 'Einstellungen', icon: Settings },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = currentTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center py-2 px-1',
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700'
              )}
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
