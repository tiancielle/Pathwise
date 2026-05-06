import api from './api'

export interface Module {
  id: string
  titre: string
  description: string
  type: 'video' | 'article' | 'exercice' | 'projet'
  url: string
  duree: string
  difficulte: string
  completed: boolean
  ordre: number
}

// GET /api/learning-path/:etudiant_id
export async function getLearningPath(etudiantId: number): Promise<Module[]> {
  const { data } = await api.get(`/learning-path/${etudiantId}`)
  // Backend retourne liste de parcours → on prend le plus récent
  const paths = Array.isArray(data) ? data : [data]
  if (paths.length === 0) throw new Error('Aucun parcours')
  
  // Le contenu du parcours est dans paths[0].contenu
  const contenu = paths[0].contenu
  const modules = contenu.modules || contenu || []
  
  return modules.map((m: Module & { id?: string }, i: number) => ({
    id: m.id || String(i),
    titre: m.titre || '',
    description: m.description || '',
    type: m.type || 'article',
    url: m.url || '#',
    duree: m.duree || '30 min',
    difficulte: m.difficulte || 'Moyen',
    completed: m.completed || false,
    ordre: m.ordre || i,
  }))
}

// POST /api/learning-path — format attendu par le backend
export async function generateLearningPath(payload: {
  etudiant_id: number
  niveau: string
  objectifs: string
  subject: string
}): Promise<Module[]> {
  // Génère les modules mock (sera remplacé par n8n)
  const mockModules = _generateMockModules(payload.subject, payload.niveau)
  
  const { data } = await api.post('/learning-path', {
    etudiant_id: payload.etudiant_id,
    titre: `Parcours ${payload.subject} — niveau ${payload.niveau}`,
    contenu: { modules: mockModules },
    duree_estimee_h: 10,
  })
  
  return mockModules
}

// DELETE /api/learning-path/:path_id
export async function deleteLearningPath(pathId: number): Promise<void> {
  await api.delete(`/learning-path/${pathId}`)
}

export async function getDashboard(id: number) {
  const { data } = await api.get(`/dashboard/${id}`)
  return data
}

// ── Modules mock par sujet ─────────────────────────────────────────────────
function _generateMockModules(subject: string, niveau: string): Module[] {
  const subjectLabel = subject.replace(/_/g, ' ')
  
  const base = [
    {
      id: '1', ordre: 1,
      titre: `Introduction à ${subjectLabel}`,
      description: `Découvrez les fondamentaux de ${subjectLabel} et les concepts de base indispensables.`,
      type: 'video' as const, url: '#', duree: '20 min', difficulte: 'Facile', completed: false,
    },
    {
      id: '2', ordre: 2,
      titre: `Concepts clés de ${subjectLabel}`,
      description: `Approfondissez votre compréhension avec les concepts théoriques essentiels.`,
      type: 'article' as const, url: '#', duree: '15 min', difficulte: 'Facile', completed: false,
    },
    {
      id: '3', ordre: 3,
      titre: `Pratique : Exercices ${subjectLabel}`,
      description: `Mettez en pratique vos connaissances avec des exercices guidés.`,
      type: 'exercice' as const, url: '#', duree: '30 min', difficulte: 'Moyen', completed: false,
    },
    {
      id: '4', ordre: 4,
      titre: `Techniques avancées de ${subjectLabel}`,
      description: `Explorez les méthodes avancées utilisées par les professionnels.`,
      type: 'video' as const, url: '#', duree: '25 min', difficulte: 'Moyen', completed: false,
    },
    {
      id: '5', ordre: 5,
      titre: `Projet : Application ${subjectLabel}`,
      description: `Construisez un projet concret pour consolider tous vos acquis.`,
      type: 'projet' as const, url: '#', duree: '2h', difficulte: 'Difficile', completed: false,
    },
  ]

  // Filtre selon niveau
  if (niveau === 'avance') return base
  if (niveau === 'intermediaire') return base.slice(0, 4)
  return base.slice(0, 3)
}