import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'
import type { ChatMessage } from '../../types'

interface ChatBubbleProps {
  message: ChatMessage
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold ${
        isUser
          ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white'
          : 'bg-gradient-to-br from-slate-600 to-slate-800 text-white'
      }`}>
        {isUser ? 'M' : '🤖'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-tr-sm'
            : 'bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-sm'
        }`}>
          {message.content}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-wrap gap-1 mt-1"
          >
            {message.sources.map((source, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium border border-indigo-100"
              >
                <BookOpen className="w-3 h-3" />
                {source}
              </span>
            ))}
          </motion.div>
        )}

        <span className="text-xs text-slate-400">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  )
}