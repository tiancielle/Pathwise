import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { fetchQuestions, submitQuiz } from '../services/quizService'
import type { AnswerInput } from '../services/quizService'
import { updateProfil } from '../services/profileService'

export function useQuiz() {
  const { state, dispatch } = useApp()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerInput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const [currentModule, setCurrentModule] = useState<string | null>(null)

  const startQuiz = useCallback(async (moduleId?: string, moduleName?: string) => {
    setIsLoading(true)
    try {
      const subject = moduleId ||
        localStorage.getItem('pw_subject') || 'machine_learning'
      const level = localStorage.getItem('pw_level') || 'debutant'

      if (moduleName) setCurrentModule(moduleName)

      const questions = await fetchQuestions(subject, level, state.user?.id)
      dispatch({ type: 'SET_QUIZ_QUESTIONS', payload: questions })
      setCurrentIndex(0)
      setAnswers([])
      setStarted(true)
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, state.user?.id])

  const answerQuestion = useCallback((
    questionId: string,
    selectedOption: number,
    timeSpent: number
  ) => {
    setAnswers(prev => [...prev, { questionId, selectedOption, timeSpent }])
    setCurrentIndex(prev => prev + 1)
  }, [])

  const finish = useCallback(async () => {
    if (!state.user) return null
    setIsLoading(true)
    try {
      const result = await submitQuiz({
        etudiant_id: state.user.id,
        answers,
        questions: state.quizQuestions,
      })
      dispatch({ type: 'SET_QUIZ_RESULT', payload: result })

      const newNiveau =
        result.percentage >= 75 ? 'avance' :
        result.percentage >= 45 ? 'intermediaire' :
        'debutant'

      const currentNiveau = state.user.niveau
      const niveauOrder = { debutant: 0, intermediaire: 1, avance: 2 }

      if (niveauOrder[newNiveau as keyof typeof niveauOrder] >
          niveauOrder[currentNiveau as keyof typeof niveauOrder]) {
        try {
          await updateProfil(state.user.id, { niveau: newNiveau } as never)
          const updatedUser = { ...state.user, niveau: newNiveau as 'debutant' | 'intermediaire' | 'avance' }
          dispatch({
            type: 'SET_AUTH',
            payload: { user: updatedUser, token: localStorage.getItem('pw_token') || '' }
          })
          localStorage.setItem('pw_user', JSON.stringify(updatedUser))
          localStorage.setItem('pw_level', newNiveau)
        } catch {
          console.warn('Level up non sauvegarde')
        }
      }

      return result
    } finally {
      setIsLoading(false)
    }
  }, [state.user, state.quizQuestions, answers, dispatch])

  const reset = useCallback(() => {
    setCurrentIndex(0)
    setAnswers([])
    setStarted(false)
    setCurrentModule(null)
    dispatch({ type: 'SET_QUIZ_QUESTIONS', payload: [] })
    dispatch({ type: 'SET_QUIZ_RESULT', payload: null })
  }, [dispatch])

  return {
    questions: state.quizQuestions,
    currentQuestion: state.quizQuestions[currentIndex] || null,
    currentIndex,
    totalQuestions: state.quizQuestions.length,
    result: state.quizResult,
    isLoading,
    started,
    answers,
    currentModule,
    startQuiz,
    answerQuestion,
    finish,
    reset,
  }
}