import { motion } from 'framer-motion'

interface LoaderProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' }

export function Loader({ text, size = 'md' }: LoaderProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500`}
      />
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-500 text-sm font-medium"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}