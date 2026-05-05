import { motion } from 'framer-motion'
import { CheckCircle, Circle, Play, FileText, Code, FolderOpen, Clock, BarChart } from 'lucide-react'
import type { Module } from '../../types'

interface ModuleCardProps {
  module: Module
  index: number
  onToggle: (module: Module) => void
  onClick: (module: Module) => void
}

const typeConfig = {
  video: { icon: Play, color: 'bg-red-100 text-red-600', label: 'Vidéo' },
  article: { icon: FileText, color: 'bg-blue-100 text-blue-600', label: 'Article' },
  exercice: { icon: Code, color: 'bg-purple-100 text-purple-600', label: 'Exercice' },
  projet: { icon: FolderOpen, color: 'bg-amber-100 text-amber-600', label: 'Projet' },
}

export function ModuleCard({ module, index, onToggle, onClick }: ModuleCardProps) {
  const config = typeConfig[module.type]
  const Icon = config.icon

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
        {/* Check */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onToggle(module)}
          className="flex-shrink-0 mt-0.5"
        >
          {module.completed
            ? <CheckCircle className="w-6 h-6 text-emerald-500" />
            : <Circle className="w-6 h-6 text-slate-300" />
          }
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${config.color}`}>
              <Icon className="w-3 h-3" />
              {config.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
              module.difficulte === 'Facile' ? 'bg-green-100 text-green-600' :
              module.difficulte === 'Moyen' ? 'bg-amber-100 text-amber-600' :
              'bg-red-100 text-red-600'
            }`}>
              {module.difficulte}
            </span>
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
            <span className="flex items-center gap-1">
              <BarChart className="w-3.5 h-3.5" />
              {module.difficulte}
            </span>
          </div>
        </div>

        {/* Action */}
        {!module.completed && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onClick(module)}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-indigo-200"
          >
            Commencer
          </motion.button>
        )}
      </div>
    </motion.div>
  )
}