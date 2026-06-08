# Plano de Implementação: Novos Campos no Cadastro de Leads (Rota e Última Compra)

Este plano detalha a inclusão dos campos **Rota** e **Data da última compra** no modelo de Lead, garantindo que não haja perda de dados, integrando-os na importação, nos formulários de criação/edição e no detalhamento do lead, além de atualizar automaticamente a data da última compra quando o status for alterado para "Vendido".

---

## 🛠️ Detecção do Tipo de Projeto
- **Tipo de Projeto:** WEB (Next.js, React, Tailwind CSS, Prisma ORM, PostgreSQL)
- **Agente Principal:** `database-architect` (Migração e Schema), `backend-specialist` (APIs) & `frontend-specialist` (UI/UX)

---

## 🎯 Critérios de Sucesso
1. **Preservação de Dados:** Alteração do banco de dados sem perda de registros existentes (colunas nullable).
2. **Cadastro e Edição Manual:** Inputs na UI para preenchimento de Rota (texto) e Data da última compra (data/calendário).
3. **Atualização Automática:** Ao marcar um lead como "Vendido" (tanto no formulário de criação quanto na edição), a data da última compra deve ser atualizada automaticamente para o dia atual no backend.
4. **Importação via Planilha (CSV):** Mapeamento e suporte às colunas "Rota" e "Data da última compra" no parser do CSV e no processamento da API de importação.
5. **Visualização:** Exibição dos novos campos nas informações gerais do lead na gaveta de histórico/detalhes.

---

## 🗺️ Estrutura de Arquivos Afetados

```plaintext
c:\xampp\htdocs\sales-spark-crm-main\
├── prisma/
│   └── schema.prisma                    # [MODIFY] Adicionar 'route' e 'lastPurchaseDate' ao modelo Lead
├── src/
│   ├── app/
│   │   └── api/
│   │       └── leads/
│   │           ├── route.ts             # [MODIFY] Suporte a 'route' e 'lastPurchaseDate' na criação e validação Zod
│   │           ├── [id]/route.ts        # [MODIFY] Suporte a 'route' e 'lastPurchaseDate' na edição e validação Zod
│   │           └── import/route.ts      # [MODIFY] Parser e persistência dos novos campos no upload CSV
│   └── screens/
│       └── LeadsPage.tsx                # [MODIFY] Inputs nos modais de criação/edição e exibição dos detalhes
```

---

## 🧠 Socratic Gate - Perguntas para Aprovação do Usuário

> [!IMPORTANT]
> Por favor, valide os seguintes pontos antes do início da implementação:
>
> 1. **Comportamento da Data da Última Compra na Importação:** Se a planilha CSV possuir o status "Vendido", mas a coluna "Data da última compra" estiver em branco, devemos definir automaticamente a data atual ou deixá-la nula? (Propomos preencher com a data atual).
> 2. **Formato do Input de Data de Última Compra:** Para o preenchimento manual da data da última compra nos formulários, prefere um input padrão do tipo date (`type="date"`) ou um calendário customizado? (O input padrão `type="date"` é mais robusto e responsivo em navegadores móveis e desktop).

---

## 📋 Cronograma de Tarefas

### Fase 1: Banco de Dados e Migração
- [ ] **Task 1.1: Atualizar schema.prisma**
  - **Agente:** `database-architect` | **Skill:** `prisma-expert`
  - **Input:** Adicionar `route String?` e `lastPurchaseDate DateTime?` ao model `Lead` em `prisma/schema.prisma`.
  - **Output:** Schema atualizado.
  - **Verify:** Rodar `npx prisma validate` para checar sintaxe.
- [ ] **Task 1.2: Criar e Executar Migração**
  - **Agente:** `database-architect` | **Skill:** `database-design`
  - **Input:** Executar a migração do Prisma no banco de dados.
  - **Output:** Banco PostgreSQL sincronizado.
  - **Verify:** Executar `npx prisma migrate dev --name add_route_and_last_purchase_date`. Confirmar que nenhuma tabela existente foi apagada.

### Fase 2: Backend e Validação das APIs
- [ ] **Task 2.1: Atualizar API de Leads (POST/GET)**
  - **Agente:** `backend-specialist` | **Skill:** `api-patterns`
  - **Input:** Atualizar schemas de validação do Zod em `src/app/api/leads/route.ts` para receber `route` e `lastPurchaseDate`. No POST, se `status === 'vendido'`, forçar `lastPurchaseDate` para a data atual.
  - **Output:** API de criação aceitando os novos campos.
  - **Verify:** Chamar a API e verificar a persistência.
- [ ] **Task 2.2: Atualizar API de Edição (PATCH)**
  - **Agente:** `backend-specialist` | **Skill:** `api-patterns`
  - **Input:** Atualizar `src/app/api/leads/[id]/route.ts` para validar e salvar `route` e `lastPurchaseDate`. Se `status === 'vendido'`, atualizar a data de compra para a data atual.
  - **Output:** API de edição salvando e atualizando dados dinamicamente.
- [ ] **Task 2.3: Atualizar API de Importação (CSV)**
  - **Agente:** `backend-specialist` | **Skill:** `nodejs-best-practices`
  - **Input:** Ajustar `src/app/api/leads/import/route.ts` para parsear as colunas "Rota" e "Data da última compra" e persistir no banco de dados.
  - **Output:** Importador com suporte às novas colunas.

### Fase 3: Frontend e UI/UX
- [ ] **Task 3.1: Adicionar Inputs no Formulário de Novo Lead**
  - **Agente:** `frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Inserir campos "Rota" (texto) e "Data da última compra" (data) no dialog de criação de lead.
  - **Output:** Formulário estendido.
- [ ] **Task 3.2: Adicionar Inputs no Formulário de Edição**
  - **Agente:** `frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Inserir os mesmos campos no dialog de edição de lead, carregando os valores pré-existentes.
  - **Output:** Formulário de edição estendido.
- [ ] **Task 3.3: Exibição no Histórico/Detalhes do Cliente**
  - **Agente:** `frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Na gaveta lateral de detalhes (Sheet), adicionar uma seção de metadados listando "Rota" e "Data da última compra" formatada (`DD/MM/AAAA`).
  - **Output:** Visualização de informações complementada.
- [ ] **Task 3.4: Suporte à Leitura de CSV no Frontend**
  - **Agente:** `frontend-specialist` | **Skill:** `react-best-practices`
  - **Input:** Mapear os campos no Papa.parse em `LeadsPage.tsx` para passar os dados de Rota e Última Compra do CSV para o payload da API.
  - **Output:** Parser integrado.

---

## 🏁 Phase X: Validação Final e Testes
- [ ] Rodar validação de linters e build: `npm run lint` e `npm run build`.
- [ ] Executar script de segurança e UX audits.
- [ ] Adicionar marcador final `## ✅ PHASE X COMPLETE`.
