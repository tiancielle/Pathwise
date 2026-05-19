import api from './api'

export interface TracePayload {
  etudiant_id: number
  module_nom: string
  titre: string
  url: string
  type_ressource: 'video' | 'article' | 'exercice' | 'documentation' | 'web'
  source: 'externe'
}

// Fire-and-forget — n'attend pas la réponse
export function traceResource(payload: TracePayload): void {
  api.post('/trace', payload).catch(() => {
    // Silencieux — ne bloque jamais l'UX
  })
}

// Helper : ouvre le lien ET trace en même temps
export function openAndTrace(
  url: string,
  payload: Omit<TracePayload, 'url'>
): void {
  traceResource({ ...payload, url })
  window.open(url, '_blank', 'noopener,noreferrer')
}