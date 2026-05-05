import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, RotateCcw, ArrowRight, TrendingUp } from 'lucide-react'
import { Button } from '../common/Button'
import type { QuizResult } from '../../types'

interface ScoreCardProps {
  result: QuizResult & { levelUp?: boolean; newLevel?: string }
  onRetry: () => void
  onContinue: () => void
}

export function ScoreCard({ result, onRetry, onContinue }: ScoreCardProps) {
  const { score, total, percentage, recommendations, levelUp, newLevel } = result

  const color =
    percentage >= 75 ? 'emerald' :
    percentage >= 45 ? 'indigo' : 'amber'

  const colorMap = {
    emerald: {
      bg: 'from-emerald-400 to-teal-500',
      shadow: 'shadow-emerald-200',
      text: 'text-emerald-600',
      light: 'bg-emerald-50 border-emerald-200',
    },
    indigo: {
      bg: 'from-indigo-500 to-cyan-500',
      shadow: 'shadow-indigo-200',
      text: 'text-indigo-600',
      light: 'bg-indigo-50 border-indigo-200',
    },
    amber: {
      bg: 'from-amber-400 to-orange-500',
      shadow: 'shadow-amber-200',
      text: 'text-amber-600',
      light: 'bg-amber-50 border-amber-200',
    },
  }

  const c = colorMap[color]

  const levelLabels: Record<string, string> = {
    debutant: 'Débutant 🌱',
    intermediaire: 'Intermédiaire ⚡',
    avance: 'Avancé 🚀',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-lg mx-auto space-y-4"
    >
      {/* 🎉 Level Up Banner */}
      <AnimatePresence>
        {levelUp && newLevel && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 text-white text-center shadow-lg shadow-amber-200"
          >
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <p className="font-bold text-lg">🎉 Level Up !</p>
            <p className="text-sm text-white/90">
              Vous passez au niveau{' '}
              <span className="font-bold">{levelLabels[newLevel]}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br ${c.bg} flex items-center justify-center shadow-lg ${c.shadow}`}
        >
          <Trophy className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-bold text-slate-800 mb-1">Quiz terminé ! 🎉</h2>
        <p className="text-slate-500 mb-6">Voici vos résultats</p>

        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl border ${c.light} mb-6`}>
          <span className={`text-4xl font-bold ${c.text}`}>{percentage}%</span>
          <div className="text-left">
            <p className="text-xs text-slate-500">Score</p>
            <p className="font-semibold text-slate-700">{score}/{total} bonnes réponses</p>
          </div>
        </div>

        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-6">
          <motion.div
            className={`h-full bg-gradient-to-r ${c.bg} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          />
        </div>

        <div className="space-y-2 mb-8">
          {recommendations.map((rec, i) => (
            <p key={i} className="text-sm text-slate-600">{rec}</p>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            onClick={onRetry}
            variant="secondary"
            icon={<RotateCcw className="w-4 h-4" />}
            fullWidth
          >
            Réessayer
          </Button>
          <Button
            onClick={onContinue}
            icon={<ArrowRight className="w-4 h-4" />}
            fullWidth
          >
            Mon parcours
          </Button>
        </div>
      </div>
    </motion.div>
  )
}