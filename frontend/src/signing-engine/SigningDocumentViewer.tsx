import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { loadPdfDocumentCached, clearPdfDocumentCache, resolveSigningDocumentFileUrl } from '../utils/pdf'
import type { DocumentField } from '../types'
import { SigningFieldOverlay } from './SigningFieldOverlay'

interface SigningDocumentViewerProps {
  documentId: string
  fileUrl?: string
  signingToken?: string
  title: string
  pages: number
  fields: DocumentField[]
  fieldValues: Record<string, string>
  fieldSignedAt?: Record<string, string>
  activeFieldId?: string
  readOnlyFieldIds?: Set<string>
  getRecipientColor: (recipientId: string) => string
  onFieldActivate: (fieldId: string) => void
  onFieldValueChange: (fieldId: string, value: string) => void
  onSignatureRequest: (fieldId: string) => void
  /** Bust PDF cache when signed content on the server changes. */
  pdfRevision?: string
  /** Stack every PDF page vertically for continuous scroll (investor embed). */
  showAllPages?: boolean
}

function getFieldPage(fields: DocumentField[], fieldId?: string): number {
  if (!fieldId) return 1
  return fields.find((field) => field.id === fieldId)?.page ?? 1
}

interface SigningPdfPageProps {
  pageNumber: number
  totalPages: number
  layoutWidth: number
  resolvedFileUrl: string
  title: string
  allFields: DocumentField[]
  pageFields: DocumentField[]
  fieldValues: Record<string, string>
  fieldSignedAt?: Record<string, string>
  activeFieldId?: string
  readOnlyFieldIds?: Set<string>
  getRecipientColor: (recipientId: string) => string
  onFieldActivate: (fieldId: string) => void
  onFieldValueChange: (fieldId: string, value: string) => void
  onSignatureRequest: (fieldId: string) => void
  showPageLabel: boolean
  pdfRevision?: string
  pageRef?: (element: HTMLDivElement | null) => void
}

