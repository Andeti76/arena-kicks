-- ============================================================
-- Arena Kicks — Correção v7.1
-- Administrador Andeti com endereço de e-mail real
-- ============================================================
--
-- PRÉ-REQUISITO:
-- Em Authentication > Users, altere o e-mail do usuário existente
-- admin@andeti.com.br para contato@andeti.com.br.
-- Não crie outro usuário: preserve o mesmo UUID.

begin;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = 'contato@andeti.com.br'
  limit 1;

  if v_user_id is null then
    raise exception 'contato@andeti.com.br não existe em Authentication > Users.';
  end if;

  insert into public.profiles (id, full_name)
  values (v_user_id, 'Andeti')
  on conflict (id) do nothing;

  update public.user_roles
  set role = 'platform_admin',
      cost_center_id = null
  where user_id = v_user_id;

  if not found then
    insert into public.user_roles (user_id, role, cost_center_id)
    values (v_user_id, 'platform_admin', null);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from auth.users au
    join public.user_roles ur on ur.user_id = au.id
    where lower(au.email) = 'contato@andeti.com.br'
      and ur.role = 'platform_admin'
  ) then
    raise exception 'contato@andeti.com.br não foi encontrado como usuário do aplicativo.';
  end if;
end;
$$;

commit;

-- Verificação:
-- select au.id, au.email, ur.role
-- from auth.users au
-- join public.user_roles ur on ur.user_id = au.id
-- where ur.role = 'platform_admin';
