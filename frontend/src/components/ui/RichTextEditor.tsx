import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import { configureEmailQuill, EMAIL_EDITOR_TOOLBAR } from '../../utils/quillSetup'

interface RichTextEditorProps {
  label?: string
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = 'Write your message...',
  className = '',
}: RichTextEditorProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const onChangeRef = useRef(onChange)
  const isSettingContentRef = useRef(false)

  onChangeRef.current = onChange

  useEffect(() => {
    configureEmailQuill()

    const shell = shellRef.current
    if (!shell) return

    shell.innerHTML = ''
    const editorEl = document.createElement('div')
    shell.appendChild(editorEl)

    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: EMAIL_EDITOR_TOOLBAR,
      },
    })

    const handleTextChange = () => {
      if (isSettingContentRef.current) return
      onChangeRef.current(quill.root.innerHTML)
    }

    quill.on('text-change', handleTextChange)

    quillRef.current = quill

    return () => {
      quill.off('text-change', handleTextChange)
      quillRef.current = null
      shell.innerHTML = ''
    }
  }, [placeholder])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill) return

    const currentHtml = quill.root.innerHTML
    if (value === currentHtml) return

    isSettingContentRef.current = true
    if (!value || value === '<p><br></p>') {
      quill.setText('')
    } else {
      quill.clipboard.dangerouslyPasteHTML(value)
    }
    isSettingContentRef.current = false
  }, [value])

  return (
    <div className={`rich-text-editor ${className}`.trim()}>
      {label && <label className="rich-text-editor-label">{label}</label>}
      <div ref={shellRef} className="rich-text-editor-shell" />
    </div>
  )
}
