import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid, RotateCcw, Zap, Search,
  Trophy, Clock, BookOpen, CheckCircle,
  Plus, ChevronRight, X
} from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ModuleCard } from '../components/learning/ModuleCard'
import { ProgressBar } from '../components/learning/ProgressBar'
import { Loader } from '../components/common/Loader'
import { StatCard } from '../components/dashboard/StatCard'
import { useLearning } from '../hooks/useLearning'
import { useApp } from '../context/AppContext'
import {
  getDashboard,
  getAllParcours,
  getModulesFromParcours,
  generateLearningPath,
  completeModule,
} from '../services/learningService'
import type { Parcours } from '../services/learningService'
import type { Module } from '../types'

interface DashboardStats {
  quiz: { nb_quiz: number; score_moyen: number }
  sessions: { nb_sessions: number; temps_total_h: number }
}

const SUGGESTED_TOPICS = [
  'Machine Learning', 'Deep Learning', 'NLP', 'Python',
  'Data Science', 'Computer Vision', 'MLOps', 'LLMs',
  'Reinforcement Learning', 'Statistics', 'React', 'SQL',
]

export function LearningPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useApp()
  const { toggleModule } = useLearning()

  const [allParcours, setAllParcours] = useState<Parcours[]>([])
  const [activeParcours, setActiveParcours] = useState<Parcours | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [searchTopic, setSearchTopic] = useState('')
  const [showTopicSearch, setShowTopicSearch] = useState(false)
  const [activeTab, setActiveTab] = useState<'modules' | 'history'>('modules')

  useEffect(() => {
    const load = async () => {
      if (!state.user) return
      setIsLoading(true)
      try {
        const [parcours, dashData] = await Promise.all([
          getAllParcours(state.user.id),
          getDashboard(state.user.id),
        ])
        setStats(dashData)

        if (parcours.length > 0) {
          setAllParcours(parcours)
          const latest = parcours[parcours.length - 1]
          setActiveParcours(latest)
          setModules(getModulesFromParcours(latest))
          dispatch({ type: 'SET_MODULES', payload: getModulesFromParcours(latest) })
        }
      } catch {
        await handleNewTopic('machine_learning', true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [state.user?.id])

  const handleSelectParcours = (parcours: Parcours) => {
    setActiveParcours(parcours)
    const mods = getModulesFromParcours(parcours)
    setModules(mods)
    dispatch({ type: 'SET_MODULES', payload: mods })
    setActiveTab('modules')
    localStorage.setItem('pw_subject', parcours.subject.toLowerCase().replace(/\s+/g, '_'))
  }

  const handleNewTopic = async (topic: string, silent = false) => {
    if (!topic.trim() || !state.user) return
    if (!silent) {
      setIsGenerating(true)
      setShowTopicSearch(false)
      setSearchTopic('')
    }
    const subject = topic.toLowerCase().replace(/\s+/g, '_')
    localStorage.setItem('pw_subject', subject)

    try {
      const { parcours, modules: newMods } = await generateLearningPath({
        etudiant_id: state.user.id,
        subject,
        level: state.user.niveau,
      })

      setAllParcours(prev => {
        const exists = prev.find(p => p.id === parcours.id)
        return exists ? prev : [...prev, parcours]
      })
      setActiveParcours(parcours)
      setModules(newMods)
      dispatch({ type: 'SET_MODULES', payload: newMods })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Erreur génération parcours' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggle = async (module: Module) => {
    if (!state.user || !activeParcours) return
    const updated = { ...module, completed: !module.completed }
    
    // Mise à jour locale immédiate
    setModules(prev => prev.map(m => m.id === module.id ? updated : m))
    dispatch({ type: 'UPDATE_MODULE', payload: updated })
    
    // Synchronisation backend
    await completeModule(
      activeParcours.id,
      module.id,
      state.user.id,
      updated.completed
    )
  }

  const completedModules = modules.filter(m => m.completed)
  const pendingModules = modules.filter(m => !m.completed)
  const progress = modules.length > 0
    ? Math.round((completedModules.length / modules.length) * 100)
    : 0

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Mes parcours
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {allParcours.length} parcours · {modules.length} modules
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowTopicSearch(!showTopicSearch)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-indigo-200 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nouveau sujet
        </motion.button>
      </div>

      {/* Barre navigation parcours */}
      {allParcours.length > 0 && (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {allParcours.map(parcours => (
            <motion.button
              key={parcours.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleSelectParcours(parcours)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                activeParcours?.id === parcours.id
                  ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {parcours.subject}
              {activeParcours?.id === parcours.id && (
                <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                  {getModulesFromParcours(parcours).filter(m => m.completed).length}/
                  {getModulesFromParcours(parcours).length}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {/* Nouveau sujet search */}
      <AnimatePresence>
        {showTopicSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white rounded-2xl border border-indigo-100 shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800">🎯 Que voulez-vous apprendre ?</h3>
              <button onClick={() => setShowTopicSearch(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchTopic}
                onChange={e => setSearchTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNewTopic(searchTopic)}
                placeholder="Ex: Deep Learning, React, SQL..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
                autoFocus
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNewTopic(searchTopic)}
                disabled={!searchTopic.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Générer
              </motion.button>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.map(topic => (
                <motion.button
                  key={topic}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNewTopic(topic)}
                  className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium hover:bg-indigo-100 hover:text-indigo-700 transition-all"
                >
                  {topic}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading || isGenerating ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader
            text={isGenerating ? `Génération du parcours "${searchTopic || 'nouveau sujet'}"...` : 'Chargement de vos parcours...'}
            size="lg"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-sm text-slate-400 max-w-md text-center"
          >
            Notre système multi-agent analyse votre profil et sélectionne
            les meilleures ressources pour vous...
          </motion.p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Modules complétés"
              value={`${completedModules.length}/${modules.length}`}
              icon={<CheckCircle className="w-5 h-5" />}
              color="emerald"
              delay={0}
            />
            <StatCard
              label="Quiz complétés"
              value={stats?.quiz.nb_quiz ?? 0}
              icon={<Zap className="w-5 h-5" />}
              color="amber"
              delay={0.1}
            />
            <StatCard
              label="Score moyen"
              value={`${stats?.quiz.score_moyen ?? 0}%`}
              icon={<Trophy className="w-5 h-5" />}
              color="indigo"
              delay={0.2}
            />
            <StatCard
              label="Temps total"
              value={`${stats?.sessions.temps_total_h ?? 0}h`}
              icon={<Clock className="w-5 h-5" />}
              color="cyan"
              delay={0.3}
            />
          </div>

          {/* Progress */}
          <ProgressBar
            completed={completedModules.length}
            total={modules.length}
            percentage={progress}
            userName={state.user?.nom?.split(' ')[0]}
          />

          {/* Tabs + Régénérer */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('modules')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'modules'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                En cours ({pendingModules.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Complétés ({completedModules.length})
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => activeParcours && handleNewTopic(activeParcours.subject)}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              title="Régénérer ce parcours"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          </div>

          {/* En cours */}
          {activeTab === 'modules' && (
            <AnimatePresence mode="wait">
              {pendingModules.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-5xl mb-4">🎉</div>
                  <p className="text-slate-700 font-bold text-lg mb-2">Parcours complété !</p>
                  <p className="text-slate-400 text-sm mb-6">
                    Félicitations ! Choisissez un nouveau sujet pour continuer.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowTopicSearch(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200"
                  >
                    <Plus className="w-5 h-5" />
                    Nouveau sujet
                  </motion.button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {pendingModules.map((module, i) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      index={i}
                      onToggle={handleToggle}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          )}

          {/* Complétés */}
          {activeTab === 'history' && (
            <AnimatePresence mode="wait">
              {completedModules.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Aucun module complété pour le moment</p>
                  <p className="text-slate-300 text-xs mt-1">
                    Cochez ✅ un module pour le marquer comme complété
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {completedModules.map((module, i) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      index={i}
                      onToggle={handleToggle}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              )}
            </AnimatePresence>
          )}

          {/* Quiz CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-12 bg-gradient-to-r from-indigo-50 via-cyan-50 to-teal-50 rounded-2xl p-8 border border-indigo-100 text-center"
          >
            <Zap className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              Évaluer votre niveau sur{' '}
              <span className="text-indigo-600">{activeParcours?.subject}</span>
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
              Passez le quiz pour valider vos connaissances et débloquer
              des ressources encore plus adaptées.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/quiz')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200"
            >
              Lancer le quiz <Zap className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  )
}