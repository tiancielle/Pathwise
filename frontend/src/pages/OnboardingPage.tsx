import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '../components/common/Button'
import { StepInfo } from '../components/onboarding/StepInfo'
import { StepLevel } from '../components/onboarding/StepLevel'
import { StepTopics } from '../components/onboarding/StepTopics'
import { submitProfile } from '../services/profileService'
import { useApp } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'

const steps = [
  { title: 'Vos informations', subtitle: 'Commençons par apprendre à nous connaître' },
  { title: 'Votre niveau', subtitle: 'Où en êtes-vous actuellement ?' },
  { title: 'Vos sujets', subtitle: 'Quels domaines souhaitez-vous explorer ?' },
]

const initialForm = {
  nom: '',
  email: '',
  password: '',
  objectifs: '',
  experience: '' as 'none' | 'basic' | 'intermediate' | 'advanced' | '',
  topics: [] as string[],
  timePerWeek: 5,
  preferredFormat: 'video',
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const { dispatch } = useApp()
  // const { handleRegister } = useAuth()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (step === 0) {
      if (!form.nom.trim()) newErrors.nom = 'Nom requis'
      if (!form.email.trim()) newErrors.email = 'Email requis'
      if (!form.password || form.password.length < 6)
        newErrors.password = 'Mot de passe minimum 6 caractères'
    }
    if (step === 1 && !form.experience) {
      newErrors.experience = 'Veuillez sélectionner votre niveau'
    }
    if (step === 2 && form.topics.length === 0) {
      newErrors.topics = 'Ajoutez au moins un sujet'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validate()) return
    if (step < steps.length - 1) {
      setStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  // const handleSubmit = async () => {
  //   setIsLoading(true)
  //   try {
  //     const { auth, niveau } = await submitProfile({
  //       ...form,
  //       experience: form.experience as 'none' | 'basic' | 'intermediate' | 'advanced',
  //     })
  //     dispatch({
  //       type: 'SET_AUTH',
  //       payload: { user: auth.etudiant, token: auth.access_token },
  //     })
  //     navigate('/dashboard')
  //   } catch (err: unknown) {
  //     const msg =
  //       (err as { response?: { data?: { detail?: string } } })
  //         ?.response?.data?.detail || 'Erreur lors de la création du profil'
  //     setErrors({ submit: msg })
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }
const handleSubmit = async () => {
  setIsLoading(true)
  try {
    const { auth } = await submitProfile({
      ...form,
      experience: form.experience as 'none' | 'basic' | 'intermediate' | 'advanced',
    })
    const user: import('../types').AuthUser = {
      id: auth.etudiant_id,
      nom: auth.nom,
      email: form.email,
      niveau: (localStorage.getItem('pw_level') || 'debutant') as 'debutant' | 'intermediaire' | 'avance',
      objectifs: form.objectifs || form.topics.join(', '),
    }
    dispatch({ type: 'SET_AUTH', payload: { user, token: auth.access_token } })
    navigate('/dashboard')
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { detail?: string } } })
      ?.response?.data?.detail || 'Erreur lors de la création du profil'
    setErrors({ submit: msg })
  } finally {
    setIsLoading(false)
  }
}
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">PathWise</span>
          </div>
          <span className="text-sm text-slate-400">
            Étape {step + 1} sur {steps.length}
          </span>
        </div>
      </div>

      <main className="pt-24 pb-12 px-4 sm:px-6 max-w-2xl mx-auto">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-200"
        >
          <BookOpen className="w-8 h-8 text-white" />
        </motion.div>

        {/* Title */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{steps[step].title}</h1>
          <p className="text-slate-500">{steps[step].subtitle}</p>
        </motion.div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex items-center">
              <motion.div
                animate={i === step ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                  i < step
                    ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white'
                    : i === step
                    ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {i < step ? <Check className="w-5 h-5" /> : i + 1}
              </motion.div>
              {i < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 transition-all ${
                  i < step
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500'
                    : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 mb-6">
          {errors.submit && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepInfo
                data={{ nom: form.nom, email: form.email, password: form.password }}
                onChange={updateField}
                errors={errors}
              />
            )}
            {step === 1 && (
              <StepLevel
                selected={form.experience}
                onSelect={val => updateField('experience', val)}
              />
            )}
            {step === 2 && (
              <StepTopics
                selected={form.topics}
                onAdd={topic => updateField('topics', [...form.topics, topic])}
                onRemove={topic => updateField('topics', form.topics.filter(t => t !== topic))}
              />
            )}
          </AnimatePresence>

          {errors.experience && (
            <p className="mt-3 text-sm text-red-500">{errors.experience}</p>
          )}
          {errors.topics && (
            <p className="mt-3 text-sm text-red-500">{errors.topics}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep(prev => prev - 1)}
            disabled={step === 0}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Retour
          </Button>
          <Button
            onClick={handleNext}
            loading={isLoading}
            icon={step < steps.length - 1
              ? <ChevronRight className="w-4 h-4" />
              : undefined
            }
          >
            {step < steps.length - 1 ? 'Continuer' : 'Créer mon profil'}
          </Button>
        </div>
      </main>
    </div>
  )
}