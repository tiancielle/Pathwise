import { Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from './context/AppContext'
import { HomePage } from './pages/HomePage'
import { OnboardingPage } from './pages/OnboardingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LearningPage } from './pages/LearningPage'
import { QuizPage } from './pages/QuizPage'
import { ChatPage } from './pages/ChatPage'
import { ProfilePage } from './pages/ProfilePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { state } = useApp()
  if (!state.isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { state } = useApp()
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/" element={
          state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <HomePage />
        } />
        <Route path="/onboarding" element={
          state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <OnboardingPage />
        } />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/learning"  element={<PrivateRoute><LearningPage /></PrivateRoute>} />
        <Route path="/quiz"      element={<PrivateRoute><QuizPage /></PrivateRoute>} />
        <Route path="/quiz/module/:moduleId" element={<PrivateRoute><QuizPage /></PrivateRoute>} />
        <Route path="/chat"      element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/profile"   element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        {/* Redirige /progress vers /learning */}
        <Route path="/progress"  element={<Navigate to="/learning" replace />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}

export default App