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

export interface Parcours {
  id: number
  titre: string
  contenu: { modules: Module[] }
  date_creation: string
  subject: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getModuleUrl(module: Module): string {
  if (module.url && module.url !== '#') return module.url
  const titre = encodeURIComponent(module.titre)
  switch (module.type) {
    case 'video':
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(module.titre + ' tutoriel français')}`
    case 'article':
      return `https://www.google.com/search?q=${titre}`
    case 'exercice':
      return `https://www.google.com/search?q=${encodeURIComponent(module.titre + ' exercice pratique')}`
    case 'projet':
      return `https://github.com/search?q=${titre}&type=repositories`
    default:
      return `https://www.google.com/search?q=${titre}`
  }
}

export function getModulesFromParcours(parcours: Parcours): Module[] {
  const modules = parcours.contenu?.modules || []
  return modules
    .sort((a: Module, b: Module) => (a.ordre || 0) - (b.ordre || 0))
    .map((m: Module, i: number) => ({
      id: String(m.id || i),
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

function _extractSubject(titre: string): string {
  const raw = titre.replace('Parcours ', '').split(' —')[0].trim()
  return raw
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ── API calls ─────────────────────────────────────────────────────────────────

// GET /api/learning-path/{etudiantId} — retourne tous les parcours
export async function getAllParcours(etudiantId: number): Promise<Parcours[]> {
  const { data } = await api.get(`/learning-path/${etudiantId}`)
  const paths = Array.isArray(data) ? data : [data]
  return paths.map(p => ({
    id: p.id,
    titre: p.titre,
    date_creation: p.date_creation,
    subject: _extractSubject(p.titre),
    contenu: typeof p.contenu === 'string' ? JSON.parse(p.contenu) : p.contenu,
  }))
}

// POST /api/learning-path/generate — génération serveur via n8n/LLM
export async function generateLearningPath(payload: {
  etudiant_id: number
  subject: string
  level: string
}): Promise<{ parcours: Parcours; modules: Module[] }> {
  const { data } = await api.post('/learning-path/generate', {
    etudiant_id: payload.etudiant_id,
    subject: payload.subject,
    level: payload.level,
  })
  const parcours: Parcours = {
    id: data.id,
    titre: data.titre,
    date_creation: new Date().toISOString(),
    subject: _extractSubject(data.titre),
    contenu: typeof data.contenu === 'string' ? JSON.parse(data.contenu) : data.contenu,
  }
  const modules = getModulesFromParcours(parcours)
  return { parcours, modules }
}

// PATCH /api/learning-path/module/{path_id}/complete — marque un module comme terminé
export async function completeModule(
  pathId: number,
  moduleId: string,
  etudiantId: number,
  completed: boolean
): Promise<void> {
  try {
    await api.patch(
      `/learning-path/module/${pathId}/complete?module_id=${moduleId}`,
      { etudiant_id: etudiantId, completed }
    )
  } catch {
    console.warn('completeModule — sync backend échoué, update local uniquement')
  }
}

// GET /api/dashboard/{id}
export async function getDashboard(id: number) {
  const { data } = await api.get(`/dashboard/${id}`)
  return data
}