function SigningPdfPage({
  pageNumber,
  totalPages,
  layoutWidth,
  resolvedFileUrl,
  title,
  allFields,
  pageFields,
  fieldValues,
  fieldSignedAt,
  activeFieldId,
  readOnlyFieldIds,
  getRecipientColor,
  onFieldActivate,
  onFieldValueChange,
  onSignatureRequest,
  showPageLabel,
  pdfRevision,
  pageRef,
}: SigningPdfPageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const renderGenerationRef = useRef(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const setContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element
      pageRef?.(element)
    },
    [pageRef],
  )

  useEffect(() => {
    const generation = ++renderGenerationRef.current
    renderTaskRef.current?.cancel()
    renderTaskRef.current = null

    const container = containerRef.current
    const canvas = canvasRef.current
    const width = layoutWidth || container?.clientWidth || 0
    if (!canvas || !resolvedFileUrl || width <= 0) return

    let cancelled = false

    void (async () => {
      setIsLoading(true)
      setLoadError(null)

      let renderTask: { cancel: () => void; promise: Promise<void> } | null = null

      try {
        const pdf = await loadPdfDocumentCached(resolvedFileUrl)
        if (cancelled || generation !== renderGenerationRef.current) return

        const pdfPage = await pdf.getPage(pageNumber)
        if (cancelled || generation !== renderGenerationRef.current) return

        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Canvas is not available')
        }

        const baseViewport = pdfPage.getViewport({ scale: 1 })
        const scale = width / baseViewport.width
        const viewport = pdfPage.getViewport({ scale })

        canvas.width = viewport.width
        canvas.height = viewport.height

        if (cancelled || generation !== renderGenerationRef.current) return

        renderTask = pdfPage.render({ canvas, viewport })
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (error) {
        if (cancelled || generation !== renderGenerationRef.current) return
        if (error instanceof Error && error.name === 'RenderingCancelledException') return

        const message = error instanceof Error ? error.message : 'Unable to load the document'
        setLoadError(message)
      } finally {
        if (renderTask && renderTaskRef.current === renderTask) {
          renderTaskRef.current = null
        }
        if (!cancelled && generation === renderGenerationRef.current) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
      renderGenerationRef.current += 1
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
    }
  }, [resolvedFileUrl, pageNumber, layoutWidth, pdfRevision])

  const showFileError = loadError

  return (
    <div
      ref={setContainerRef}
      className="signing-pdf-page"
      data-page={pageNumber}
    >
      {showPageLabel && totalPages > 1 ? (
        <div className="signing-pdf-page-label">
          Page {pageNumber} of {totalPages}
        </div>
      ) : null}

      <div className="signing-pdf-content">
        {isLoading && <div className="pdf-loading">Loading page {pageNumber}…</div>}

        <canvas
          ref={canvasRef}
          className="pdf-canvas"
          style={loadError ? { visibility: 'hidden' } : undefined}
        />

        {showFileError ? (
          <div className="pdf-placeholder">
            <h3>{title}</h3>
            <p>{loadError}</p>
          </div>
        ) : null}

        {!showFileError &&
          pageFields.map((field) => (
            <SigningFieldOverlay
              key={field.id}
              field={field}
              allFields={allFields}
              value={fieldValues[field.id]}
              signedAt={fieldSignedAt?.[field.id]}
              isActive={field.id === activeFieldId}
              borderColor={getRecipientColor(field.recipientId)}
              readOnly={readOnlyFieldIds?.has(field.id)}
              onActivate={() => onFieldActivate(field.id)}
              onValueChange={(value) => onFieldValueChange(field.id, value)}
              onSignatureRequest={() => onSignatureRequest(field.id)}
            />
          ))}
      </div>
    </div>
  )
}

export function SigningDocumentViewer({
  documentId,
  fileUrl,
  signingToken,
  title,
  pages,
  fields,
  fieldValues,
  fieldSignedAt,
  activeFieldId,
  readOnlyFieldIds,
  getRecipientColor,
  onFieldActivate,
  onFieldValueChange,
  onSignatureRequest,
  showAllPages = false,
  pdfRevision,
}: SigningDocumentViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const pageContainerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [currentPage, setCurrentPage] = useState(() => getFieldPage(fields, activeFieldId))
  const [layoutWidth, setLayoutWidth] = useState(0)

  const resolvedFileUrl = resolveSigningDocumentFileUrl(signingToken, documentId, fileUrl)
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null)
  const totalPages = Math.max(1, pages, pdfPageCount ?? 0)
  const pageFields = fields.filter((field) => field.page === currentPage)

  useEffect(() => {
    if (!resolvedFileUrl) {
      setPdfPageCount(null)
      return
    }

    clearPdfDocumentCache(resolvedFileUrl)

    let cancelled = false
    void loadPdfDocumentCached(resolvedFileUrl)
      .then((pdf) => {
        if (!cancelled) setPdfPageCount(Math.max(1, pdf.numPages))
      })
      .catch(() => {
        if (!cancelled) setPdfPageCount(Math.max(1, pages))
      })

    return () => {
      cancelled = true
    }
  }, [resolvedFileUrl, pages, pdfRevision])

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages))
  }, [totalPages])

  useLayoutEffect(() => {
    if (showAllPages) return
    if (!activeFieldId) return

    const activeField = fields.find((field) => field.id === activeFieldId)
    if (activeField && activeField.page !== currentPage) {
      setCurrentPage(activeField.page)
    }
  }, [activeFieldId, fields, currentPage, showAllPages])

  useLayoutEffect(() => {
    if (!showAllPages || !activeFieldId) return

    const activeField = fields.find((field) => field.id === activeFieldId)
    if (!activeField) return

    setCurrentPage(activeField.page)
    const pageElement = pageRefs.current.get(activeField.page)
    pageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeFieldId, fields, showAllPages])

  useEffect(() => {
    const target = showAllPages ? viewerRef.current : pageContainerRef.current
    if (!target) return

    const updateWidth = () => {
      setLayoutWidth(target.clientWidth)
    }

    updateWidth()

    const observer = new ResizeObserver(() => {
      updateWidth()
    })
    observer.observe(target)

    return () => observer.disconnect()
  }, [showAllPages, resolvedFileUrl])

  const pageObserverRef = useRef<IntersectionObserver | null>(null)

  const registerPageRef = useCallback(
    (pageNumber: number) => (element: HTMLDivElement | null) => {
      const observer = pageObserverRef.current
      const previous = pageRefs.current.get(pageNumber)
      if (previous && observer) {
        observer.unobserve(previous)
      }

      if (element) {
        pageRefs.current.set(pageNumber, element)
        observer?.observe(element)
      } else {
        pageRefs.current.delete(pageNumber)
      }
    },
    [],
  )

  const scrollToPage = useCallback((pageNumber: number, behavior: ScrollBehavior = 'smooth') => {
    const clamped = Math.max(1, Math.min(pageNumber, totalPages))
    setCurrentPage(clamped)
    const pageElement = pageRefs.current.get(clamped)
    pageElement?.scrollIntoView({ behavior, block: 'start' })
  }, [totalPages])

  useLayoutEffect(() => {
    if (!showAllPages || pdfPageCount === null || pdfPageCount <= 1) {
      pageObserverRef.current?.disconnect()
      pageObserverRef.current = null
      return
    }

    const scrollRoot =
      viewerRef.current?.closest('.signing-embed-body') ??
      viewerRef.current?.parentElement ??
      null

    pageObserverRef.current?.disconnect()
    pageObserverRef.current = new IntersectionObserver(
      (entries) => {
        let bestPage = 1
        let bestRatio = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const page = Number((entry.target as HTMLElement).dataset.page)
          if (!Number.isFinite(page) || page < 1) continue
          if (entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio
            bestPage = page
          }
        }
        if (bestRatio > 0) {
          setCurrentPage(bestPage)
        }
      },
      {
        root: scrollRoot,
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      },
    )

    for (const pageElement of pageRefs.current.values()) {
      pageObserverRef.current.observe(pageElement)
    }

    return () => {
      pageObserverRef.current?.disconnect()
      pageObserverRef.current = null
    }
  }, [showAllPages, pdfPageCount, resolvedFileUrl])

  const sharedPageProps = {
    totalPages,
    layoutWidth,
    resolvedFileUrl: resolvedFileUrl ?? '',
    title,
    allFields: fields,
    fieldValues,
    fieldSignedAt,
    activeFieldId,
    readOnlyFieldIds,
    getRecipientColor,
    onFieldActivate,
    onFieldValueChange,
    onSignatureRequest,
    pdfRevision,
  }

  if (!resolvedFileUrl) {
    return (
      <div className="signing-document-viewer">
        <div className="signing-pdf-page">
          <div className="pdf-placeholder">
            <h3>{title}</h3>
            <p>No document file uploaded</p>
          </div>
        </div>
      </div>
    )
  }

  if (showAllPages) {
    if (pdfPageCount === null) {
      return (
        <div
          ref={viewerRef}
          className="signing-document-viewer signing-document-viewer--all-pages"
        >
          <div className="signing-all-pages-loading" role="status">
            Loading document pages…
          </div>
        </div>
      )
    }

    const allPageNumbers = Array.from({ length: pdfPageCount }, (_, index) => index + 1)

    return (
      <div
        ref={viewerRef}
        className="signing-document-viewer signing-document-viewer--all-pages"
      >
        {pdfPageCount > 1 ? (
          <div className="signing-page-nav-sticky" role="navigation" aria-label="Document pages">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              icon={ChevronLeft}
              disabled={currentPage <= 1}
              onClick={() => scrollToPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="signing-page-nav-label">
              Page {currentPage} of {pdfPageCount}
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              iconRight={ChevronRight}
              disabled={currentPage >= pdfPageCount}
              onClick={() => scrollToPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}

        {allPageNumbers.map((pageNumber) => (
          <SigningPdfPage
            key={pageNumber}
            pageNumber={pageNumber}
            pageFields={fields.filter((field) => field.page === pageNumber)}
            showPageLabel={false}
            pageRef={registerPageRef(pageNumber)}
            {...sharedPageProps}
            totalPages={pdfPageCount}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="signing-document-viewer">
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

      <div ref={pageContainerRef}>
        <SigningPdfPage
          pageNumber={currentPage}
          pageFields={pageFields}
          showPageLabel={false}
          {...sharedPageProps}
        />
      </div>
    </div>
  )
}
