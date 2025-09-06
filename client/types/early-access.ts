export interface EarlyAccessRegistration {
  _id?: string
  email: string
  feedback?: string
  source?: string
  timestamp: Date
  createdAt: Date
  status: 'waitlist' | 'approved' | 'rejected'
  ipAddress?: string
  userAgent?: string
}

export interface EarlyAccessResponse {
  success: boolean
  message: string
  id?: string
  error?: string
  details?: any
}

export interface EarlyAccessCountResponse {
  count: number
}
