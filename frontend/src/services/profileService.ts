import api from './api'
import { register } from './authService'

export interface ProfileInput {
  nom: string
  email: string
  password: string  // garde password côté frontend (formulaire)
  objectifs: string
  experience: 'none' | 'basic' | 'intermediate' | 'advanced'
  topics: string[]
  timePerWeek: number
  preferredFormat: string
}

const niveauMap = {
  none: 'debutant',
  basic: 'debutant',
  intermediate: 'intermediaire',
  advanced: 'avance',
} as const

export async function submitProfile(input: ProfileInput) {
  const niveau = niveauMap[input.experience]
  const auth = await register({
    nom: input.nom,
    email: input.email,
    mot_de_passe: input.password,  // ← mapping ici
    niveau,
    objectifs: input.objectifs || input.topics.join(', '),
  })
  localStorage.setItem('pw_subject', input.topics[0]?.toLowerCase().replace(/\s+/g, '_') || 'machine_learning')
  localStorage.setItem('pw_level', niveau)
  return { auth, niveau, input }
}

export async function getProfil(id: number) {
  const { data } = await api.get(`/profil/${id}`)
  return data
}

export async function updateProfil(id: number, updates: Partial<ProfileInput>) {
  const { data } = await api.patch(`/profil/${id}`, updates)
  return data
}