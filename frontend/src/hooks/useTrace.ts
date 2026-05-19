import { useState, useCallback, useRef, useEffect } from 'react'
import { openAndTrace, confirmTrace } from '../services/traceService'
import type { TracePayload } from '../services/traceService'

interface PendingTrace {
  traceId: number
  titre: string
  startTime: number
}

export function useTrace() {
  const [pending, setPending] = useState<PendingTrace | null>(null)
  const [showModal, setShowModal] = useState(false)
  const listenerRef = useRef<(() => void) | null>(null)

  // Nettoie le listener précédent
  const clearListener = useCallback(() => {
    if (listenerRef.current) {
      document.removeEventListener('visibilitychange', listenerRef.current)
      listenerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearListener()
  }, [clearListener])

  const handleOpenResource = useCallback(async (
    url: string,
    payload: Omit<TracePayload, 'url'>
  ) => {
    // Nettoie tout listener précédent
    clearListener()

    const traceId = await openAndTrace(url, payload)
    const startTime = Date.now()

    const newPending: PendingTrace = {
      traceId,
      titre: payload.titre,
      startTime,
    }

    // Listener visibilitychange — déclenche la modale au retour
    const handler = () => {
      if (document.visibilityState === 'visible') {
        clearListener()
        setPending(newPending)
        setShowModal(true)
      }
    }

    listenerRef.current = handler
    document.addEventListener('visibilitychange', handler)
  }, [clearListener])

  const handleConfirm = useCallback(async () => {
    if (!pending) return
    const duree = Math.round((Date.now() - pending.startTime) / 1000)
    await confirmTrace(pending.traceId, duree)
    setPending(null)
    setShowModal(false)
  }, [pending])

  const handleSkip = useCallback(() => {
    setPending(null)
    setShowModal(false)
  }, [])

  return {
    showModal,
    pendingTitre: pending?.titre || '',
    handleOpenResource,
    handleConfirm,
    handleSkip,
  }
}