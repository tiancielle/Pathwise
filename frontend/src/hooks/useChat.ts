import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { sendMessage, uploadDocument } from '../services/chatService'
import type { ChatMessage, ExternalResource } from '../types'

export function useChat() {
  const { state, dispatch } = useApp()
  const [isTyping, setIsTyping] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const sendUserMessage = useCallback(async (content: string) => {
    if (!state.user) return

    // Ajoute le message utilisateur
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg })
    setIsTyping(true)

    try {
      const { reply, sources, external_resources } = await sendMessage({
        message: content,
        etudiant_id: state.user.id,
      })

      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          timestamp: new Date(),
          sources,
          external_resources: external_resources as ExternalResource[],
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur serveur'
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${msg}`,
          timestamp: new Date(),
        },
      })
    } finally {
      setIsTyping(false)
    }
  }, [state.user, dispatch])

  const handleUpload = useCallback(async (file: File) => {
    if (!state.user) return
    setIsUploading(true)

    dispatch({
      type: 'ADD_CHAT_MESSAGE',
      payload: {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⏳ Upload de "${file.name}" en cours... indexation dans ChromaDB.`,
        timestamp: new Date(),
      },
    })

    try {
      const result = await uploadDocument(file, state.user.id)
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ "${result.filename}" indexé avec succès !\n📦 ${result.nb_chunks} chunks ajoutés à la base de connaissances (${result.size_mb} MB)\nPosez maintenant vos questions sur ce document !`,
          timestamp: new Date(),
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur upload"
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${msg}`,
          timestamp: new Date(),
        },
      })
    } finally {
      setIsUploading(false)
    }
  }, [state.user, dispatch])

  return {
    messages: state.chatMessages,
    isTyping,
    isUploading,
    sendMessage: sendUserMessage,
    handleUpload,
    clearChat: () => dispatch({ type: 'CLEAR_CHAT' }),
  }
}