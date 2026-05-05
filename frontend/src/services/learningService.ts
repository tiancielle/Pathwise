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

export async function getLearningPath(): Promise<Module[]> {
  const { data } = await api.get('/learning-path')
  const modules: Module[] = data.modules || data
  return modules.sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
}

export async function generateLearningPath(payload: {
  etudiant_id: number
  niveau: string
  objectifs: string
  subject: string
}): Promise<Module[]> {
  const { data } = await api.post('/learning-path', payload)
  return data.modules || data
}

export async function deleteLearningPath(): Promise<void> {
  await api.delete('/learning-path')
}

export async function getDashboard(id: number) {
  const { data } = await api.get(`/dashboard/${id}`)
  return data
}