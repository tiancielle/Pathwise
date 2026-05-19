import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, CheckCircle, SkipForward } from 'lucide-react'
import { Button } from './Button'

interface RetourModalProps {
  show: boolean
  titre: string
  onConfirm: () => void
  onSkip: () => void
}

export function RetourModal({ show, titre, onConfirm, onSkip }: RetourModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-slate-100"
          >
            {/* Icon */}
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-200 mb-4"
            >
              <BookOpen className="w-6 h-6 text-white" />
            </motion.div>

            {/* Text */}
            <h3 className="text-lg font-bold text-slate-800 mb-1">
              📚 Tu es de retour !
            </h3>
            <p className="text-slate-500 text-sm mb-2">As-tu consulté :</p>
            <p className="text-indigo-600 font-semibold text-sm bg-indigo-50 px-3 py-2 rounded-xl mb-6 line-clamp-2">
              "{titre}"
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={onConfirm}
                icon={<CheckCircle className="w-4 h-4" />}
                fullWidth
              >
                Oui, je l'ai consulté
              </Button>
              <Button
                onClick={onSkip}
                variant="ghost"
                icon={<SkipForward className="w-4 h-4" />}
                fullWidth
              >
                Pas encore, plus tard
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}