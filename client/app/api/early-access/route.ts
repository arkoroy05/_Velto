import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { z } from 'zod'

// Validation schema for early access registration
const EarlyAccessSchema = z.object({
  email: z.string().email('Invalid email address'),
  feedback: z.string().optional(),
  source: z.string().optional(),
  timestamp: z.date().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const validatedData = EarlyAccessSchema.parse({
      ...body,
      timestamp: new Date(),
      source: body.source || 'landing-page'
    })

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db('velto')
    const collection = db.collection('early-access')

    // Check if email already exists
    const existingUser = await collection.findOne({ email: validatedData.email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered for early access' },
        { status: 409 }
      )
    }

    // Insert the new registration
    const result = await collection.insertOne({
      ...validatedData,
      createdAt: new Date(),
      status: 'waitlist',
      ipAddress: request.headers.get('x-forwarded-for') || (request as any).ip || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully registered for early access',
        id: result.insertedId as any
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('Early access registration error:', error)
    
    if (error?.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('velto')
    const collection = db.collection('early-access')
    
    // Get count of registrations
    const count = await collection.countDocuments()
    
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error fetching early access count:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
