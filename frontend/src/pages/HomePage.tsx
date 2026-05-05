import { motion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Zap, Users, Star, ArrowRight, X, Mail, Lock } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { useAuth } from '../hooks/useAuth'

export function HomePage() {
  const navigate = useNavigate()
  const { handleLogin, isLoading, error } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const stats = [
    { value: '10K+', label: 'Apprenants' },
    { value: '511', label: 'Ressources indexées' },
    { value: '4', label: 'Agents IA' },
    { value: '98%', label: 'Satisfaction' },
  ]

  const features = [
    { icon: '🤖', title: 'IA Multi-Agent', desc: '4 agents spécialisés analysent votre profil et génèrent votre parcours en temps réel.' },
    { icon: '🎯', title: 'Profilage intelligent', desc: 'Quiz adaptatif pour détecter précisément votre niveau et vos objectifs.' },
    { icon: '📚', title: 'Contenu personnalisé', desc: 'Ressources sélectionnées depuis notre base ChromaDB de 511 chunks indexés.' },
    { icon: '📈', title: 'Progression adaptative', desc: 'Votre parcours évolue avec vous grâce aux quiz et recommandations continues.' },
    { icon: '🔍', title: 'Human in the Loop', desc: 'Chaque ressource est vérifiée par nos experts avant d\'être intégrée.' },
    { icon: '💬', title: 'Agent conversationnel', desc: 'Posez vos questions, uploadez vos cours, obtenez des explications instantanées.' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-lg">PathWise</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)}>
              Connexion
            </Button>
            <Button size="sm" onClick={() => navigate('/onboarding')}>
              Commencer gratuitement
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-6"
            >
              <Zap className="w-4 h-4" />
              Propulsé par l'IA Multi-Agent
            </motion.div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 leading-tight mb-6">
              Votre parcours{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">
                d'apprentissage
              </span>{' '}
              sur mesure
            </h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              PathWise utilise l'intelligence artificielle pour créer un parcours
              d'apprentissage 100% adapté à votre niveau, vos objectifs et votre rythme.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/onboarding')}
                icon={<ArrowRight className="w-5 h-5" />}
              >
                Commencer gratuitement
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setShowLogin(true)}
              >
                J'ai déjà un compte
              </Button>
            </div>
          </motion.div>

          
          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <img
                src="/hero-illustration.png"
                alt="Système Multi-Agent PathWise"
                className="w-full h-80 object-contain rounded-3xl"
              />
              {/* Floating cards (optionnel - à supprimer si non désiré) */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-4 border border-slate-100"
              >
                <p className="text-xs text-slate-500">Score Quiz</p>
                <p className="text-2xl font-bold text-indigo-600">85%</p>
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-4 border border-slate-100"
              >
                <p className="text-xs text-slate-500">Modules complétés</p>
                <p className="text-2xl font-bold text-emerald-600">12/15</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-indigo-600 mb-1">{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Une technologie de pointe</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Notre système multi-agent combine les meilleures technologies pour un apprentissage optimal.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-slate-800 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-3xl border border-indigo-100 p-12">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">
            Prêt à commencer votre voyage d'apprentissage ?
          </h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            Créez votre profil en 2 minutes et recevez un parcours personnalisé adapté à vos objectifs.
          </p>
          <Button size="lg" onClick={() => navigate('/onboarding')} icon={<ArrowRight className="w-5 h-5" />}>
            Créer mon parcours
          </Button>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-400">
            <span>✓ Gratuit</span>
            <span>✓ Sans carte bancaire</span>
            <span>✓ Données sécurisées</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <BookOpen className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-slate-700">PathWise</span>
          </div>
          <p className="text-slate-400 text-sm">
            PathWise 2026 · EMSI · Nasri Hiba & Sabir Malak
          </p>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">Encadrante : Mme Hasnâa Chaabi</span>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowLogin(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Connexion</h2>
              <button
                onClick={() => setShowLogin(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="hiba@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
              />
              <Button
                fullWidth
                loading={isLoading}
                onClick={() => handleLogin(email, password)}
              >
                Se connecter
              </Button>
              <p className="text-center text-sm text-slate-500">
                Pas encore de compte ?{' '}
                <button
                  onClick={() => { setShowLogin(false); navigate('/onboarding') }}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Créer un profil
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}