# Snapshot — Arena Kicks pré-entrega ao Marcus

Data: 23 de junho de 2026  
Estado: versão alinhada e pronta para entrada do proprietário  
Aplicação: https://arena-kicks.vercel.app/

## Estado funcional preservado

- Dashboard financeiro e operacional.
- Conciliação diária.
- Despesas e rateios por centro de custo.
- Subáreas e desempenho operacional.
- Patrocinadores e pagamentos.
- DRE e exportações.
- Usuários, convites e permissões.
- Interface responsiva desktop e celular.
- PWA e publicação pela Vercel.

## Hierarquia de acesso

| Papel | Responsabilidade |
|---|---|
| `platform_admin` | Administração técnica da Andeti |
| `owner` | Proprietário da Arena Kicks |
| `partner` | Sócio |
| `area_manager` | Responsável de área |

## Segurança e administração

- `contato@andeti.com.br` confirmado como `platform_admin`.
- Somente a Andeti pode convidar, editar ou excluir um `owner`.
- O proprietário administra sócios e responsáveis de área.
- Administradores Andeti ficam ocultos para usuários da Arena.
- Escrita direta de papéis foi bloqueada pelas políticas do banco.
- Edge Functions `send-invite` e `delete-user` publicadas no Supabase.
- Migração de ocultação `v7.2` aplicada com sucesso.

## Validação técnica

- Build de produção executado com sucesso em 23 de junho de 2026.
- Nenhuma alteração rastreada pendente antes deste snapshot.
- Aviso conhecido e não bloqueante: bundle JavaScript principal acima de 500 kB.

## Passos finais da entrega

1. Marcus aprova a versão.
2. Andeti envia convite com perfil **Dono da Arena**.
3. Marcus cria a própria senha e testa o acesso.
4. Confirmar no banco que Marcus recebeu `owner`.
5. Somente depois remover `teste@arenakicks.com`.
6. Manter `contato@andeti.com.br` como único `platform_admin`.

## Recuperação

O ZIP associado a este documento contém somente arquivos registrados no Git, sem:

- `node_modules`;
- credenciais locais;
- arquivos temporários;
- prévias externas;
- builds locais.
