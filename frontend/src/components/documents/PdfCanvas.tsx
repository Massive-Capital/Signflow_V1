import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import type { DocumentField } from '../../types'
import { colorWithAlpha } from '../../constants/fieldTypes'
import { Button } from '../ui/Button'
import { getDocumentFileUrl, loadPdfDocumentCached, clearPdfDocumentCache, validatePdfFile } from '../../utils/pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'

const MIN_FIELD_WIDTH = 3
const MIN_FIELD_HEIGHT = 2
const MIN_PDF_RENDER_WIDTH = 280

function resolvePdfDisplayWidth(container: HTMLElement): number {
  const ownWidth = Math.floor(container.clientWidth)
  if (ownWidth >= MIN_PDF_RENDER_WIDTH) return ownWidth

  const viewer = container.closest('.pdf-viewer-area')
  if (viewer instanceof HTMLElement) {
    const viewerWidth = Math.floor(viewer.clientWidth - 32)
    if (viewerWidth >= MIN_PDF_RENDER_WIDTH) return viewerWidth
  }

  return Math.max(ownWidth, MIN_PDF_RENDER_WIDTH)
}

async function renderPdfPageToCanvas(params: {
  pdf: PDFDocumentProxy
  canvas: HTMLCanvasElement
  container: HTMLElement
  pageNumber: number
}): Promise<number> {
  const numPages = Math.max(1, params.pdf.numPages)
  const safePage = Math.min(Math.max(params.pageNumber, 1), numPages)
  const pdfPage = await params.pdf.getPage(safePage)

  const context = params.canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas is not available')
  }

  const outputScale = Math.max(1, window.devicePixelRatio || 1)
  const baseViewport = pdfPage.getViewport({ scale: 1 })
  const displayWidth = resolvePdfDisplayWidth(params.container)
  const displayScale = displayWidth / baseViewport.width
  const renderViewport = pdfPage.getViewport({ scale: displayScale * outputScale })

  params.canvas.width = Math.floor(renderViewport.width)
  params.canvas.height = Math.floor(renderViewport.height)
  params.canvas.style.width = `${Math.floor(baseViewport.width * displayScale)}px`
  params.canvas.style.height = `${Math.floor(baseViewport.height * displayScale)}px`

  await pdfPage.render({ canvas: params.canvas, canvasContext: context, viewport: renderViewport })
    .promise

  return numPages
}

interface PdfCanvasProps {
  documentId: string
  fileUrl?: string
  title: string
  pages: number
  selectedFieldType: string
  fields: DocumentField[]
  getFieldColor: (field: DocumentField) => string
  isFieldVisibleInPreview?: (field: DocumentField) => boolean
  onPlaceField: (event: React.MouseEvent<HTMLDivElement>, page: number) => void
  onMoveField: (fieldId: string, x: number, y: number) => void
  onResizeField: (fieldId: string, width: number, height: number) => void
  onRemoveField: (fieldId: string) => void
  onAddRadioOption?: (fieldId: string) => void
  onReuploadFile?: (file: File) => Promise<unknown>
  isReuploading?: boolean
  canPlaceFields?: boolean
  placementBlockedMessage?: string
  activeProfileColor?: string
  onPdfReady?: () => void
}

interface DragState {
  fieldId: string
  x: number
  y: number
}

interface ResizeState {
  fieldId: string
  width: number
  height: number
}

