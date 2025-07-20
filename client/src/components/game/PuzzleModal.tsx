import React, { useState } from 'react'
import { X, Lightbulb, CheckCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'

interface PuzzleModalProps {
  point: any
  onClose: () => void
  onSubmit: (pointId: number, answer: string, hintsUsed?: number, gaveUp?: boolean) => void
}

export default function PuzzleModal({ point, onClose, onSubmit }: PuzzleModalProps) {
  const [answer, setAnswer] = useState('')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint1, setShowHint1] = useState(false)
  const [showHint2, setShowHint2] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!answer.trim()) return
    
    setIsSubmitting(true)
    try {
      await onSubmit(point.id, answer.trim(), hintsUsed)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHint = (hintNumber: number) => {
    if (hintNumber === 1 && !showHint1) {
      setShowHint1(true)
      setHintsUsed(prev => prev + 1)
    } else if (hintNumber === 2 && !showHint2) {
      setShowHint2(true)
      setHintsUsed(prev => prev + 1)
    }
  }

  const handleGiveUp = () => {
    onSubmit(point.id, '', hintsUsed, true)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">{point.name}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">{point.description}</p>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">{point.puzzleData.question}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="Deine Antwort..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            
            <div className="flex space-x-2">
              <Button
                onClick={handleSubmit}
                disabled={!answer.trim() || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Prüfe...' : 'Antwort senden'}
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Hinweise</span>
              <span className="text-xs text-gray-500">
                {hintsUsed} verwendet
              </span>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHint(1)}
                disabled={showHint1}
                className="w-full justify-start"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Hinweis 1 {showHint1 && <CheckCircle className="w-4 h-4 ml-auto" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHint(2)}
                disabled={showHint2}
                className="w-full justify-start"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Hinweis 2 {showHint2 && <CheckCircle className="w-4 h-4 ml-auto" />}
              </Button>
            </div>

            {showHint1 && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                {point.puzzleData.hint1}
              </div>
            )}
            
            {showHint2 && (
              <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                {point.puzzleData.hint2}
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleGiveUp}
              className="w-full"
            >
              Aufgeben
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
