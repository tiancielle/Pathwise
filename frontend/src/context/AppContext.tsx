import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import { getStoredUser, getStoredToken } from '../services/authService'
import type { AuthUser, Module, QuizQuestion, QuizResult, ChatMessage } from '../types'

// ─── State ────────────────────────────────────────────────────────────────────
interface AppState {
  // Auth
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  // Onboarding
  onboardingStep: number
  onboardingData: Record<string, unknown>
  // Learning
  modules: Module[]
  // Quiz
  quizQuestions: QuizQuestion[]
  quizResult: QuizResult | null
  // Chat
  chatMessages: ChatMessage[]
  // UI
  isLoading: boolean
  error: string | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_AUTH'; payload: { user: AuthUser; token: string } }
  | { type: 'CLEAR_AUTH' }
  | { type: 'SET_ONBOARDING_STEP'; payload: number }
  | { type: 'SET_ONBOARDING_DATA'; payload: Record<string, unknown> }
  | { type: 'SET_MODULES'; payload: Module[] }
  | { type: 'UPDATE_MODULE'; payload: Module }
  | { type: 'SET_QUIZ_QUESTIONS'; payload: QuizQuestion[] }
  | { type: 'SET_QUIZ_RESULT'; payload: QuizResult | null }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_CHAT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState: AppState = {
  user: null,
  token: null,
  isAuthenticated: false,
  onboardingStep: 0,
  onboardingData: {},
  modules: [],
  quizQuestions: [],
  quizResult: null,
  chatMessages: [],
  isLoading: false,
  error: null,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
      }
    case 'CLEAR_AUTH':
      return { ...initialState }
    case 'SET_ONBOARDING_STEP':
      return { ...state, onboardingStep: action.payload }
    case 'SET_ONBOARDING_DATA':
      return { ...state, onboardingData: { ...state.onboardingData, ...action.payload } }
    case 'SET_MODULES':
      return { ...state, modules: action.payload }
    case 'UPDATE_MODULE':
      return {
        ...state,
        modules: state.modules.map(m => m.id === action.payload.id ? action.payload : m),
      }
    case 'SET_QUIZ_QUESTIONS':
      return { ...state, quizQuestions: action.payload }
    case 'SET_QUIZ_RESULT':
      return { ...state, quizResult: action.payload }
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] }
    case 'CLEAR_CHAT':
      return { ...state, chatMessages: [] }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Restaure l'auth depuis localStorage au démarrage
  useEffect(() => {
    const token = getStoredToken()
    const user = getStoredUser()
    if (token && user) {
      dispatch({ type: 'SET_AUTH', payload: { user, token } })
    }
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}