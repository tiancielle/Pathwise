import api from './api'

export interface TracePayload {
  etudiant_id: number
  module_nom: string
  titre: string
  url: string
  type_ressource: 'video' | 'article' | 'exercice' | 'documentation' | 'web'
  source: 'externe'
}

export interface TraceResponse {
  id: number
  message: string
}

export function traceResource(payload: TracePayload): Promise<TraceResponse> {
  return api.post('/trace', payload)
    .then(r => r.data)
    .catch(() => ({ id: 0, message: 'trace failed' }))
}

export async function confirmTrace(traceId: number, dureeSecondes: number): Promise<void> {
  await api.patch(`/trace/${traceId}/confirm`, {
    consulte: true,
    duree_secondes: dureeSecondes,
  }).catch(() => {})
}

// Ouvre + trace + retourne l'id pour le confirm
export async function openAndTrace(
  url: string,
  payload: Omit<TracePayload, 'url'>
): Promise<number> {
  const result = await traceResource({ ...payload, url })
  window.open(url, '_blank', 'noopener,noreferrer')
  return result.id
}