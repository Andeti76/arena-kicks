# Aplicação do `platform_admin`

## Objetivo

Separar a administração técnica da Andeti da propriedade operacional da Arena Kicks:

| Papel | Responsabilidade |
|---|---|
| `platform_admin` | Administrador técnico Andeti |
| `owner` | Dono da Arena Kicks |
| `partner` | Sócio |
| `area_manager` | Responsável de área |

## Ordem de aplicação

### 1. Adicionar o novo papel ao enum

No Supabase, abra **SQL Editor**, crie uma consulta nova e execute sozinho o conteúdo de:

`arena_kicks_migration_v7_step_0_enum.sql`

É necessário aguardar a mensagem de sucesso antes de continuar. O PostgreSQL não permite adicionar um valor ao enum e utilizá-lo dentro da mesma transação.

### 2. Aplicar a migração principal

No Supabase, abra **SQL Editor**, cole todo o conteúdo de:

`arena_kicks_migration_v7_platform_admin.sql`

Execute uma única vez. A operação é transacional: se algo falhar, nenhuma alteração parcial será mantida.

O módulo futuro Escolinha não integra esta migração porque suas tabelas ainda não existem no banco de produção.

### 3. Verificar a conta Andeti

Execute:

```sql
select au.email, ur.role
from auth.users au
join public.user_roles ur on ur.user_id = au.id
where lower(au.email) = 'admin@andeti.com.br';
```

Resultado esperado:

```text
contato@andeti.com.br | platform_admin
```

### 4. Publicar as Edge Functions

Atualize:

- `send-invite`
- `delete-user`

Essas versões aplicam a nova hierarquia no servidor.

### 5. Publicar o frontend

Após publicar o aplicativo, saia e entre novamente com `contato@andeti.com.br` para recarregar o novo papel.

## Fluxo para adicionar Marcus

1. Entrar como `contato@andeti.com.br`.
2. Abrir **Configurações**.
3. Informar o e-mail do Marcus.
4. Escolher **Dono da Arena**.
5. Gerar e enviar o convite.
6. Marcus cria a própria senha.
7. Confirmar que seu papel ficou como `owner`.

## Proteções implementadas

- A interface nunca oferece criação de outro `platform_admin`.
- O dono não pode alterar ou excluir o Administrador Andeti.
- Somente o Administrador Andeti pode convidar, editar ou excluir um `owner`.
- O dono continua podendo administrar sócios e responsáveis de área.
- Escrita direta em `user_roles` foi bloqueada; alterações passam pela RPC protegida.
- Criação de convites passa pela Edge Function protegida.
