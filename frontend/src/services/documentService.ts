import api from './api'
import { getStoredToken } from './authService'

export interface Document {
  id: number
  filename: string
  date_upload: string
  nb_chunks: number
  size_mb: number
  etudiant_id: number
}

export interface UploadResult {
  message: string
  filename: string
  size_mb: number
  indexed: boolean
  nb_chunks: number
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  const token = getStoredToken()

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format non supporté. Utilisez PDF, DOCX ou TXT.')
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error('Fichier trop volumineux. Maximum 20MB.')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || "Erreur lors de l'upload")
  }
  return response.json()
}

export async function getDocuments(etudiantId: number): Promise<Document[]> {
  try {
    const { data } = await api.get(`/documents/${etudiantId}`)
    return data
  } catch {
    return []
  }
}

export async function deleteDocument(documentId: number): Promise<void> {
  await api.delete(`/documents/${documentId}`)
}