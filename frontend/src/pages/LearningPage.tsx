import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Map, RotateCcw, Zap } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ModuleCard } from '../components/learning/ModuleCard'
import { ProgressBar } from '../components/learning/ProgressBar'
import { Loader } from '../components/common/Loader'
import { useLearning } from '../hooks/useLearning'
import { useApp } from '../context/AppContext'
import type { Module } from '../types'

export function LearningPage() {
  const navigate = useNavigate()
  const { state } = useApp()
  const {
    modules,
    isLoading,
    completedCount,
    totalModules,
    progress,
    loadPath,
    resetPath,
    toggleModule,
  } = useLearning()
  const [view, setView] = useState<'list' | 'path'>('list')

  useEffect(() => {
    loadPath()
  }, [])

  const handleModuleClick = (module: Module) => {
    if (module.url && module.url !== '#') {
      window.open(module.url, '_blank')
    }
  }

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Bon retour, {state.user?.nom?.split(' ')[0]} !
        </h1>
        <p className="text-slate-500 mt-1">
          Continuez votre parcours d'apprentissage personnalisé.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader text="Génération de votre parcours..." size="lg" />
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
          {/* Progress */}
          <ProgressBar
            completed={completedCount}
            total={totalModules}
            percentage={progress}
            userName={state.user?.nom?.split(' ')[0]}
          />

          {/* Controls */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">Votre parcours</h2>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setView('list')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === 'list'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Liste
                </button>
                <button
                  onClick={() => setView('path')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    view === 'path'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Map className="w-4 h-4" />
                  Parcours
                </button>
              </div>

              {/* Regenerate */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetPath}
                className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                title="Régénérer le parcours"
              >
                <RotateCcw className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* Modules */}
          {modules.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-slate-500 font-medium mb-2">Aucun module disponible</p>
              <p className="text-slate-400 text-sm">
                Cliquez sur régénérer pour créer votre parcours
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module, i) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  index={i}
                  onToggle={toggleModule}
                  onClick={handleModuleClick}
                />
              ))}
            </div>
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
              Tester vos connaissances
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Passez un quiz pour que nous puissions affiner votre parcours
              et vous proposer du contenu encore plus adapté.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/quiz')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200"
            >
              Lancer le quiz
              <Zap className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </PageWrapper>
  )
}