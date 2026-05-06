import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Trophy, Zap, TrendingUp, Clock, BookOpen } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StatCard } from '../components/dashboard/StatCard'
import { Loader } from '../components/common/Loader'
import { getDashboard } from '../services/learningService'
import { getQuizHistory } from '../services/quizService'
import { useApp } from '../context/AppContext'

interface QuizHistory {
  id: number
  module_nom: string
  score: number
  nb_questions: number
  nb_correctes: number
  date_quiz: string
}

interface BackendDashboard {
  etudiant: { id: number; nom: string; email: string; niveau: string; objectifs: string }
  quiz: { nb_quiz: number; score_moyen: number; meilleur_score: number }
  sessions: { nb_sessions: number; temps_total_h: number }
  dernier_parcours: { titre: string; date_creation: string } | null
}

export function ProgressPage() {
  const { state, dispatch } = useApp()
  const [data, setData] = useState<BackendDashboard | null>(null)
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

        // Level up : met à jour le niveau dans le context si le backend a changé
        if (dashboard.etudiant.niveau !== state.user.niveau) {
          dispatch({
            type: 'SET_AUTH',
            payload: {
              user: { ...state.user, niveau: dashboard.etudiant.niveau as 'debutant' | 'intermediaire' | 'avance' },
              token: localStorage.getItem('pw_token') || '',
            }
          })
        }
      } catch {
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [state.user?.id])

  const niveauEmoji = (n: string) =>
    n === 'avance' ? '🚀' : n === 'intermediaire' ? '⚡' : '🌱'

  const niveauLabel = (n: string) =>
    n === 'avance' ? 'Avancé' : n === 'intermediaire' ? 'Intermédiaire' : 'Débutant'

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-500" />
          Mes progrès
        </h1>
        <p className="text-slate-500 mt-1">Suivez votre évolution et vos performances.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader text="Chargement de vos statistiques..." size="lg" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Quiz complétés" value={data?.quiz.nb_quiz ?? 0}
              icon={<Zap className="w-5 h-5" />} color="indigo" delay={0} />
            <StatCard label="Score moyen" value={`${data?.quiz.score_moyen ?? 0}%`}
              icon={<Trophy className="w-5 h-5" />} color="amber" delay={0.1} />
            <StatCard label="Sessions" value={data?.sessions.nb_sessions ?? 0}
              icon={<BookOpen className="w-5 h-5" />} color="cyan" delay={0.2} />
            <StatCard label="Temps total" value={`${data?.sessions.temps_total_h ?? 0}h`}
              icon={<Clock className="w-5 h-5" />} color="emerald" delay={0.3} />
          </div>

          {/* Niveau actuel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                {niveauEmoji(state.user?.niveau || 'debutant')}
              </div>
              <div>
                <p className="text-white/80 text-sm">Votre niveau actuel</p>
                <p className="text-2xl font-bold">{niveauLabel(state.user?.niveau || 'debutant')}</p>
                <p className="text-white/70 text-sm mt-0.5">
                  {state.user?.niveau === 'avance'
                    ? 'Expert — place aux sujets avancés et à la recherche.'
                    : state.user?.niveau === 'intermediaire'
                    ? 'Bonnes bases — cap sur la pratique et les projets !'
                    : 'Vous débutez — on commence par les fondamentaux.'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Historique Quiz */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
          >
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Historique des quiz
            </h2>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Aucun quiz complété pour le moment</p>
                <p className="text-slate-300 text-xs mt-1">
                  Complétez un quiz pour voir votre historique ici
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((quiz, i) => {
                  const pct = Math.round(quiz.score * 100)
                  return (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white flex-shrink-0 text-sm ${
                        pct >= 75 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                        pct >= 45 ? 'bg-gradient-to-br from-indigo-500 to-cyan-500' :
                        'bg-gradient-to-br from-amber-400 to-orange-500'
                      }`}>
                        {pct}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-700 text-sm truncate">
                          {quiz.module_nom}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(quiz.date_quiz).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                          {' · '}{quiz.nb_correctes}/{quiz.nb_questions} bonnes réponses
                        </p>
                      </div>
                      <div className={`text-sm font-bold flex-shrink-0 ${
                        pct >= 75 ? 'text-emerald-500' :
                        pct >= 45 ? 'text-indigo-500' :
                        'text-amber-500'
                      }`}>
                        {pct >= 75 ? '🎉 Excellent' : pct >= 45 ? '💪 Bien' : '📚 À revoir'}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Dernier parcours */}
          {data?.dernier_parcours && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6"
            >
              <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Dernier parcours généré
              </h2>
              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl">
                <BookOpen className="w-8 h-8 text-indigo-500" />
                <div>
                  <p className="font-semibold text-slate-800">{data.dernier_parcours.titre}</p>
                  <p className="text-xs text-slate-400">
                    Créé le {new Date(data.dernier_parcours.date_creation).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  )
}