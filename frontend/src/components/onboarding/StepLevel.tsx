import { motion } from 'framer-motion'

interface StepLevelProps {
  selected: string
  onSelect: (value: string) => void
}

const levels = [
  {
    id: 'none',
    label: 'Débutant',
    desc: 'Je commence de zéro',
    emoji: '🌱',
    color: 'sky',
  },
  {
    id: 'basic',
    label: 'Notions de base',
    desc: "Quelques notions d'école",
    emoji: '📚',
    color: 'blue',
  },
  {
    id: 'intermediate',
    label: 'Intermédiaire',
    desc: 'Déjà quelques projets',
    emoji: '⚡',
    color: 'indigo',
  },
  {
    id: 'advanced',
    label: 'Avancé',
    desc: 'Je veux devenir expert',
    emoji: '🚀',
    color: 'teal',
  },
]

export function StepLevel({ selected, onSelect }: StepLevelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-3"
    >
      {levels.map((level) => (
        <motion.button
          key={level.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onSelect(level.id)}
          className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${
            selected === level.id
              ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
              : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
            selected === level.id ? 'bg-indigo-500' : 'bg-slate-100'
          }`}>
            {level.emoji}
          </div>
          <div>
            <p className="font-semibold text-slate-800">{level.label}</p>
            <p className="text-sm text-slate-500">{level.desc}</p>
          </div>
          {selected === level.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center"
            >
              <span className="text-white text-xs">✓</span>
            </motion.div>
          )}
        </motion.button>
      ))}
    </motion.div>
  )
}