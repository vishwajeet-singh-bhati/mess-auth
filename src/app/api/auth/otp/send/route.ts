// app/api/auth/otp/send/route.ts
// POST — generates a 4-digit OTP and sends it to the student's institute email.
// OTP is stored in Supabase with a 10-minute expiry.
// Only @iiitk.ac.in emails accepted.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { badRequest } from '@/lib/auth/permissions'
import nodemailer from 'nodemailer'

const ALLOWED_DOMAIN = '@iiitk.ac.in'
const OTP_EXPIRY_MINUTES = 10

function generateOTP(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function POST(req: NextRequest) {
  let body: { email: string }
  try { body = await req.json() }
  catch { return badRequest('Invalid JSON') }

  const { email } = body

  if (!email?.trim()) return badRequest('Email is required')
  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return NextResponse.json(
      { error: `Only ${ALLOWED_DOMAIN} email addresses are allowed` },
      { status: 403 }
    )
  }

  const normalizedEmail = email.trim().toLowerCase()
  const db = createAdminClient()

  // Check if email already has an account
  const { data: existingUser } = await db
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  // Rate limit — max 3 OTPs per email per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await db
    .from('otp_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('email', normalizedEmail)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: 'Too many OTP requests. Please wait an hour before trying again.' },
      { status: 429 }
    )
  }

  // Invalidate any existing unused OTPs for this email
  await db
    .from('otp_verifications')
    .update({ is_used: true })
    .eq('email', normalizedEmail)
    .eq('is_used', false)

  // Generate and store new OTP
  const otp = generateOTP()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

  const { error: insertError } = await db
    .from('otp_verifications')
    .insert({
      email:      normalizedEmail,
      otp_code:   otp,
      expires_at: expiresAt,
      is_used:    false,
    })

  if (insertError) {
    console.error('OTP insert error:', insertError)
    return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
  }

  // Send email
  try {
    await transporter.sendMail({
      from:    `"Mess Auth — IIITDM Kurnool" <${process.env.GMAIL_USER}>`,
      to:      normalizedEmail,
      subject: 'Your Mess Auth OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🍽️</div>
            <h2 style="color: #1e3a5f; margin: 0; font-size: 22px;">Mess Auth System</h2>
            <p style="color: #64748b; margin: 4px 0 0; font-size: 14px;">IIITDM Kurnool</p>
          </div>
          <div style="background: white; border-radius: 10px; padding: 28px; border: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #374151; margin: 0 0 20px; font-size: 15px;">
              Your One-Time Password for account verification:
            </p>
            <div style="font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #1d4ed8; background: #dbeafe; border-radius: 8px; padding: 16px 24px; display: inline-block; margin-bottom: 20px;">
              ${otp}
            </div>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              This OTP expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.<br/>
              If you did not request this, please ignore this email.
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent by Mess Auth System · IIITDM Kurnool Hostel Management
          </p>
        </div>
      `,
    })
  } catch (emailError) {
    console.error('Email send error:', emailError)
    // Clean up the OTP we inserted
    await db.from('otp_verifications').update({ is_used: true }).eq('email', normalizedEmail).eq('is_used', false)
    return NextResponse.json({ error: 'Failed to send OTP email. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'OTP sent successfully' })
}