export function PdfCanvas({
  documentId,
  fileUrl,
  title,
  pages,
  selectedFieldType,
  fields,
  getFieldColor,
  isFieldVisibleInPreview,
  onPlaceField,
  onMoveField,
  onResizeField,
  onRemoveField,
  onAddRadioOption,
  onReuploadFile,
  isReuploading = false,
  canPlaceFields = true,
  placementBlockedMessage,
  activeProfileColor,
  onPdfReady,
}: PdfCanvasProps) {
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onPdfReadyRef = useRef(onPdfReady)
  const hasRenderedPageRef = useRef(false)
  const renderGenerationRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skipNextClickRef = useRef(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)

  onPdfReadyRef.current = onPdfReady

  const resolvedFileUrl = getDocumentFileUrl(documentId, fileUrl)
  const totalPages = Math.max(pages, pdfPageCount ?? 0, 1)
  const pageFields = fields.filter((field) => field.page === currentPage)
  const visiblePageFields = pageFields.filter((field) => isFieldVisibleInPreview?.(field) ?? true)

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useEffect(() => {
    setPdfPageCount(null)
    setCurrentPage(1)
    hasRenderedPageRef.current = false
    if (resolvedFileUrl) {
      clearPdfDocumentCache(resolvedFileUrl)
    }
  }, [documentId, resolvedFileUrl])

  useEffect(() => {
    if (!resolvedFileUrl) {
      setIsLoading(false)
      setLoadError('No document file uploaded')
      return
    }

    const container = pageContainerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    let cancelled = false
    let resizeFrame: number | null = null
    let lastWidth = container.clientWidth
    let hasObservedResize = false

    const renderPage = async (showLoadingOverlay: boolean) => {
      const generation = ++renderGenerationRef.current
      if (showLoadingOverlay) {
        setIsLoading(true)
      }
      setLoadError(null)

      try {
        const pdf = await loadPdfDocumentCached(resolvedFileUrl)
        if (cancelled || generation !== renderGenerationRef.current) return

        const numPages = await renderPdfPageToCanvas({
          pdf,
          canvas,
          container,
          pageNumber: currentPage,
        })
        if (cancelled || generation !== renderGenerationRef.current) return

        setPdfPageCount(numPages)
        if (!hasRenderedPageRef.current) {
          hasRenderedPageRef.current = true
          onPdfReadyRef.current?.()
        }
      } catch (error) {
        if (!cancelled && generation === renderGenerationRef.current) {
          setLoadError(
            error instanceof Error ? error.message : 'Unable to load the uploaded PDF',
          )
        }
      } finally {
        if (!cancelled && generation === renderGenerationRef.current) {
          setIsLoading(false)
        }
      }
    }

    void renderPage(!hasRenderedPageRef.current)

    const observer = new ResizeObserver(() => {
      const nextWidth = container.clientWidth
      if (nextWidth === lastWidth) return
      lastWidth = nextWidth

      if (!hasObservedResize) {
        hasObservedResize = true
        return
      }

      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame)
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null
        void renderPage(false)
      })
    })

    observer.observe(container)
    const viewer = container.closest('.pdf-viewer-area')
    if (viewer instanceof HTMLElement) {
      observer.observe(viewer)
    }

    return () => {
      cancelled = true
      renderGenerationRef.current += 1
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame)
      }
      observer.disconnect()
    }
  }, [resolvedFileUrl, currentPage])

  const handleFieldPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    field: DocumentField,
  ) => {
    if ((event.target as HTMLElement).closest('.pdf-field-remove, .pdf-field-resize')) return

    event.stopPropagation()
    event.preventDefault()

    const container = pageContainerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startFieldX = field.x
    const startFieldY = field.y
    let hasMoved = false
    let latestX = startFieldX
    let latestY = startFieldY

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / containerRect.width) * 100
      const deltaY = ((moveEvent.clientY - startY) / containerRect.height) * 100

      if (Math.abs(deltaX) > 0.2 || Math.abs(deltaY) > 0.2) {
        hasMoved = true
      }

      latestX = Math.max(0, Math.min(startFieldX + deltaX, 100 - field.width))
      latestY = Math.max(0, Math.min(startFieldY + deltaY, 100 - field.height))

      setDragState({ fieldId: field.id, x: latestX, y: latestY })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      setDragState(null)

      if (hasMoved) {
        skipNextClickRef.current = true
        onMoveField(field.id, latestX, latestY)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    field: DocumentField,
  ) => {
    event.stopPropagation()
    event.preventDefault()

    const container = pageContainerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = field.width
    const startHeight = field.height
    let hasResized = false
    let latestWidth = startWidth
    let latestHeight = startHeight

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / containerRect.width) * 100
      const deltaY = ((moveEvent.clientY - startY) / containerRect.height) * 100

      if (Math.abs(deltaX) > 0.2 || Math.abs(deltaY) > 0.2) {
        hasResized = true
      }

      latestWidth = Math.max(MIN_FIELD_WIDTH, Math.min(startWidth + deltaX, 100 - field.x))
      latestHeight = Math.max(MIN_FIELD_HEIGHT, Math.min(startHeight + deltaY, 100 - field.y))

      setResizeState({ fieldId: field.id, width: latestWidth, height: latestHeight })
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)

      setResizeState(null)

      if (hasResized) {
        skipNextClickRef.current = true
        onResizeField(field.id, latestWidth, latestHeight)
      }
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false
      return
    }

    if ((event.target as HTMLElement).closest('.pdf-field')) {
      return
    }

    if (!canPlaceFields) {
      return
    }

    onPlaceField(event, currentPage)
  }

  const showPlaceholder = !resolvedFileUrl || loadError
  const canReupload = Boolean(loadError && onReuploadFile)

  const handleReupload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected || !onReuploadFile) return

    const validationError = validatePdfFile(selected)
    if (validationError) {
      setLoadError(validationError)
      return
    }

    try {
      await onReuploadFile(selected)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to upload PDF')
    }
  }

  return (
    <div className="pdf-viewer-area">
      {totalPages > 1 && (
        <div className="pdf-page-nav">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={ChevronLeft}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            iconRight={ChevronRight}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            Next
          </Button>
        </div>
      )}

      <div
        ref={pageContainerRef}
        className={[
          'pdf-page',
          !canPlaceFields && !showPlaceholder ? 'pdf-page--placement-blocked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleCanvasClick}
        role="presentation"
      >
        <div className="pdf-page-content">
          {isLoading && !hasRenderedPageRef.current ? (
            <div className="pdf-loading">Loading document...</div>
          ) : null}

          {showPlaceholder ? (
            <div className="pdf-placeholder">
              <h2>{title}</h2>
              <p>Page {currentPage} of {totalPages}</p>
              <p className="pdf-hint">
                {loadError ?? `Click anywhere to place a ${selectedFieldType} field`}
              </p>
              {canReupload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    hidden
                    onChange={handleReupload}
                  />
                  <Button
                    type="button"
                    className="pdf-reupload-btn"
                    disabled={isReuploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isReuploading ? 'Uploading...' : 'Upload PDF'}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <canvas ref={canvasRef} className="pdf-canvas" />
          )}

          {!showPlaceholder && (
            <p
              className="pdf-placement-hint"
              style={canPlaceFields && activeProfileColor ? { color: activeProfileColor } : undefined}
            >
              {canPlaceFields
                ? 'Click to place · drag to move · corner handle to resize'
                : placementBlockedMessage ?? 'Select a profile type with a recipient to place fields'}
            </p>
          )}

          {visiblePageFields.map((field) => {
            const isDragging = dragState?.fieldId === field.id
            const isResizing = resizeState?.fieldId === field.id
            const x = isDragging ? dragState.x : field.x
            const y = isDragging ? dragState.y : field.y
            const width = isResizing ? resizeState.width : field.width
            const height = isResizing ? resizeState.height : field.height

            const fieldColor = getFieldColor(field)

            return (
              <div
                key={field.id}
                className={[
                  'pdf-field',
                  isDragging ? 'pdf-field--dragging' : '',
                  isResizing ? 'pdf-field--resizing' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  borderColor: colorWithAlpha(fieldColor, 0.55),
                  color: fieldColor,
                  backgroundColor: colorWithAlpha(fieldColor, 0.14),
                  boxShadow: `0 1px 4px ${colorWithAlpha(fieldColor, 0.2)}`,
                }}
                onPointerDown={(event) => handleFieldPointerDown(event, field)}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="pdf-field-label">
                  {field.type === 'radio' ? `○ ${field.label}` : field.label}
                  {field.required && <span className="pdf-field-required">*</span>}
                </span>
                {field.type === 'radio' && onAddRadioOption && (
                  <button
                    type="button"
                    className="pdf-field-add-option"
                    aria-label="Add radio option"
                    title="Add option"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation()
                      skipNextClickRef.current = true
                      onAddRadioOption(field.id)
                    }}
                  >
                    +
                  </button>
                )}
                <button
                  type="button"
                  className="pdf-field-remove"
                  aria-label={`Remove ${field.label} field`}
                  title="Remove field"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation()
                    skipNextClickRef.current = true
                    onRemoveField(field.id)
                  }}
                >
                  <Trash2 size={10} strokeWidth={2.25} aria-hidden />
                </button>
                <button
                  type="button"
                  className="pdf-field-resize"
                  aria-label={`Resize ${field.label} field`}
                  onPointerDown={(event) => handleResizePointerDown(event, field)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
