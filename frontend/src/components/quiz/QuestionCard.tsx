import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle } from 'lucide-react'
import type { QuizQuestion } from '../../types'

interface QuestionCardProps {
  question: QuizQuestion
  questionNumber: number
  totalQuestions: number
  onAnswer: (selectedOption: number) => void
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleSelect = (index: number) => {
    if (selected !== null) return
    setSelected(index)
    setShowResult(true)
    setTimeout(() => {
      onAnswer(index)
      setSelected(null)
      setShowResult(false)
    }, 1200)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-slate-500 mb-2">
          <span>Question {questionNumber} sur {totalQuestions}</span>
          <span>{Math.round((questionNumber / totalQuestions) * 100)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-4">
        <h2 className="text-lg font-bold text-slate-800 mb-6">
          {question.question}
        </h2>

        <div className="space-y-3">
          {question.options.map((option, index) => {
            let style = 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
            if (showResult && selected === index) {
              style = index === question.correctAnswer
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-red-400 bg-red-50'
            }
            if (showResult && index === question.correctAnswer && selected !== null) {
              style = 'border-emerald-500 bg-emerald-50'
            }

            return (
              <motion.button
                key={index}
                whileHover={selected === null ? { scale: 1.01 } : {}}
                whileTap={selected === null ? { scale: 0.99 } : {}}
                onClick={() => handleSelect(index)}
                className={`w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${style}`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  showResult && index === question.correctAnswer
                    ? 'border-emerald-500 text-emerald-500'
                    : showResult && selected === index
                    ? 'border-red-400 text-red-400'
                    : 'border-slate-300 text-slate-500'
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-slate-700 font-medium">{option}</span>
                {showResult && index === question.correctAnswer && (
                  <CheckCircle className="w-5 h-5 text-emerald-500 ml-auto" />
                )}
                {showResult && selected === index && index !== question.correctAnswer && (
                  <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-xl border ${
              selected === question.correctAnswer
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <p className="text-sm font-medium">💡 {question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}