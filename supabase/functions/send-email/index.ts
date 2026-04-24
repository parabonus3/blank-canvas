import React from 'npm:react@18.3.1'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { RecoveryEmail } from './_templates/recovery.tsx'
import { SignupEmail } from './_templates/signup.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Simple in-memory rate limiter for recovery emails (per email, max 3 per 10 min)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // 10 minutes
const RATE_LIMIT_MAX = 3

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const key = email.toLowerCase()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count++
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, type, redirect_to } = await req.json()

    if (!email || !type) {
      throw new Error('Missing required fields: email, type')
    }

    // Create admin client to generate auth links
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // --- Authentication & Authorization ---

    if (type === 'signup') {
      // For signup: require a valid auth token and verify email matches the authenticated user
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }

      // Only allow sending signup confirmation to the authenticated user's own email
      if (user.email?.toLowerCase() !== email.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: email mismatch' }),
          { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    if (type === 'recovery') {
      // For recovery: apply rate limiting since user is unauthenticated
      if (isRateLimited(email)) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        )
      }
    }

    // --- Email generation ---

    let html: string
    let subject: string

    if (type === 'recovery') {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: redirect_to || undefined },
      })

      if (error) throw error

      const confirmationUrl = data.properties.action_link

      html = await renderAsync(
        React.createElement(RecoveryEmail, { confirmation_url: confirmationUrl })
      )
      subject = 'Password Reset - TimeZoni'

    } else if (type === 'signup') {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: redirect_to || undefined },
      })

      if (error) throw error

      const confirmationUrl = data.properties.action_link

      html = await renderAsync(
        React.createElement(SignupEmail, { confirmation_url: confirmationUrl })
      )
      subject = 'Confirm your account - TimeZoni'

    } else {
      throw new Error(`Unknown email type: ${type}`)
    }

    const { error: sendError } = await resend.emails.send({
      from: 'TimeZoni <noreply@timezoni.com>',
      to: [email],
      subject,
      html,
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      throw sendError
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('Error in send-email:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred processing your request.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})
