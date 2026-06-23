-- ============================================================
-- Arena Kicks — Migração v7.2
-- Ocultar administradores técnicos dos usuários da Arena
-- ============================================================

begin;

drop policy if exists "ur_read" on public.user_roles;

create policy "ur_read" on public.user_roles
for select
using (
  -- Todo usuário autenticado precisa ler o próprio papel para entrar no app.
  user_id = auth.uid()

  -- Administrador Andeti enxerga todos os perfis.
  or public.my_role() = 'platform_admin'

  -- Dono e sócios enxergam apenas a equipe da Arena.
  or (
    public.my_role() in ('owner', 'partner')
    and role <> 'platform_admin'
  )
);

commit;

-- Teste esperado:
-- platform_admin: enxerga platform_admin, owner, partner e area_manager.
-- owner/partner: enxerga owner, partner e area_manager.
-- area_manager: enxerga somente o próprio papel.
