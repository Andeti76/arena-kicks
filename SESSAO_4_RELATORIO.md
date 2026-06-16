# SESSAO 4 — RELATÓRIO DE SESSÃO
**Arena Kicks Jacareí — Sistema de Conciliação**
**Data:** 15/06/2026
**Desenvolvedor:** Anderson (AndEti)

---

## O QUE ACONTECEU NESTA SESSÃO

### 1. Descoberta do escopo real (pivô de produto)
Após conversa com Marcus (dono da Arena Kicks), ficou claro que o sistema original estava **superdimensionado**. Marcus não quer um sistema de gestão completo — ele quer um sistema de **conciliação diária e controle financeiro**.

### 2. Respostas do Marcus (roteiro de entrevista)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Fluxo atual | Gerente envia relatório diário do sistema + maquininha. Marcus confere dinheiro/cartão/pix |
| 2 | Tempo gasto | ~4 horas/mês no fechamento do balanço |
| 3 | Já teve problema? | Sim |
| 4 | Quem manda relatório | Escolinha e Bar em Excel, Estacionamento e Quadras Society em planilha Excel diária |
| 5 | Nível de detalhe | Por sub-área e por evento (ex: Quadras de Areia → Campeonato de Vôlei com receita e despesa própria) |
| 6 | Comparar meses? | Sim, comparação mês a mês |
| 7 | Como registra despesas | Gera comprovante → WhatsApp → planilha na reunião de segunda |
| 8 | Rateio de despesas gerais | Sim, entre as áreas |
| 9 | Como quer usar o app | Digita os totais manualmente no app |
| 10 | Usuários | Marcus + 1 (sócio/parceiro) |
| 11 | Guardar arquivos? | Não, só os números |
| 12 | Relatórios | Sim, para sócio e contador |

---

## DECISÕES TOMADAS

### Escopo do produto redefinido

**O app faz:**
- Conciliação diária por área (sistema vs maquininha vs dinheiro físico)
- Alerta visual de discrepâncias
- Sub-áreas dentro de Society (Quadras de Areia, Quadras Society, Churrasqueira)
- Eventos dentro de sub-áreas com receita e despesa própria
- Lançamento de despesas (substitui planilha de segunda-feira)
- Rateio de despesas gerais entre áreas
- DRE mensal com comparação mês a mês
- Relatório exportável (PDF/Excel) para sócio e contador

**O app NÃO faz:**
- Armazenar PDFs ou fotos
- Importar relatórios automaticamente
- Gestão de alunos/mensalidades (Escolinha tem sistema próprio)
- Gestão de estoque do bar (MIP faz isso)

---

## SCHEMA v3 (novo banco de dados)

### Tabelas

| Tabela | Função |
|--------|--------|
| `cost_centers` | Bar, Escolinha, Society, Estacionamento |
| `sub_areas` | Quadras de Areia, Quadras Society, Churrasqueira (dentro de Society) |
| `events` | Campeonato de Vôlei, etc. (dentro de sub-área) |
| `event_transactions` | Receita/despesa de um evento específico |
| `daily_reports` | Conciliação diária: valores sistema vs maquininha vs dinheiro físico |
| `expenses` | Despesas manuais (substitui planilha) |
| `expense_allocations` | Rateio de despesas gerais |
| `expense_categories` | Aluguel, energia, salários, etc. |
| `profiles` | Usuários (mantida do v2) |
| `user_roles` | Roles: owner, partner, area_manager (mantida do v2) |
| `invites` | Convites por e-mail (mantida do v2) |

### Tabelas REMOVIDAS (v1/v2)
- `transactions` — substituída por `daily_reports` + `expenses`
- `transaction_allocations` — substituída por `expense_allocations`
- `categories` — substituída por `expense_categories`
- `students`, `enrollments`, `monthly_fees`, `modalities` — fora do escopo

### Trigger importante
`trg_reconciliation_status`: ao salvar um `daily_report`, calcula automaticamente se os valores batem (status = 'ok') ou há diferença (status = 'discrepancy').

---

## DEMO CRIADO (demo-conciliacao.html)

Arquivo HTML completo com 5 telas interativas:
1. **Dashboard** — KPIs do mês, status por área, gráfico de rosca por receita
2. **Conciliação do Bar** — importar relatório + fechamento da maquininha + ver diferenças
3. **Conciliação da Escolinha** — histórico de fechamentos, status OK
4. **Lançar Despesa** — formulário substituindo a planilha de segunda
5. **DRE** — consolidado + barras por área (receita vs despesa vs resultado)

**Localização:** `E:\Arena Kicks\demo-conciliacao.html`

**Como abrir no celular:** subir no Vercel como `index.html` e mandar o link pro Marcus.

---

## STACK MANTIDA

- **Frontend:** React + Vite + Tailwind (já configurado)
- **Banco:** Supabase (projeto "Kicks Project" já criado)
- **Hospedagem:** Vercel (repositório Andeti76/arena-kicks já criado)
- **Auth:** Supabase Auth com convites por e-mail

---

## PRÓXIMOS PASSOS (para Sessão 5)

### Prioridade Alta
1. **Rodar schema v3 no Supabase** — arquivo `arena_kicks_schema_v3.sql`
2. **Refatorar App.jsx** — novas rotas: `/conciliacao`, `/despesas`, `/eventos`
3. **Construir tela de Conciliação Diária** — formulário de entrada + status automático
4. **Construir tela de Despesas** — formulário + lista por semana

### Prioridade Média
5. Construir tela de Sub-Áreas/Eventos
6. Atualizar DRE para usar `daily_reports` + `expenses`
7. Comparativo mês a mês no DRE

### Prioridade Baixa
8. Exportar relatório PDF/Excel para contador
9. Tela de Configurações (usuários + convites)
10. Deploy final no Vercel

---

## ARQUIVOS DO PROJETO

| Arquivo | Status | Localização |
|---------|--------|-------------|
| `arena_kicks_schema_v3.sql` | ✅ Pronto | `E:\Arena Kicks\` |
| `demo-conciliacao.html` | ✅ Pronto | `E:\Arena Kicks\` |
| `SESSAO_4_RELATORIO.md` | ✅ Pronto | `E:\Arena Kicks\` |
| `src/` (React app) | ⚠️ Precisa refatorar | `E:\Arena Kicks\src\` |

---

## INSTRUÇÃO PARA PRÓXIMA SESSÃO

1. Leia este relatório primeiro
2. Pergunte ao Anderson se o Marcus aprovou o demo
3. Se aprovado: rodar `arena_kicks_schema_v3.sql` no Supabase (SQL Editor)
4. Depois: refatorar o React app começando pela tela de Conciliação Diária
5. Referência do projeto: `github.com/Andeti76/arena-kicks`
