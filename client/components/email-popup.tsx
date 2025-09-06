"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { registerForEarlyAccess } from "@/lib/early-access-service"
import { useToast } from "@/hooks/use-toast"

interface EmailPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function EmailPopup({ isOpen, onClose }: EmailPopupProps) {
  const [email, setEmail] = useState("")
  const [feedback, setFeedback] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await registerForEarlyAccess({
        email,
        feedback: feedback.trim() || undefined,
        source: 'landing-page'
      })

      if (result.success) {
        setIsSubmitted(true)

        // Show success toast
        toast({
          title: "Welcome to Velto!!",
          description: "You've been successfully added to our early access waitlist. We'll notify you as soon as we're ready!",
          duration: 1000,
        })

        // Reset form and close after delay
        setTimeout(() => {
          onClose()
          setIsSubmitted(false)
          setEmail("")
          setFeedback("")
          setError("")
        }, 4000)
      } else {
        setError(result.message || 'Failed to register. Please try again.')
        toast({
          title: "❌ Registration Failed",
          description: result.message || 'Failed to register. Please try again.',
          variant: "destructive",
          duration: 4000,
        })
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      toast({
        title: "❌ Error",
        description: 'An unexpected error occurred. Please try again.',
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      setEmail("")
      setFeedback("")
      setError("")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl p-8 max-w-md w-full relative">
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <>
            <h3 className="text-2xl font-bold text-foreground mb-2">Get Early Access</h3>
            <p className="text-muted-foreground mb-6">
              Join the waitlist and help us build the perfect AI memory system for you.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-foreground mb-2">
                  What would you use Velto for? (Optional)
                </label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us about your AI memory needs..."
                  rows={3}
                  className="w-full"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Joining Waitlist...
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">You're In! 🎉</h3>
            <p className="text-muted-foreground mb-4">
              Welcome to the Velto early access waitlist!
            </p>
            <p className="text-sm text-muted-foreground">
              Check your email for a confirmation and we'll notify you when Velto is ready.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
