import { useState, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { sendMessage, searchRag, uploadDocument } from '../services/chatService'
import type { ChatMessage } from '../types'

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
      const { reply, sources } = await sendMessage({
        message: content,
        etudiant_id: state.user.id,
      })

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
        sources,
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: assistantMsg })
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Désolé, une erreur est survenue. Réessayez.',
        timestamp: new Date(),
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: errorMsg })
    } finally {
      setIsTyping(false)
    }
  }, [state.user, dispatch])

  const handleUpload = useCallback(async (file: File) => {
    if (!state.user) return
    setIsUploading(true)
    try {
      await uploadDocument(file, state.user.id)
      const msg: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Document "${file.name}" uploadé et indexé ! Je peux maintenant répondre à vos questions sur ce contenu.`,
        timestamp: new Date(),
      }
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: msg })
    } catch {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          id: Date.now().toString(),
          role: 'assistant',
          content: "❌ Erreur lors de l'upload. Vérifiez le format du fichier (PDF, DOCX).",
          timestamp: new Date(),
        },
      })
    } finally {
      setIsUploading(false)
    }
  }, [state.user, dispatch])

  const searchResources = useCallback(async (query: string) => {
    return await searchRag(query)
  }, [])

  return {
    messages: state.chatMessages,
    isTyping,
    isUploading,
    sendMessage: sendUserMessage,
    handleUpload,
    searchResources,
    clearChat: () => dispatch({ type: 'CLEAR_CHAT' }),
  }
}