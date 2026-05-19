import { motion } from 'framer-motion'
import { BookOpen, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { openAndTrace } from '../../services/traceService'
import { useApp } from '../../context/AppContext'
import type { ChatMessage, ExternalResource } from '../../types'

interface EnrichedChatMessage extends ChatMessage {
  external_resources?: ExternalResource[]
}

interface ChatBubbleProps {
  message: EnrichedChatMessage
}

const typeIcon: Record<string, string> = {
  video:         '🎥',
  article:       '📄',
  documentation: '📖',
  web:           '🌐',
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const { state } = useApp()

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
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Contenu */}
      <div className={`max-w-[75%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white rounded-tr-sm'
            : 'bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-sm'
        }`}>
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-700 mb-1">{children}</h3>,
                p:  ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded text-xs font-mono">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-slate-800 text-slate-100 p-3 rounded-xl text-xs overflow-x-auto mb-2 font-mono">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-indigo-300 pl-3 italic text-slate-500 my-2">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-indigo-500 hover:underline font-medium">
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Ressources externes */}
        {!isUser && message.external_resources && message.external_resources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            <p className="text-xs font-semibold text-slate-500 mb-2">
              📚 Ressources recommandées
            </p>
            <div className="space-y-2">
              {message.external_resources.map((res, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    if (state.user) {
                      openAndTrace(res.url, {
                        etudiant_id: state.user.id,
                        module_nom: 'chat',
                        titre: res.title,
                        type_ressource: (res.type as 'video' | 'article' | 'documentation' | 'web') || 'web',
                        source: 'externe',
                      })
                    } else {
                      window.open(res.url, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group w-full text-left"
                >
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {typeIcon[res.type] || '🌐'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors truncate">
                      {res.title}
                    </p>
                    {res.description && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                        {res.description}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 flex-shrink-0 mt-1 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sources PDF */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.sources.map((source, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 text-xs border border-slate-100">
                <BookOpen className="w-2.5 h-2.5" />
                {typeof source === 'string' ? source : JSON.stringify(source)}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-slate-400">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  )
}