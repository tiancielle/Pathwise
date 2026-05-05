import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface ProgressBarProps {
  completed: number
  total: number
  percentage: number
  userName?: string
}

export function ProgressBar({ completed, total, percentage, userName }: ProgressBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-200 relative overflow-hidden mb-8"
    >
      {/* Decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/3 -translate-x-1/3" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-medium text-white/80">
            {userName ? `Bon retour, ${userName} !` : 'Votre progression'}
          </span>
        </div>
        <h2 className="text-2xl font-bold mb-1">
          {completed}/{total} modules complétés
        </h2>
        <p className="text-white/80 text-sm mb-4">
          {percentage}% de votre parcours accompli
        </p>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  )
}