import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '../components/ui/Button'

export interface SignaturePadHandle {
  isEmpty: () => boolean
  toDataUrl: () => string | null
  clear: () => void
}

interface SignaturePadProps {
  onStrokeChange?: (hasStroke: boolean) => void
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { onStrokeChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const [hasStroke, setHasStroke] = useState(false)

  const setupCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dpr = window.devicePixelRatio || 1
    const nextWidth = Math.max(1, Math.floor(rect.width * dpr))
    const nextHeight = Math.max(1, Math.floor(rect.height * dpr))

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth
      canvas.height = nextHeight
    }

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = '#1e293b'
    context.lineWidth = 2.5 * dpr
  }

  useEffect(() => {
    const syncCanvas = () => {
      setupCanvas()
    }

    syncCanvas()
    const frame = window.requestAnimationFrame(syncCanvas)

    const container = containerRef.current
    if (!container) {
      return () => window.cancelAnimationFrame(frame)
    }

    const observer = new ResizeObserver(syncCanvas)
    observer.observe(container)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const markStroke = () => {
    if (hasStrokeRef.current) return
    hasStrokeRef.current = true
    setHasStroke(true)
    onStrokeChange?.(true)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    const point = getPoint(event)
    isDrawingRef.current = true
    context.beginPath()
    context.moveTo(point.x, point.y)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    event.preventDefault()
    const point = getPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
    markStroke()
  }

  const stopDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return

    isDrawingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokeRef.current = false
    setHasStroke(false)
    onStrokeChange?.(false)
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasStrokeRef.current,
    toDataUrl: () => {
      if (!hasStrokeRef.current || !canvasRef.current) return null
      return canvasRef.current.toDataURL('image/png')
    },
    clear,
  }))

  return (
    <div ref={containerRef} className="signature-pad">
      <canvas
        ref={canvasRef}
        className="signature-pad-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      {!hasStroke && <span className="signature-pad-hint">Sign here</span>}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        icon={Eraser}
        className="signature-pad-clear"
        onClick={clear}
        disabled={!hasStroke}
      >
        Clear
      </Button>
    </div>
  )
})
