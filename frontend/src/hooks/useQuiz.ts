import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { fetchQuestions, submitQuiz } from '../services/quizService'
import type { AnswerInput } from '../services/quizService'

export function useQuiz() {
  const { state, dispatch } = useApp()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerInput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [started, setStarted] = useState(false)

  const startQuiz = useCallback(async () => {
    setIsLoading(true)
    try {
      const subject = localStorage.getItem('pw_subject') || 'machine_learning'
      const level = localStorage.getItem('pw_level') || 'debutant'
      const questions = await fetchQuestions(subject, level)
      dispatch({ type: 'SET_QUIZ_QUESTIONS', payload: questions })
      setCurrentIndex(0)
      setAnswers([])
      setStarted(true)
    } finally {
      setIsLoading(false)
    }
  }, [dispatch])

  const answerQuestion = useCallback((questionId: string, selectedOption: number, timeSpent: number) => {
    const answer: AnswerInput = { questionId, selectedOption, timeSpent }
    setAnswers(prev => [...prev, answer])
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
      return result
    } finally {
      setIsLoading(false)
    }
  }, [state.user, state.quizQuestions, answers, dispatch])

  const reset = useCallback(() => {
    setCurrentIndex(0)
    setAnswers([])
    setStarted(false)
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
    startQuiz,
    answerQuestion,
    finish,
    reset,
  }
}