// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number
  nom: string
  email: string
  niveau: 'debutant' | 'intermediaire' | 'avance'
  objectifs: string
}

// ─── Profil ───────────────────────────────────────────────────────────────────
export interface ProfileInput {
  nom: string
  email: string
  password: string
  objectifs: string
  experience: 'none' | 'basic' | 'intermediate' | 'advanced'
  topics: string[]
  timePerWeek: number
  preferredFormat: string
}

// ─── Learning ─────────────────────────────────────────────────────────────────
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

// ─── Quiz ─────────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface AnswerInput {
  questionId: string
  selectedOption: number
  timeSpent: number
}

export interface QuizResult {
  score: number
  total: number
  percentage: number
  recommendations: string[]
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  sources?: string[]
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardData {
  etudiant: AuthUser
  progression: {
    modules_total: number
    modules_completes: number
    pourcentage: number
  }
  quiz: {
    score_moyen: number
    nb_quiz: number
    dernier_score: number
  }
  sessions_recentes: Array<{
    id: number
    module_titre: string
    date: string
    duree: number
  }>
}

// ─── Niveau ───────────────────────────────────────────────────────────────────
export type Niveau = 'debutant' | 'intermediaire' | 'avance'

export interface NiveauInfo {
  niveau: Niveau
  label: string
  color: string
  score: number
  description: string
}

export const NIVEAUX: Record<Niveau, NiveauInfo> = {
  debutant: {
    niveau: 'debutant',
    label: 'Débutant',
    color: 'sky',
    score: 25,
    description: 'Vous débutez — on commence par les fondamentaux.',
  },
  intermediaire: {
    niveau: 'intermediaire',
    label: 'Intermédiaire',
    color: 'indigo',
    score: 60,
    description: 'Bonnes bases — cap sur la pratique !',
  },
  avance: {
    niveau: 'avance',
    label: 'Avancé',
    color: 'teal',
    score: 90,
    description: 'Expert — place aux sujets avancés.',
  },
}