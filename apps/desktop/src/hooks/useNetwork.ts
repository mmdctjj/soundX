import { useEffect, useState } from "react"

export const useNetwork = () => {

  const [state, setState] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    window.addEventListener('offline', () => setState(false))
    window.addEventListener('online', () => setState(true))
    return () => {
      window.removeEventListener('offline', () => setState(false))
      window.removeEventListener('online', () => setState(true))
    }
  }, [])

  return state
}
