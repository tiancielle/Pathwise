import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Trophy, Zap, BookOpen, TrendingUp, Clock } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StatCard } from '../components/dashboard/StatCard'
import { Loader } from '../components/common/Loader'
import { getDashboard } from '../services/learningService'
import { getQuizHistory } from '../services/quizService'
import { useApp } from '../context/AppContext'
import type { DashboardData } from '../types'

interface QuizHistory {
  id: number
  module_id: string
  score: number
  date: string
}

export function ProgressPage() {
  const { state } = useApp()
  const [data, setData] = useState<DashboardData | null>(null)
  const [history, setHistory] = useState<QuizHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!state.user) return
      try {
        const [dashboard, quizHistory] = await Promise.all([
          getDashboard(state.user.id),
          getQuizHistory(state.user.id),
        ])
        setData(dashboard)
        setHistory(quizHistory || [])
      } catch {
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [state.user])

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-500" />
          Mes progrès
        </h1>
        <p className="text-slate-500 mt-1">
          Suivez votre évolution et vos performances.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader text="Chargement de vos statistiques..." size="lg" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Modules complétés"
              value={data?.progression.modules_completes ?? 0}
              icon={<BookOpen className="w-5 h-5" />}
              color="indigo"
              delay={0}
            />
            <StatCard
              label="Score moyen"
              value={`${data?.quiz.score_moyen ?? 0}%`}
              icon={<Trophy className="w-5 h-5" />}
              color="amber"
              delay={0.1}
            />
            <StatCard
              label="Quiz complétés"
              value={data?.quiz.nb_quiz ?? 0}
              icon={<Zap className="w-5 h-5" />}
              color="cyan"
              delay={0.2}
            />
            <StatCard
              label="Progression"
              value={`${data?.progression.pourcentage ?? 0}%`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="emerald"
              delay={0.3}
            />
          </div>

          {/* Progression globale */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
          >
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Progression du parcours
            </h2>
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>{data?.progression.modules_completes ?? 0} modules complétés</span>
              <span>{data?.progression.pourcentage ?? 0}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${data?.progression.pourcentage ?? 0}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span>
              <span>{data?.progression.modules_total ?? 0} modules au total</span>
              <span>100%</span>
            </div>
          </motion.div>

          {/* Historique Quiz */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
          >
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Historique des quiz
            </h2>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Aucun quiz complété pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((quiz, i) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 ${
                      quiz.score >= 75 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                      quiz.score >= 45 ? 'bg-gradient-to-br from-indigo-500 to-cyan-500' :
                      'bg-gradient-to-br from-amber-400 to-orange-500'
                    }`}>
                      {quiz.score}%
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">
                        {quiz.module_id}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(quiz.date).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${
                      quiz.score >= 75 ? 'text-emerald-500' :
                      quiz.score >= 45 ? 'text-indigo-500' :
                      'text-amber-500'
                    }`}>
                      {quiz.score >= 75 ? '🎉 Excellent' :
                       quiz.score >= 45 ? '💪 Bien' :
                       '📚 À revoir'}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Niveau actuel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-100 p-6"
          >
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-indigo-500" />
              Votre niveau actuel
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                <span className="text-2xl">
                  {state.user?.niveau === 'avance' ? '🚀' :
                   state.user?.niveau === 'intermediaire' ? '⚡' : '🌱'}
                </span>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 capitalize">
                  {state.user?.niveau}
                </p>
                <p className="text-slate-500 text-sm">
                  {state.user?.niveau === 'avance'
                    ? 'Expert — place aux sujets avancés et à la recherche.'
                    : state.user?.niveau === 'intermediaire'
                    ? 'Bonnes bases — cap sur la pratique et les projets !'
                    : 'Vous débutez — on commence par les fondamentaux.'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  )
}