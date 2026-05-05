import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { login, logout } from '../services/authService'
import type { AuthUser } from '../types'

export function useAuth() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await login(email, password)
      const user: AuthUser = {
        id: data.etudiant_id,
        nom: data.nom,
        email,
        niveau: 'debutant',
        objectifs: '',
      }
      dispatch({ type: 'SET_AUTH', payload: { user, token: data.access_token } })
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || 'Identifiants incorrects'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [dispatch, navigate])

  const handleLogout = useCallback(() => {
    logout()
    dispatch({ type: 'CLEAR_AUTH' })
    navigate('/')
  }, [dispatch, navigate])

  return {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading,
    error,
    handleLogin,
    handleLogout,
  }
}