import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Navbar } from './Navbar'

interface PageWrapperProps {
  children: ReactNode
  showNav?: boolean
}

export function PageWrapper({ children, showNav = true }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {showNav && <Navbar />}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={showNav ? 'pt-20 max-w-7xl mx-auto px-4 sm:px-6 py-8' : ''}
      >
        {children}
      </motion.main>
    </div>
  )
}