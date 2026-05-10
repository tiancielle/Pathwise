import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpen, Zap, BarChart3, MessageSquare,
  ArrowRight, Trophy, Target, Clock
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { StatCard } from '../components/dashboard/StatCard'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { Button } from '../components/common/Button'
import { Loader } from '../components/common/Loader'
import { getDashboard } from '../services/learningService'
import { useApp } from '../context/AppContext'

interface BackendDashboard {
  etudiant: {
    id: number
    nom: string
    email: string
    niveau: string
    objectifs: string
  }
  quiz: {
    nb_quiz: number
    score_moyen: number
    meilleur_score: number
  }
  sessions: {
    nb_sessions: number
    temps_total_h: number
  }
  modules_completes: number
  sessions_recentes: Array<{
    id: number
    module_titre: string
    date: string
    duree: number
  }>
  dernier_parcours: {
    titre: string
    date_creation: string
  } | null
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { state } = useApp()
  const [data, setData] = useState<BackendDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!state.user) return
      try {
        const result = await getDashboard(state.user.id)
        setData(result)
      } catch {
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [state.user])

  const quickActions = [
    {
      icon: BookOpen,
      label: 'Mon parcours',
      desc: 'Continuer votre apprentissage',
      path: '/learning',
      color: 'from-indigo-500 to-cyan-500',
      shadow: 'shadow-indigo-200',
    },
    {
      icon: Zap,
      label: 'Quiz',
      desc: 'Tester vos connaissances',
      path: '/quiz',
      color: 'from-amber-400 to-orange-500',
      shadow: 'shadow-amber-200',
    },
    {
      icon: MessageSquare,
      label: 'Agent IA',
      desc: 'Poser une question',
      path: '/chat',
      color: 'from-emerald-400 to-teal-500',
      shadow: 'shadow-emerald-200',
    },
    {
      icon: BarChart3,
      label: 'Progrès',
      desc: 'Voir vos statistiques',
      path: '/progress',
      color: 'from-purple-500 to-pink-500',
      shadow: 'shadow-purple-200',
    },
  ]

  return (
    <PageWrapper>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader text="Chargement de votre dashboard..." size="lg" />
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Welcome */}
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-slate-800 mb-1"
            >
              Bonjour, {state.user?.nom?.split(' ')[0] ?? data?.etudiant.nom?.split(' ')[0]} ! 👋
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-slate-500"
            >
              Continuez votre parcours d'apprentissage personnalisé.
            </motion.p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Modules complétés"
              value={data?.modules_completes ?? 0}
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
              label="Sessions"
              value={data?.sessions.nb_sessions ?? 0}
              icon={<Target className="w-5 h-5" />}
              color="cyan"
              delay={0.2}
            />
            <StatCard
              label="Temps total"
              value={`${data?.sessions.temps_total_h ?? 0}h`}
              icon={<Clock className="w-5 h-5" />}
              color="emerald"
              delay={0.3}
            />
          </div>

          {/* Dernier parcours */}
          {data?.dernier_parcours && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 mb-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="relative">
                <p className="text-white/80 text-sm font-medium mb-1">Dernier parcours</p>
                <h2 className="text-xl font-bold mb-1">{data.dernier_parcours.titre}</h2>
                <p className="text-white/70 text-sm">
                  Créé le {new Date(data.dernier_parcours.date_creation).toLocaleDateString('fr-FR')}
                </p>
                <button
                  onClick={() => navigate('/learning')}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-all"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <h2 className="text-xl font-bold text-slate-800 mb-4">Accès rapide</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.button
                  key={action.path}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(action.path)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left hover:shadow-md transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md ${action.shadow} mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{action.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{action.desc}</p>
                </motion.button>
              )
            })}
          </div>

          {/* Bottom Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            <RecentActivity
              sessions={
                data?.sessions_recentes?.map(s => ({
                  id: s.id,
                  module_titre: s.module_titre,
                  date: s.date,
                  duree: s.duree,
                })) ?? []
              }
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-100 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-200 mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">Besoin d'aide ?</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Notre agent IA peut répondre à vos questions, expliquer des concepts
                  et vous recommander des ressources depuis notre base de 511 chunks indexés.
                </p>
              </div>
              <Button
                onClick={() => navigate('/chat')}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Parler à l'agent IA
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </PageWrapper>
  )
}