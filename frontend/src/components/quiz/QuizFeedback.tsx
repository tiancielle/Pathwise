import { motion } from 'framer-motion'
import { CheckCircle, XCircle, ExternalLink, BookOpen } from 'lucide-react'
import { openAndTrace } from '../../services/traceService'
import { useApp } from '../../context/AppContext'
import type { QuestionFeedback, FeedbackResource } from '../../services/quizService'

interface QuizFeedbackProps {
  historique: QuestionFeedback[]
  ressources: Record<string, FeedbackResource[]>
}

const typeIcon: Record<string, string> = {
  video:         '🎥',
  article:       '📄',
  documentation: '📖',
  web:           '🌐',
}

export function QuizFeedback({ historique, ressources }: QuizFeedbackProps) {
  const { state } = useApp()
  const wrongQuestions = historique.filter(q =>
    q.status === '❌ Incorrect' || (!q.status && !q.isCorrect)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 mt-8"
    >
      {/* ── Historique détaillé ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          Détail des réponses
        </h3>
        <div className="space-y-4">
          {historique.map((q, i) => {
            // Supporte les 2 formats : status string OU isCorrect bool
            const isCorrect = q.status
              ? q.status === '✅ Correct'
              : q.isCorrect

            return (
              <motion.div
                key={q.id ?? i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`p-4 rounded-xl border-2 ${
                  isCorrect
                    ? 'border-emerald-100 bg-emerald-50/50'
                    : 'border-red-100 bg-red-50/50'
                }`}
              >
                {/* Question header */}
                <div className="flex items-start gap-3 mb-3">
                  {isCorrect
                    ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  }
                  <p className="text-sm font-semibold text-slate-700 flex-1">{q.question}</p>
                </div>

                <div className="ml-8 space-y-2">
                  {isCorrect ? (
                    /* ✅ Correct */
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 w-28 flex-shrink-0">Votre réponse :</span>
                      <span className="text-sm text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-lg">
                        ✅ {q.selected_text || q.options?.[q.selected] || 'Bonne réponse !'}
                      </span>
                    </div>
                  ) : (
                    /* ❌ Incorrect */
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-28 flex-shrink-0">Votre réponse :</span>
                        <span className="text-sm text-red-600 font-medium bg-red-100 px-2 py-0.5 rounded-lg">
                          ❌ {q.selected_text || q.options?.[q.selected] || 'Non répondu'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-28 flex-shrink-0">Bonne réponse :</span>
                        <span className="text-sm text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-lg">
                          ✅ {q.correct_text || q.options?.[q.correctAnswer] || 'Voir explication'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Explication */}
                  {q.explanation && (
                    <div className="mt-2 p-3 rounded-xl bg-white border border-slate-100 text-xs text-slate-600 leading-relaxed">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Ressources pour les questions ratées ─────────────────────────── */}
      {wrongQuestions.length > 0 && Object.keys(ressources).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
            📚 Ressources pour approfondir
          </h3>
          <p className="text-sm text-slate-400 mb-5">
            Basées sur vos {wrongQuestions.length} question{wrongQuestions.length > 1 ? 's' : ''} ratée{wrongQuestions.length > 1 ? 's' : ''}
          </p>

          <div className="space-y-6">
            {wrongQuestions.map(q => {
              const qRessources = ressources[String(q.id)] || []
              if (qRessources.length === 0) return null
              return (
                <div key={q.id}>
                  <p className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                    {q.question}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {qRessources.slice(0, 2).map((res, i) => (
                      <motion.button
                        key={i}
                        onClick={() => {
                          if (state.user) {
                            openAndTrace(res.url, {
                              etudiant_id: state.user.id,
                              module_nom: 'quiz_feedback',
                              titre: res.title,
                              type_ressource: (res.type as 'video' | 'article' | 'documentation' | 'web') || 'web',
                              source: 'externe',
                            })
                          } else {
                            window.open(res.url, '_blank', 'noopener,noreferrer')
                          }
                        }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all group bg-slate-50 hover:bg-white text-left w-full"
                      >
                        <span className="text-2xl flex-shrink-0">{typeIcon[res.type] || '🌐'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-2">
                            {res.title}
                          </p>
                          {res.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {res.description}
                            </p>
                          )}
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 flex-shrink-0 mt-0.5 transition-colors" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}