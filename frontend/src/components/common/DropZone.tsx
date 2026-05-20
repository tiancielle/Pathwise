import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, X, CheckCircle, Loader2 } from 'lucide-react'
import { uploadDocument } from '../../services/documentService'
import type { UploadResult } from '../../services/documentService'

interface DropZoneProps {
  onSuccess: (result: UploadResult) => void
}

export function DropZone({ onSuccess }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<UploadResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setSuccess(null)
    setIsUploading(true)
    try {
      const result = await uploadDocument(file)
      setSuccess(result)
      onSuccess(result)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur upload')
    } finally {
      setIsUploading(false)
    }
  }, [onSuccess])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <motion.div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !isUploading && fileRef.current?.click()}
        animate={{
          borderColor: isDragging ? '#6366f1' : '#e2e8f0',
          backgroundColor: isDragging ? '#eef2ff' : '#f8fafc',
        }}
        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={onInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Indexation en cours...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDragging
                  ? 'bg-indigo-500 shadow-lg shadow-indigo-200'
                  : 'bg-slate-100'
              }`}
            >
              <Upload className={`w-7 h-7 ${isDragging ? 'text-white' : 'text-slate-400'}`} />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {isDragging ? 'Relâchez pour uploader' : 'Glissez un fichier ici'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                ou <span className="text-indigo-500 font-medium">cliquez pour parcourir</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 bg-slate-100 rounded-full">PDF</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-full">DOCX</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-full">TXT</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded-full">Max 20MB</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Success */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                ✅ {success.filename} indexé !
              </p>
              <p className="text-xs text-emerald-600">
                {success.nb_chunks} chunks · {success.size_mb} MB
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-200"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-400" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}