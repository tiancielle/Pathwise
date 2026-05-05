import api from './api'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

export async function sendMessage(payload: {
  message: string
  etudiant_id: number
}): Promise<{ reply: string; sources?: string[] }> {
  // Utilise le RAG ChromaDB pour chercher des ressources
  try {
    const { data } = await api.get('/ressources', {
      params: { query: payload.message, n: 5 },
    })
    const results = data.results || []

    // Construit une réponse depuis les résultats RAG
    if (results.length > 0) {
      const content = results
        .slice(0, 3)
        .map((r: { content: string; source?: string }, i: number) => 
          `**Source ${i + 1}** (${r.source || 'PathWise KB'}):\n${r.content?.slice(0, 300)}...`
        )
        .join('\n\n')

      return {
        reply: `Voici ce que j'ai trouvé dans notre base de connaissances :\n\n${content}\n\n💡 Vous pouvez me poser des questions plus spécifiques sur ces concepts !`,
        sources: results.map((r: { source?: string }) => r.source || 'PathWise KB').slice(0, 3),
      }
    }

    return {
      reply: "Je n'ai pas trouvé de ressources spécifiques sur ce sujet dans notre base. Essayez avec des termes comme 'machine learning', 'neural network', 'NLP', ou 'transformers'.",
    }
  } catch {
    return {
      reply: "Désolé, je rencontre des difficultés à accéder à la base de connaissances. Vérifiez que le backend est bien démarré.",
    }
  }
}

export async function searchRag(query: string, nResults = 5) {
  const { data } = await api.get('/ressources', {
    params: { query, n: nResults },
  })
  return data.results || data
}

export async function uploadDocument(file: File, etudiantId: number) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('etudiant_id', String(etudiantId))
  const { data } = await api.post('/ressources/index', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}