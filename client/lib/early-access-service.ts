import { EarlyAccessRegistration, EarlyAccessResponse } from '@/types/early-access'

export async function registerForEarlyAccess(data: Partial<EarlyAccessRegistration>): Promise<EarlyAccessResponse> {
  try {
    const response = await fetch('/api/early-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to register for early access')
    }

    return result
  } catch (error) {
    console.error('Error registering for early access:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to register for early access',
      error: 'network_error'
    }
  }
}

export async function getEarlyAccessCount(): Promise<number> {
  try {
    const response = await fetch('/api/early-access')
    const data = await response.json()
    return data.count || 0
  } catch (error) {
    console.error('Error fetching early access count:', error)
    return 0
  }
}
