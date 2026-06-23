# Limpeza da conta administrativa antiga

Na captura existem dois registros com papel `platform_admin`.

Antes de excluir qualquer um, identifique os e-mails:

```sql
select
  au.id,
  au.email,
  coalesce(p.full_name, 'Sem nome') as nome,
  ur.role,
  au.last_sign_in_at
from auth.users au
join public.user_roles ur on ur.user_id = au.id
left join public.profiles p on p.id = au.id
where ur.role = 'platform_admin'
order by au.created_at;
```

Deve permanecer:

```text
contato@andeti.com.br
```

Somente depois de confirmar que o login com `contato@andeti.com.br` funciona, a conta antiga `admin@andeti.com.br` pode ser removida em:

**Supabase → Authentication → Users**

Não remova a conta `contato@andeti.com.br`.
