import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Zap, Play } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { QuestionCard } from '../components/quiz/QuestionCard'
import { ScoreCard } from '../components/quiz/ScoreCard'
import { Button } from '../components/common/Button'
import { Loader } from '../components/common/Loader'
import { useQuiz } from '../hooks/useQuiz'

export function QuizPage() {
  const navigate = useNavigate()
  const {
    questions,
    currentQuestion,
    currentIndex,
    totalQuestions,
    result,
    isLoading,
    started,
    startQuiz,
    answerQuestion,
    finish,
    reset,
  } = useQuiz()

  // Auto-finish quand toutes les questions sont répondues
  useEffect(() => {
    if (started && questions.length > 0 && currentIndex >= totalQuestions) {
      finish()
    }
  }, [currentIndex, totalQuestions, started, questions.length])

  const handleAnswer = (selectedOption: number) => {
    if (!currentQuestion) return
    const timeSpent = 30
    answerQuestion(currentQuestion.id, selectedOption, timeSpent)
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Quiz d'évaluation</h1>
          <p className="text-slate-500 mt-1">
            Testez vos connaissances pour affiner votre parcours.
          </p>
        </div>

        {/* Start Screen */}
        {!started && !result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-200"
            >
              <Zap className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-2xl font-bold text-slate-800 mb-3">
              Évaluation rapide
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed max-w-md mx-auto">
              Répondez à quelques questions pour que nous puissions
              construire votre parcours parfaitement adapté à votre niveau réel.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Questions', value: '~5' },
                { label: 'Durée', value: '~3 min' },
                { label: 'Type', value: 'QCM' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <p className="text-xl font-bold text-indigo-600">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              loading={isLoading}
              onClick={startQuiz}
              icon={<Play className="w-5 h-5" />}
            >
              Commencer le quiz
            </Button>
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader text="Génération du quiz par IA..." size="lg" />
          </div>
        )}

        {/* Quiz en cours */}
        {started && !isLoading && currentQuestion && !result && (
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={totalQuestions}
              onAnswer={handleAnswer}
            />
          </AnimatePresence>
        )}

        {/* Résultats */}
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Vos résultats</h2>
              <p className="text-slate-500 mt-1">
                Voici ce que nous avons appris de vos réponses
              </p>
            </div>
            <ScoreCard
              result={result}
              onRetry={() => {
                reset()
              }}
              onContinue={() => navigate('/learning')}
            />
          </motion.div>
        )}
      </div>
    </PageWrapper>
  )
}