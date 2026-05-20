import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, FileText, Trash2, Calendar, Database, MessageSquare } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { DropZone } from '../components/common/DropZone'
import { Loader } from '../components/common/Loader'
import { getDocuments, deleteDocument } from '../services/documentService'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import type { Document } from '../services/documentService'
import type { UploadResult } from '../services/documentService'

export function DocumentsPage() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading]   = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadDocuments = useCallback(async () => {
    if (!state.user) return
    try {
      const docs = await getDocuments(state.user.id)
      setDocuments(docs)
    } finally {
      setIsLoading(false)
    }
  }, [state.user])

  useEffect(() => { loadDocuments() }, [loadDocuments])

  const handleUploadSuccess = (result: UploadResult) => {
    // Recharge la liste après upload
    loadDocuments()
  }

  const handleDelete = async (docId: number) => {
    setDeletingId(docId)
    try {
      await deleteDocument(docId)
      setDocuments(prev => prev.filter(d => d.id !== docId))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-indigo-500" />
            Mes Documents
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Uploadez vos cours et supports — l'Agent IA les utilisera pour répondre à vos questions.
          </p>
        </div>

        {/* Message explicatif */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-50 to-cyan-50 rounded-2xl border border-indigo-100 p-5 mb-8 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm mb-1">
              Comment ça fonctionne ?
            </p>
            <p className="text-slate-500 text-sm leading-relaxed">
              Ces documents sont indexés dans ChromaDB et utilisés par l'Agent IA
              pour répondre à vos questions de manière personnalisée.
              Uploadez vos cours, notes, ou tout document pédagogique.
            </p>
            <button
              onClick={() => navigate('/chat')}
              className="mt-2 text-indigo-600 text-xs font-semibold hover:underline"
            >
              → Aller parler à l'Agent IA
            </button>
          </div>
        </motion.div>

        {/* Upload zone */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-slate-800 mb-4">Ajouter un document</h2>
          <DropZone onSuccess={handleUploadSuccess} />
        </div>

        {/* Liste documents */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" />
              Documents indexés
              {documents.length > 0 && (
                <span className="text-xs font-medium bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              )}
            </h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader text="Chargement..." size="sm" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">
                Aucun document uploadé
              </p>
              <p className="text-slate-300 text-xs mt-1">
                Ajoutez votre premier document ci-dessus
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {(Array.isArray(documents) ? documents : []).map((doc, i) => (
                  <motion.div
                    // key={doc.id}
                    key={`${doc.id}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-cyan-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(doc.date_upload).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {doc.nb_chunks} chunks
                        </span>
                        <span>{doc.size_mb} MB</span>
                      </div>
                    </div>

                    {/* Delete */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      {deletingId === doc.id
                        ? <Loader size="sm" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  )
}