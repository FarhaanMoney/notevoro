'use client'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RotateCw, Shuffle } from 'lucide-react'

export function FlashcardStudy({ cards: initial }) {
  const [cards, setCards] = useState(initial)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!cards.length) return <Card className="p-8 text-center text-muted-foreground">No cards</Card>
  const c = cards[i]
  function next() { setFlipped(false); setI((i + 1) % cards.length) }
  function prev() { setFlipped(false); setI((i - 1 + cards.length) % cards.length) }
  function shuffle() { const s = [...cards].sort(() => Math.random() - 0.5); setCards(s); setI(0); setFlipped(false) }

  return (
    <div className="space-y-4">
      <div className="text-center text-sm text-muted-foreground">Card {i + 1} of {cards.length}</div>
      <Card onClick={() => setFlipped((f) => !f)}
        className="p-12 min-h-[320px] flex items-center justify-center text-center cursor-pointer hover:border-primary/40 transition bg-gradient-to-br from-violet-500/5 to-pink-500/5">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">{flipped ? 'Answer' : 'Question'}</div>
          <div className="text-xl font-medium leading-relaxed">{flipped ? c.back : c.front}</div>
          <div className="text-xs text-muted-foreground mt-6">Click to {flipped ? 'see question' : 'reveal answer'}</div>
        </div>
      </Card>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={prev}><ChevronLeft className="w-4 h-4 mr-1" />Prev</Button>
        <Button variant="outline" onClick={() => setFlipped((f) => !f)}><RotateCw className="w-4 h-4 mr-1" />Flip</Button>
        <Button variant="outline" onClick={shuffle}><Shuffle className="w-4 h-4 mr-1" />Shuffle</Button>
        <Button onClick={next} className="bg-gradient-to-r from-violet-500 to-pink-500">Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>
    </div>
  )
}
