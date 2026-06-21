import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL     = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
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

serve(async (req) => {
  const origin = req.headers.get('origin')
  const CORS   = corsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { user_id } = await req.json()

    if (!user_id) {
      return json({ error: 'user_id obrigatório.' }, 400, CORS)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Valida que o chamador está autenticado
    const authHeader = req.headers.get('Authorization') ?? ''
    const { data: { user }, error: authErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authErr || !user) return json({ error: 'Não autenticado.' }, 401, CORS)

    // Apenas owner pode excluir usuários
    const { data: callerRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (callerRole?.role !== 'owner') {
      return json({ error: 'Sem permissão. Apenas o dono pode excluir usuários.' }, 403, CORS)
    }

    // Não pode excluir a si mesmo
    if (user_id === user.id) {
      return json({ error: 'Não é possível excluir sua própria conta.' }, 400, CORS)
    }

    // Não pode excluir outro owner
    const { data: targetRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user_id)
      .single()

    if (targetRole?.role === 'owner') {
      return json({ error: 'Não é possível excluir outro administrador.' }, 400, CORS)
    }

    // Exclui do auth.users → CASCADE: profiles → user_roles
    const { error: deleteErr } = await supabase.auth.admin.deleteUser(user_id)
    if (deleteErr) return json({ error: deleteErr.message }, 500, CORS)

    return json({ ok: true }, 200, CORS)

  } catch (err) {
    console.error('Unhandled error:', err)
    return json({ error: (err as Error).message }, 500, CORS)
  }
})
