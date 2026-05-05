import { useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { getLearningPath, generateLearningPath, deleteLearningPath } from '../services/learningService'
import type { Module } from '../types'

export function useLearning() {
  const { state, dispatch } = useApp()

  const loadPath = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const modules = await getLearningPath()
      dispatch({ type: 'SET_MODULES', payload: modules })
    } catch {
      // Pas de parcours existant → génère un nouveau
      if (state.user) {
        await generatePath()
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.user, dispatch])

  const generatePath = useCallback(async () => {
    if (!state.user) return
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const modules = await generateLearningPath({
        etudiant_id: state.user.id,
        niveau: state.user.niveau,
        objectifs: state.user.objectifs,
        subject: localStorage.getItem('pw_subject') || 'machine_learning',
      })
      dispatch({ type: 'SET_MODULES', payload: modules })
    } catch (err: unknown) {
      dispatch({ type: 'SET_ERROR', payload: 'Erreur génération parcours' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.user, dispatch])

  const resetPath = useCallback(async () => {
    await deleteLearningPath()
    dispatch({ type: 'SET_MODULES', payload: [] })
    await generatePath()
  }, [generatePath, dispatch])

  const toggleModule = useCallback((module: Module) => {
    dispatch({
      type: 'UPDATE_MODULE',
      payload: { ...module, completed: !module.completed },
    })
  }, [dispatch])

  const completedCount = state.modules.filter(m => m.completed).length
  const progress = state.modules.length > 0
    ? Math.round((completedCount / state.modules.length) * 100)
    : 0

  return {
    modules: state.modules,
    isLoading: state.isLoading,
    completedCount,
    totalModules: state.modules.length,
    progress,
    loadPath,
    generatePath,
    resetPath,
    toggleModule,
  }
}