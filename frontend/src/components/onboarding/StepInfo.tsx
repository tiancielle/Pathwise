import { motion } from 'framer-motion'
import { User, Mail, Lock } from 'lucide-react'
import { Input } from '../common/Input'

interface StepInfoProps {
  data: {
    nom: string
    email: string
    password: string
  }
  onChange: (field: string, value: string) => void
  errors: Record<string, string>
}

export function StepInfo({ data, onChange, errors }: StepInfoProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-5"
    >
      <Input
        label="Nom complet"
        placeholder="Name .."
        value={data.nom}
        onChange={e => onChange('nom', e.target.value)}
        error={errors.nom}
        icon={<User className="w-4 h-4" />}
      />
      <Input
        label="Email"
        type="email"
        placeholder="name@example.com"
        value={data.email}
        onChange={e => onChange('email', e.target.value)}
        error={errors.email}
        icon={<Mail className="w-4 h-4" />}
      />
      <Input
        label="Mot de passe"
        type="password"
        placeholder="••••••••"
        value={data.password}
        onChange={e => onChange('password', e.target.value)}
        error={errors.password}
        icon={<Lock className="w-4 h-4" />}
      />
    </motion.div>
  )
}