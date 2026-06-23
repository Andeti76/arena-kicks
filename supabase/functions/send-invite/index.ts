import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL     = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'Arena Kicks <noreply@finance.andeti.com.br>'

const ALLOWED_ORIGINS = [APP_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean)

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? '*')
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(body: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

const ROLE_LABEL: Record<string, string> = {
  owner:        'Dono da Arena',
  partner:      'Sócio',
  area_manager: 'Responsável de área',
}

serve(async (req) => {
  const origin = req.headers.get('origin')
  const CORS   = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { email, role, cost_center_id } = await req.json()

    // ── Validações básicas ────────────────────────────────────────────────
    if (!email) {
      return json({ error: 'E-mail obrigatório.' }, 400, CORS)
    }
    if (!['owner', 'partner', 'area_manager'].includes(role)) {
      return json({ error: 'Perfil inválido.' }, 400, CORS)
    }
    if (role === 'area_manager' && !cost_center_id) {
      return json({ error: 'Centro de custo obrigatório para Responsável de área.' }, 400, CORS)
    }

    // ── Cliente com service role ──────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Valida autenticação do chamador ───────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authErr || !user) return json({ error: 'Não autenticado.' }, 401, CORS)

    // ── Hierarquia de convites ────────────────────────────────────────────
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!['platform_admin', 'owner'].includes(roleRow?.role ?? '')) {
      return json({ error: 'Sem permissão para convidar usuários.' }, 403, CORS)
    }
    if (role === 'owner' && roleRow?.role !== 'platform_admin') {
      return json({ error: 'Somente o Administrador Andeti pode convidar o dono da Arena.' }, 403, CORS)
    }

    const normalizedEmail = email.toLowerCase().trim()

    // ── Verifica se e-mail já tem conta no Auth ───────────────────────────
    const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const alreadyRegistered = authUsers?.users?.some(
      (u) => u.email?.toLowerCase() === normalizedEmail,
    )
    if (alreadyRegistered) {
      return json({ error: 'Este e-mail já possui uma conta no sistema.' }, 400, CORS)
    }

    // ── Verifica convite pendente duplicado ───────────────────────────────
    const { data: existingInvite } = await supabase
      .from('invites')
      .select('id')
      .eq('email', normalizedEmail)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingInvite) {
      return json({ error: 'Já existe um convite pendente para este e-mail.' }, 400, CORS)
    }

    // ── Cria o convite no banco ───────────────────────────────────────────
    const { data: invite, error: inviteErr } = await supabase
      .from('invites')
      .insert({
        email:          normalizedEmail,
        role,
        cost_center_id: role === 'area_manager' ? cost_center_id : null,
      })
      .select('token')
      .single()

    if (inviteErr) return json({ error: inviteErr.message }, 400, CORS)

    const inviteLink = `${APP_URL}/convite?token=${invite.token}`
    const roleLabel  = ROLE_LABEL[role] ?? role

    // ── Envia e-mail via Resend ───────────────────────────────────────────
    const resendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    RESEND_FROM,
        to:      normalizedEmail,
        subject: 'Você foi convidado para o Arena Kicks',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <div style="background:#0B2238;padding:32px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="color:white;margin:0;font-size:24px;letter-spacing:-0.5px;">Arena Kicks</h1>
              <p style="color:rgba(255,255,255,0.55);margin:4px 0 0;font-size:13px;">Jacareí</p>
            </div>
            <div style="background:white;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
              <p style="color:#374151;font-size:15px;margin:0 0 8px;">Olá,</p>
              <p style="color:#374151;font-size:15px;margin:0 0 24px;">
                Você foi convidado para acessar o sistema <strong>Arena Kicks Jacareí</strong>
                como <strong>${roleLabel}</strong>.
              </p>
              <a href="${inviteLink}"
                 style="display:block;background:#0B2238;color:white;text-decoration:none;
                        text-align:center;padding:14px 24px;border-radius:10px;
                        font-weight:700;font-size:15px;margin-bottom:24px;">
                Criar minha conta
              </a>
              <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
                O link expira em 7 dias.<br>
                Se você não esperava este convite, ignore este e-mail.
              </p>
            </div>
          </div>
        `,
      }),
    })

    // ── Rollback se e-mail falhar ─────────────────────────────────────────
    if (!resendRes.ok) {
      const resendErr = await resendRes.json()
      console.error('Resend error:', resendErr)
      await supabase.from('invites').delete().eq('token', invite.token)
      return json(
        { error: `Falha ao enviar e-mail: ${resendErr.message ?? 'erro desconhecido'}` },
        500,
        CORS,
      )
    }

    return json({ token: invite.token, email_sent: true }, 200, CORS)

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: (err as Error).message }, 500, CORS)
  }
})
