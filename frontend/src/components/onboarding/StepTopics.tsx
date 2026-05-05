import { motion } from 'framer-motion'
import { useState } from 'react'
import { X, Plus } from 'lucide-react'

interface StepTopicsProps {
  selected: string[]
  onAdd: (topic: string) => void
  onRemove: (topic: string) => void
}

const suggestions = [
  'Machine Learning', 'Deep Learning', 'NLP', 'Python',
  'Data Science', 'Computer Vision', 'MLOps', 'LLMs',
  'Reinforcement Learning', 'Statistics', 'SQL', 'React',
]

export function StepTopics({ selected, onAdd, onRemove }: StepTopicsProps) {
  const [input, setInput] = useState('')

  const handleAdd = (topic: string) => {
    if (topic.trim() && !selected.includes(topic.trim())) {
      onAdd(topic.trim())
    }
    setInput('')
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-5"
    >
      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd(input)}
          placeholder="Tapez un sujet et appuyez sur Entrée..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleAdd(input)}
          className="px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Suggestions */}
      <div>
        <p className="text-sm font-semibold text-slate-600 mb-3">Suggestions :</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map(topic => (
            <motion.button
              key={topic}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleAdd(topic)}
              disabled={selected.includes(topic)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selected.includes(topic)
                  ? 'bg-indigo-100 text-indigo-700 cursor-default'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {topic} {selected.includes(topic) && '✓'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Selected */}
      {selected.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-sm font-semibold text-slate-600 mb-3">
            Sélectionnés ({selected.length}) :
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map(topic => (
              <motion.span
                key={topic}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium"
              >
                {topic}
                <button onClick={() => onRemove(topic)}>
                  <X className="w-3.5 h-3.5 hover:text-red-500" />
                </button>
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}