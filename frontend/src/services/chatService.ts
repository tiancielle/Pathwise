import { getStoredToken } from './authService'

export async function sendMessage(payload: {
  message: string
  etudiant_id: number
}): Promise<{
  reply: string
  sources: string[]
  external_resources: Array<{ title: string; url: string; description: string; type: string }>
}> {
  const token = getStoredToken()

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: payload.message,
      etudiant_id: payload.etudiant_id,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Erreur ${response.status}`)
  }

  const data = await response.json()

  return {
    reply: data.reply || "Pas de réponse.",
    sources: data.sources || [],
    external_resources: data.external_resources || [],
  }
}

export async function uploadDocument(
  file: File,
  etudiantId: number
): Promise<{ message: string; filename: string; size_mb: number; indexed: boolean; nb_chunks: number }> {
  const token = getStoredToken()

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez PDF, DOCX ou TXT.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || "Erreur lors de l'upload")
  }

  return response.json()
}

export async function searchRag(query: string, nResults = 5) {
  const token = getStoredToken()
  const response = await fetch(
    `/api/ressources?query=${encodeURIComponent(query)}&n=${nResults}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const data = await response.json()
  return data.results || data
}