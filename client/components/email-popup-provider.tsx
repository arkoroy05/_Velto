"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { EmailPopup } from "./email-popup"

interface EmailPopupContextType {
  openPopup: () => void
  closePopup: () => void
  isOpen: boolean
}

const EmailPopupContext = createContext<EmailPopupContextType | undefined>(undefined)

export function EmailPopupProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openPopup = () => setIsOpen(true)
  const closePopup = () => setIsOpen(false)

  return (
    <EmailPopupContext.Provider value={{ openPopup, closePopup, isOpen }}>
      {children}
      <EmailPopup isOpen={isOpen} onClose={closePopup} />
    </EmailPopupContext.Provider>
  )
}

export function useEmailPopup() {
  const context = useContext(EmailPopupContext)
  if (context === undefined) {
    throw new Error("useEmailPopup must be used within an EmailPopupProvider")
  }
  return context
}
