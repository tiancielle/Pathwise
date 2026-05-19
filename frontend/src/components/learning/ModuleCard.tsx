import { motion } from 'framer-motion'
import { CheckCircle, Circle, Play, FileText, Code, FolderOpen, Clock, Zap, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getModuleUrl } from '../../services/learningService'
import { openAndTrace } from '../../services/traceService'
import { useApp } from '../../context/AppContext'
import type { Module } from '../../types'

interface ModuleCardProps {
  module: Module
  index: number
  onToggle: (module: Module) => void
  onClick: (module: Module) => void
}

const typeConfig = {
  video:    { icon: Play,       color: 'bg-red-100 text-red-600',       label: 'Vidéo' },
  article:  { icon: FileText,   color: 'bg-blue-100 text-blue-600',     label: 'Article' },
  exercice: { icon: Code,       color: 'bg-purple-100 text-purple-600', label: 'Exercice' },
  projet:   { icon: FolderOpen, color: 'bg-amber-100 text-amber-600',   label: 'Projet' },
}

export function ModuleCard({ module, index, onToggle, onClick }: ModuleCardProps) {
  const navigate = useNavigate()
  const { state } = useApp()
  const config = typeConfig[module.type]
  const Icon = config.icon
  const moduleUrl = getModuleUrl(module)

  const handleStart = () => {
    if (!state.user) return
    openAndTrace(moduleUrl, {
      etudiant_id: state.user.id,
      module_nom: module.titre,
      titre: module.titre,
      type_ressource: module.type === 'projet' ? 'web' : module.type,
      source: 'externe',
    })
  }

  const handleQuiz = () => {
    navigate(`/quiz/module/${module.id}`, {
      state: { moduleId: module.id, moduleName: module.titre }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`bg-white rounded-2xl border-2 p-5 transition-all ${
        module.completed
          ? 'border-emerald-200 bg-emerald-50/30'
          : 'border-slate-100 hover:border-indigo-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Check toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(module)}
          className="flex-shrink-0 mt-0.5"
          title={module.completed ? 'Marquer non complété' : 'Marquer complété'}
        >
          {module.completed
            ? <CheckCircle className="w-6 h-6 text-emerald-500" />
            : <Circle className="w-6 h-6 text-slate-300 hover:text-emerald-400 transition-colors" />
          }
        </motion.button>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${config.color}`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
              module.difficulte === 'Facile'   ? 'bg-green-100 text-green-600' :
              module.difficulte === 'Moyen'    ? 'bg-amber-100 text-amber-600' :
              'bg-red-100 text-red-600'
            }`}>
              {module.difficulte}
            </span>
            {module.completed && (
              <span className="text-xs px-2 py-0.5 rounded-lg font-medium bg-emerald-100 text-emerald-600">
                Complété
              </span>
            )}
          </div>

          <h3 className={`font-semibold mb-1 ${
            module.completed ? 'text-slate-400 line-through' : 'text-slate-800'
          }`}>
            {module.titre}
          </h3>
          <p className="text-sm text-slate-500 mb-3 line-clamp-2">{module.description}</p>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {module.duree}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Bouton principal — ouvre la ressource */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleStart}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-md transition-all ${
              module.completed
                ? 'bg-slate-100 text-slate-400 shadow-none'
                : 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-indigo-200'
            }`}
            title={`Ouvrir ${config.label}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {module.completed ? 'Revoir' : 'Commencer'}
          </motion.button>

          {/* Quiz du module */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleQuiz}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 text-amber-600 text-xs font-semibold hover:bg-amber-200 transition-colors"
            title="Quiz sur ce module"
          >
            <Zap className="w-3.5 h-3.5" />
            Quiz
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}