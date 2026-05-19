import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { Zap, Play, ArrowUp } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { QuestionCard } from '../components/quiz/QuestionCard'
import { ScoreCard } from '../components/quiz/ScoreCard'
import { QuizFeedback } from '../components/quiz/QuizFeedback'
import { Button } from '../components/common/Button'
import { Loader } from '../components/common/Loader'
import { useQuiz } from '../hooks/useQuiz'
import { useApp } from '../context/AppContext'
import { getQuizFeedback } from '../services/quizService'
import type { QuizFeedback as QuizFeedbackType } from '../services/quizService'
import type { AnswerInput } from '../services/quizService'

export function QuizPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = useApp()

  const moduleId = location.state?.moduleId
  const moduleName = location.state?.moduleName

  // ✅ answers ajouté dans le destructuring
  const {
    questions, currentQuestion, currentIndex,
    totalQuestions, result, isLoading, started,
    answers,
    startQuiz, answerQuestion, finish, reset,
  } = useQuiz()

  const [feedback, setFeedback] = useState<QuizFeedbackType | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)
  const answersRef = useRef<AnswerInput[]>([])

  // ✅ Sync answersRef à chaque changement
  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  // ✅ useEffect du finish mis à jour avec answersRef
  useEffect(() => {
    if (started && questions.length > 0 && currentIndex >= totalQuestions) {
      const doFinish = async () => {
        const savedAnswers = [...answersRef.current]
        const quizResult = await finish()
        if (quizResult && state.user) {
          setLoadingFeedback(true)
          try {
            const fb = await getQuizFeedback({
              etudiant_id: state.user.id,
              module_nom: moduleName || localStorage.getItem('pw_subject') || 'machine_learning',
              questions,
              answers: savedAnswers,
            })
            setFeedback(fb)
          } catch {
            console.warn('Feedback non disponible')
          } finally {
            setLoadingFeedback(false)
          }
        }
      }
      doFinish()
    }
  }, [currentIndex, totalQuestions, started, questions.length])

  const handleAnswer = (selectedOption: number) => {
    if (!currentQuestion) return
    answerQuestion(currentQuestion.id, selectedOption, 30)
  }

  const oldNiveau = localStorage.getItem('pw_level_before') || 'debutant'
  const newNiveau = state.user?.niveau || 'debutant'
  const leveledUp = result && oldNiveau !== newNiveau

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            {moduleName ? `Quiz — ${moduleName}` : 'Quiz d\'évaluation'}
          </h1>
          <p className="text-slate-500 mt-1">
            {moduleName
              ? `Testez vos connaissances sur ce module.`
              : 'Testez vos connaissances pour affiner votre parcours.'}
          </p>
        </div>

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
              {moduleName ? `Quiz sur "${moduleName}"` : 'Évaluation rapide'}
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed max-w-md mx-auto">
              {moduleName
                ? `Répondez aux questions pour valider votre compréhension du module et débloquer le niveau suivant.`
                : `Répondez à quelques questions pour construire votre parcours adapté.`}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Questions', value: '~5' },
                { label: 'Durée', value: '~3 min' },
                { label: 'Type', value: 'QCM' },
              ].map(stat => (
                <div key={stat.label} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xl font-bold text-indigo-600">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
            <Button
              size="lg"
              loading={isLoading}
              onClick={() => {
                localStorage.setItem('pw_level_before', state.user?.niveau || 'debutant')
                startQuiz(moduleId, moduleName)
              }}
              icon={<Play className="w-5 h-5" />}
            >
              Commencer le quiz
            </Button>
          </motion.div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader text="Génération du quiz par IA..." size="lg" />
          </div>
        )}

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

        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {leveledUp && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-center shadow-lg"
              >
                <ArrowUp className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xl font-bold">🎉 Level Up !</p>
                <p className="text-white/90 text-sm mt-1">
                  Vous êtes passé de{' '}
                  <span className="font-bold capitalize">{oldNiveau}</span>
                  {' '}à{' '}
                  <span className="font-bold capitalize">{newNiveau}</span> !
                </p>
              </motion.div>
            )}

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Vos résultats</h2>
              <p className="text-slate-500 mt-1">
                {moduleName ? `Module : ${moduleName}` : 'Voici ce que nous avons appris'}
              </p>
            </div>
            <ScoreCard
              result={result}
              onRetry={() => reset()}
              onContinue={() => navigate('/learning')}
            />

            {loadingFeedback && (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader size="sm" />
                <p className="text-sm text-slate-400">Analyse de vos réponses...</p>
              </div>
            )}

            {feedback && !loadingFeedback && (
              <QuizFeedback
                historique={feedback.historique}
                ressources={feedback.ressources_par_question}
              />
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  )
}