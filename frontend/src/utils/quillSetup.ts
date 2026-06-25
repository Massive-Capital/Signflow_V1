import Quill from 'quill'

let configured = false

export const EMAIL_EDITOR_TOOLBAR = [
  [{ font: ['sans-serif', 'serif', 'monospace'] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ header: [false, 1, 2, 3] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['link', 'image', 'video'],
  ['blockquote', 'code-block'],
  ['clean'],
] as const

export function configureEmailQuill(): void {
  if (configured) return

  const FontClass = Quill.import('formats/font') as { whitelist: string[] }
  FontClass.whitelist = ['sans-serif', 'serif', 'monospace']

  configured = true
}
