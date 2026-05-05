import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send, Paperclip, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  onUpload: (file: File) => void
  isLoading: boolean
  isUploading: boolean
}

export function ChatInput({ onSend, onUpload, isLoading, isUploading }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!message.trim() || isLoading) return
    onSend(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = ''
  }

  return (
    <div className="border-t border-slate-100 bg-white p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {/* Upload */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFile}
          className="hidden"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50 transition-all flex-shrink-0"
          title="Uploader un document (PDF, DOCX)"
        >
          {isUploading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Paperclip className="w-5 h-5" />
          }
        </motion.button>

        {/* Input */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Posez une question, demandez une explication..."
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none text-sm"
          style={{ minHeight: '48px', maxHeight: '120px' }}
        />

        {/* Send */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!message.trim() || isLoading}
          className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isLoading
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Send className="w-5 h-5" />
          }
        </motion.button>
      </div>

      <p className="text-center text-xs text-slate-400 mt-2">
        Entrée pour envoyer · Shift+Entrée pour nouvelle ligne · 📎 pour uploader un PDF/DOCX
      </p>
    </div>
  )
}