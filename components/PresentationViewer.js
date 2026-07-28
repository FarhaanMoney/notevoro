'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Download, FileText, Maximize2 } from 'lucide-react'
import { toast } from 'sonner'

const THEME_GRAD = { violet:'from-violet-500 to-pink-500', blue:'from-blue-500 to-cyan-500', green:'from-emerald-500 to-teal-500', orange:'from-orange-500 to-amber-500' }
const THEME_ACCENT = { violet:'text-violet-300', blue:'text-blue-300', green:'text-emerald-300', orange:'text-orange-300' }

export function PresentationViewer({ deck }) {
  const slides = deck.slides || []
  const [i, setI] = useState(0)
  const [exporting, setExporting] = useState(false)
  const s = slides[i] || {}
  const grad = THEME_GRAD[deck.theme] || THEME_GRAD.violet
  const accent = THEME_ACCENT[deck.theme] || THEME_ACCENT.violet

  function next() { setI((i + 1) % slides.length) }
  function prev() { setI((i - 1 + slides.length) % slides.length) }

  async function exportPPTX() {
    setExporting(true)
    try {
      const pptxgen = (await import('pptxgenjs')).default
      const pres = new pptxgen()
      pres.title = deck.topic
      slides.forEach((sl) => {
        const slide = pres.addSlide()
        slide.background = { color: '1a0e2e' }
        if (sl.type === 'title' || sl.type === 'end') {
          slide.addText(sl.title || deck.topic, { x: 0.5, y: 2.2, w: 9, h: 1.2, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center' })
          if (sl.subtitle) slide.addText(sl.subtitle, { x: 0.5, y: 3.6, w: 9, h: 0.8, fontSize: 20, color: 'C4B5FD', align: 'center' })
        } else if (sl.type === 'quote') {
          slide.addText(`“${sl.quote}”`, { x: 1, y: 2, w: 8, h: 2, fontSize: 28, italic: true, color: 'FFFFFF', align: 'center' })
          slide.addText(`— ${sl.attribution || ''}`, { x: 1, y: 4.2, w: 8, h: 0.5, fontSize: 16, color: 'C4B5FD', align: 'center' })
        } else if (sl.type === 'stat') {
          slide.addText(sl.stat || '', { x: 0.5, y: 1.8, w: 9, h: 1.5, fontSize: 72, bold: true, color: 'F9A8D4', align: 'center' })
          slide.addText(sl.caption || '', { x: 0.5, y: 3.6, w: 9, h: 1, fontSize: 22, color: 'FFFFFF', align: 'center' })
        } else {
          slide.addText(sl.title || '', { x: 0.5, y: 0.4, w: 9, h: 0.9, fontSize: 32, bold: true, color: 'FFFFFF' })
          const bullets = (sl.bullets || []).map((b) => ({ text: b, options: { bullet: true } }))
          slide.addText(bullets, { x: 0.7, y: 1.6, w: 8.5, h: 4.5, fontSize: 20, color: 'E9D5FF', paraSpaceAfter: 8 })
        }
        if (sl.speaker_notes) slide.addNotes(sl.speaker_notes)
      })
      await pres.writeFile({ fileName: `${(deck.topic || 'presentation').replace(/[^a-z0-9]+/gi, '_')}.pptx` })
      toast.success('PPTX downloaded')
    } catch (err) {
      toast.error('Export failed')
    } finally { setExporting(false) }
  }

  function printPDF() { window.print() }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-xs uppercase tracking-wide font-semibold ${accent}`}>Presentation</div>
          <h1 className="text-2xl font-bold">{deck.topic}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printPDF}><FileText className="w-4 h-4 mr-2" />Print / PDF</Button>
          <Button onClick={exportPPTX} disabled={exporting} className="bg-gradient-to-r from-violet-500 to-pink-500">
            <Download className="w-4 h-4 mr-2" />{exporting ? 'Exporting...' : 'PPTX'}
          </Button>
        </div>
      </div>

      {/* Slide canvas 16:9 */}
      <Card className="relative overflow-hidden aspect-video bg-gradient-to-br from-slate-900 to-slate-950 border border-border">
        <div className={`absolute inset-0 opacity-30 bg-gradient-to-br ${grad}`} />
        <div className="absolute inset-0 flex flex-col p-16 z-10">
          {s.type === 'title' || s.type === 'end' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <h1 className="text-6xl font-bold text-white mb-4">{s.title || deck.topic}</h1>
              {s.subtitle && <p className={`text-2xl ${accent}`}>{s.subtitle}</p>}
            </div>
          ) : s.type === 'quote' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-5xl text-white/30 mb-4">&ldquo;</div>
              <p className="text-3xl font-light text-white italic max-w-3xl leading-tight">{s.quote}</p>
              <p className={`text-lg mt-6 ${accent}`}>— {s.attribution}</p>
            </div>
          ) : s.type === 'stat' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className={`text-8xl font-bold bg-gradient-to-r ${grad} bg-clip-text text-transparent`}>{s.stat}</div>
              <p className="text-2xl text-white mt-4 max-w-2xl">{s.caption}</p>
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-bold text-white mb-6">{s.title}</h2>
              <ul className="space-y-3">
                {(s.bullets || []).map((b, bi) => (
                  <li key={bi} className={`text-xl text-white/90 flex gap-3`}>
                    <span className={accent}>•</span>{b}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="absolute bottom-4 right-6 text-xs text-white/50">{i + 1} / {slides.length}</div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <Button variant="outline" onClick={prev} disabled={slides.length <= 1}><ChevronLeft className="w-4 h-4 mr-1" />Prev</Button>
        <div className="text-sm text-muted-foreground">Slide {i + 1} of {slides.length}</div>
        <Button variant="outline" onClick={next} disabled={slides.length <= 1}>Next<ChevronRight className="w-4 h-4 ml-1" /></Button>
      </div>

      {/* Speaker notes */}
      {s.speaker_notes && (
        <Card className="p-4 mt-4 bg-card/40">
          <div className="text-xs text-primary uppercase tracking-wide font-semibold mb-1">Speaker Notes</div>
          <p className="text-sm text-muted-foreground">{s.speaker_notes}</p>
        </Card>
      )}

      {/* Thumbnails */}
      <div className="mt-6 grid grid-cols-6 gap-2">
        {slides.map((sl, si) => (
          <button key={si} onClick={() => setI(si)}
            className={`aspect-video rounded border ${i === si ? 'border-primary ring-1 ring-primary' : 'border-border'} bg-gradient-to-br ${grad} opacity-60 hover:opacity-100 transition flex items-center justify-center text-white text-xs p-1 overflow-hidden text-center`}>
            {si + 1}. {sl.title?.slice(0, 20) || sl.type}
          </button>
        ))}
      </div>
    </div>
  )
}
