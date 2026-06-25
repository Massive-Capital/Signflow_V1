export const DEVELOPER_SECTIONS = [
  {
    title: 'API Documentation',
    description: 'REST API reference for documents, signing, and webhooks',
    link: '#api-docs',
    icon: '📚',
  },
  {
    title: 'SDK Documentation',
    description: 'Embed signing into your application with @signflow/sdk',
    link: '#sdk-docs',
    icon: '🧩',
  },
  {
    title: 'Webhooks',
    description: 'Receive real-time events for document lifecycle',
    link: '/webhooks',
    icon: '🔗',
  },
  {
    title: 'Code Samples',
    description: 'Ready-to-use examples in JavaScript, Python, and cURL',
    link: '#samples',
    icon: '💻',
  },
]

export const SDK_EVENTS = [
  { name: 'onLoaded', description: 'Signing UI ready' },
  { name: 'onSigned', description: 'Individual field signed' },
  { name: 'onCompleted', description: 'All fields complete' },
  { name: 'onDeclined', description: 'Signer declined' },
  { name: 'onClosed', description: 'Modal closed' },
  { name: 'onError', description: 'Error occurred' },
]
