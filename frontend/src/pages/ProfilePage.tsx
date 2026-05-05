import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Target, Save, LogOut } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/common/Input'
import { Button } from '../components/common/Button'
import { useApp } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'
import { updateProfil } from '../services/profileService'
import { NIVEAUX } from '../types'

export function ProfilePage() {
  const { state, dispatch } = useApp()
  const { handleLogout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    nom: state.user?.nom || '',
    objectifs: state.user?.objectifs || '',
  })

  const handleSave = async () => {
    if (!state.user) return
    setIsSaving(true)
    try {
      await updateProfil(state.user.id, form)
      dispatch({
        type: 'SET_AUTH',
        payload: {
          user: { ...state.user, nom: form.nom, objectifs: form.objectifs },
          token: state.token || '',
        },
      })
      setSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      console.error('Update failed')
    } finally {
      setIsSaving(false)
    }
  }

  const niveau = state.user?.niveau || 'debutant'
  const niveauInfo = NIVEAUX[niveau as keyof typeof NIVEAUX]

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User className="w-6 h-6 text-indigo-500" />
            Mon profil
          </h1>
          <p className="text-slate-500 mt-1">Gérez vos informations personnelles</p>
        </div>

        {/* Avatar + Niveau */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 mb-6 flex items-center gap-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl flex-shrink-0">
            {niveau === 'avance' ? '🚀' : niveau === 'intermediaire' ? '⚡' : '🌱'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{state.user?.nom}</h2>
            <p className="text-white/80 text-sm">{state.user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm font-medium">
              {niveauInfo?.label || niveau}
            </div>
          </div>
        </motion.div>

        {/* Success */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium"
          >
            ✅ Profil mis à jour avec succès !
          </motion.div>
        )}

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Informations</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-indigo-600 font-medium hover:underline"
              >
                Modifier
              </button>
            )}
          </div>

          <div className="space-y-4">
            <Input
              label="Nom complet"
              value={form.nom}
              onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
              disabled={!isEditing}
              icon={<User className="w-4 h-4" />}
            />
            <Input
              label="Email"
              value={state.user?.email || ''}
              disabled
              icon={<Mail className="w-4 h-4" />}
            />
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Objectifs
              </label>
              <textarea
                value={form.objectifs}
                onChange={e => setForm(p => ({ ...p, objectifs: e.target.value }))}
                disabled={!isEditing}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400"
                placeholder="Vos objectifs d'apprentissage..."
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setIsEditing(false)}
                fullWidth
              >
                Annuler
              </Button>
              <Button
                loading={isSaving}
                onClick={handleSave}
                icon={<Save className="w-4 h-4" />}
                fullWidth
              >
                Sauvegarder
              </Button>
            </div>
          )}
        </motion.div>

        {/* Niveau */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6"
        >
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-500" />
            Niveau actuel
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.values(NIVEAUX).map((n) => (
              <div
                key={n.niveau}
                className={`p-4 rounded-xl border-2 text-center transition-all ${
                  niveau === n.niveau
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-100 opacity-50'
                }`}
              >
                <p className="text-2xl mb-1">
                  {n.niveau === 'avance' ? '🚀' : n.niveau === 'intermediaire' ? '⚡' : '🌱'}
                </p>
                <p className="font-semibold text-slate-700 text-sm">{n.label}</p>
                {niveau === n.niveau && (
                  <span className="text-xs text-indigo-600 font-medium">Actuel</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            💡 Votre niveau évolue automatiquement selon vos résultats de quiz
          </p>
        </motion.div>

        {/* Logout */}
        <Button
          variant="danger"
          onClick={handleLogout}
          icon={<LogOut className="w-4 h-4" />}
          fullWidth
        >
          Se déconnecter
        </Button>
      </div>
    </PageWrapper>
  )
}