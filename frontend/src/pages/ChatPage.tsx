import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Trash2, BookOpen } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ChatBubble } from '../components/chat/ChatBubble'
import { ChatInput } from '../components/chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { useApp } from '../context/AppContext'

export function ChatPage() {
  const { state } = useApp()
  const { messages, isTyping, isUploading, sendMessage, handleUpload, clearChat } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto scroll vers le bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-indigo-500" />
              Agent IA PathWise
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              Posez vos questions · Uploadez vos cours · Obtenez des explications
            </p>
          </div>
          {messages.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Effacer
            </motion.button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Message de bienvenue */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-200 mb-6"
              >
                <MessageSquare className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Bonjour {state.user?.nom?.split(' ')[0]} ! 👋
              </h2>
              <p className="text-slate-500 max-w-md mb-8">
                Je suis votre agent IA personnel. Je peux répondre à vos questions,
                expliquer des concepts ML/NLP et rechercher dans notre base de
                511 ressources indexées.
              </p>

              {/* Suggestions */}
              <div className="grid sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  { icon: '🤔', text: 'Explique-moi le concept de backpropagation' },
                  { icon: '📚', text: 'Quelles ressources pour apprendre les Transformers ?' },
                  { icon: '💡', text: 'Quelle est la différence entre BERT et GPT ?' },
                  { icon: '🔍', text: 'Comment fonctionne l\'attention mechanism ?' },
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => sendMessage(suggestion.text)}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all text-left"
                  >
                    <span className="text-xl">{suggestion.icon}</span>
                    <span className="text-sm text-slate-600 font-medium">{suggestion.text}</span>
                  </motion.button>
                ))}
              </div>

              {/* Upload hint */}
              <div className="mt-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <BookOpen className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <p className="text-sm text-indigo-600">
                  💡 Vous pouvez uploader vos propres cours (PDF, DOCX) via le bouton 📎
                </p>
              </div>
            </motion.div>
          )}

          {/* Chat messages */}
          <AnimatePresence>
            {messages.map(message => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-sm flex-shrink-0">
                🤖
              </div>
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      className="w-2 h-2 rounded-full bg-indigo-400"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-auto -mx-4 sm:-mx-6">
          <ChatInput
            onSend={sendMessage}
            onUpload={handleUpload}
            isLoading={isTyping}
            isUploading={isUploading}
          />
        </div>
      </div>
    </PageWrapper>
  )
}