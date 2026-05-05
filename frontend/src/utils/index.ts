// Formate une durée en minutes
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

// Formate une date en français
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Tronque un texte
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

// Génère un ID unique
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Capitalise la première lettre
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Niveau → couleur Tailwind
export function niveauColor(niveau: string): string {
  switch (niveau) {
    case 'avance': return 'text-teal-600 bg-teal-50'
    case 'intermediaire': return 'text-indigo-600 bg-indigo-50'
    default: return 'text-sky-600 bg-sky-50'
  }
}

// Pourcentage → couleur
export function scoreColor(percentage: number): string {
  if (percentage >= 75) return 'text-emerald-600'
  if (percentage >= 45) return 'text-indigo-600'
  return 'text-amber-600'
}