import { motion } from 'framer-motion'
import { Clock, BookOpen, Zap } from 'lucide-react'

interface Session {
  id: number
  module_titre: string
  date: string
  duree: number
}

interface RecentActivityProps {
  sessions: Session[]
}

export function RecentActivity({ sessions }: RecentActivityProps) {
  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Activité récente
        </h3>
        <div className="text-center py-8">
          <Zap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucune activité pour le moment</p>
          <p className="text-slate-300 text-xs mt-1">Commencez un module pour voir votre historique</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-indigo-500" />
        Activité récente
      </h3>
      <div className="space-y-3">
        {sessions.map((session, i) => (
          <motion.div
            key={session.id ?? i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {session.module_titre}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(session.date).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {session.duree} min
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}