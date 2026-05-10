import { useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { getAllParcours, generateLearningPath, getModulesFromParcours, completeModule } from '../services/learningService'
import type { Module } from '../types'

export function useLearning() {
  const { state, dispatch } = useApp()

  const loadPath = useCallback(async () => {
    if (!state.user) return
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const parcours = await getAllParcours(state.user.id)
      if (parcours.length > 0) {
        const latest = parcours[parcours.length - 1]
        const modules = getModulesFromParcours(latest)
        dispatch({ type: 'SET_MODULES', payload: modules })
      } else {
        await generatePath()
      }
    } catch {
      await generatePath()
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.user])

  const generatePath = useCallback(async () => {
    if (!state.user) return
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const subject = localStorage.getItem('pw_subject') || 'machine_learning'
      const { modules } = await generateLearningPath({
        etudiant_id: state.user.id,
        subject,
        level: state.user.niveau,
      })
      dispatch({ type: 'SET_MODULES', payload: modules })
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Erreur génération parcours' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.user])

  const resetPath = useCallback(async () => {
    dispatch({ type: 'SET_MODULES', payload: [] })
    await generatePath()
  }, [generatePath])

  // ✅ signature corrigée : 4 arguments
  const toggleModule = useCallback(async (
    module: Module,
    pathId?: number
  ) => {
    const updated = { ...module, completed: !module.completed }
    dispatch({ type: 'UPDATE_MODULE', payload: updated })
    if (state.user && pathId) {
      await completeModule(pathId, module.id, state.user.id, updated.completed)
    }
  }, [dispatch, state.user])

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