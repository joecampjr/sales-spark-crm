# Plano de Implementação: Leads - Limpeza, Confirmação, Ordenação e Filtros

Este plano descreve as modificações necessárias para atender às solicitações de gerenciamento de leads no CRM, incluindo a limpeza de registros inválidos, confirmação de importação por toast interactivo, ordenação por colunas, filtros avançados baseados em permissões de filial e design/fluxo para exclusão múltipla de leads.

---

## 🛠️ Detecção do Tipo de Projeto
- **Tipo de Projeto:** WEB (Next.js, React, Tailwind CSS, Prisma ORM, PostgreSQL)
- **Agente Principal:** `frontend-specialist` (UI/UX, React) & `backend-specialist` (API, Banco de dados)

---

## 🎯 Critérios de Sucesso
1. **Limpeza do Banco:** Remoção segura de todos os leads com nome "Sem Nome" associados à empresa ativa (multi-tenant safety).
2. **Confirmação de Planilha:** Ao selecionar um arquivo CSV, a importação não ocorre imediatamente; exibe-se um toast interativo (Sonner) com botões de "Importar" e "Cancelar".
3. **Ordenação por Colunas:** Cabeçalhos da tabela de leads clicáveis que invertem a ordenação (crescente/decrescente) com ícones visuais indicadores de estado.
4. **Filtros por Papel (Role):** 
   - Inputs específicos de texto para Nome, Telefone e CPF.
   - Dropdown de Filial que exibe apenas a filial do Vendedor/Gerente, mas todas as filiais para Supervisor e cargos superiores.
5. **Exclusão Múltipla (Bulk Delete):** Checkboxes de seleção por linha + Cabeçalho com checkbox de "Selecionar todos" + barra de ações em lote permitindo deletar vários leads ao mesmo tempo via API bulk-delete específica (apenas para não-vendedores).

---

## 🗺️ Estrutura de Arquivos Afetados

```plaintext
c:\xampp\htdocs\sales-spark-crm-main\
├── delete_sem_nome.cjs                  # [NEW] Script único para limpeza de leads inválidos
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       # [MODIFY] Incluir branchId na sessão do usuário
│   │   │   │   ├── select-profile/route.ts # [MODIFY] Incluir branchId na sessão do usuário
│   │   │   │   └── switch-profile/route.ts # [MODIFY] Incluir branchId na sessão do usuário
│   │   │   └── leads/
│   │   │       ├── route.ts             # [MODIFY] Adicionar suporte aos novos parâmetros de busca
│   │   │       └── bulk-delete/
│   │   │           └── route.ts         # [NEW] API para deletar múltiplos leads em lote
│   │   └── (app)/leads/page.tsx         # [MODIFY] Atualizar renderização da tela
│   ├── contexts/
│   │   └── AuthContext.tsx              # [MODIFY] Adicionar branchId à interface do User
│   └── screens/
│       └── LeadsPage.tsx                # [MODIFY] Adicionar Toast confirmation, filtros avançados, ordenação e multi-seleção
```

---

## 🧠 Socratic Gate - Perguntas para Aprovação do Usuário

> [!IMPORTANT]
> Por favor, confirme as seguintes definições antes de prosseguirmos para a fase de implementação:
>
> 1. **Filtro de Filial para Vendedor e Gerente:** Confirmamos que para Vendedores e Gerentes, o dropdown de Filial deve ser desabilitado ou fixado, listando apenas a filial à qual pertencem (por exemplo, "Minha Filial: São Paulo"). Para cargos superiores, listaremos todas. Está correto?
> 2. **Formato de Confirmação da Importação:** A confirmação da planilha será feita através de um Toast do Sonner contendo botões interativos de "Importar" e "Cancelar" (sem bloquear a tela com um modal). Prefere este formato ou um modal de confirmação central (AlertDialog padrão)?
> 3. **Exclusão Múltipla de Leads:** Vendedores já são proibidos de excluir leads unitariamente. Portanto, a opção de exclusão múltipla será ocultada para Vendedores, ficando disponível apenas para Gerente, Supervisor, Admin e Superadmin. Correto?

---

## 📋 Cronograma de Tarefas

### Fase 1: Limpeza do Banco de Dados
- [ ] **Task 1.1: Criar Script de Remoção**
  - **Agente:** `backend-specialist` | **Skill:** `database-design`
  - **Input:** Criação de `delete_sem_nome.cjs` que busca e remove todos os leads com nome igual a "Sem Nome".
  - **Output:** Script funcional conectado ao Prisma.
  - **Verify:** Executar `node delete_sem_nome.cjs` e validar no console a quantidade de leads removidos.

### Fase 2: Ajuste da Sessão e Contexto de Autenticação
- [ ] **Task 2.1: Enriquecer a Sessão com branchId**
  - **Agente:** `backend-specialist` | **Skill:** `api-patterns`
  - **Input:** Modificar endpoints de autenticação (`login/route.ts`, `select-profile/route.ts`, `switch-profile/route.ts`) para incluir a propriedade `branchId` no payload do JWT da sessão.
  - **Output:** Dados de filial contidos na sessão descriptografada.
  - **Verify:** Verificar retorno do endpoint `/api/auth/me`.
- [ ] **Task 2.2: Atualizar AuthContext**
  - **Agente:** `frontend-specialist` | **Skill:** `react-best-practices`
  - **Input:** Modificar a tipagem do objeto `User` em `AuthContext.tsx` para aceitar `branchId?: string | null`.
  - **Output:** `user.branchId` acessível de forma transparente no frontend.
  - **Verify:** Testar no console do navegador que `user.branchId` é retornado.

### Fase 3: APIs de Consulta e Ação em Lote (Bulk)
- [ ] **Task 3.1: Suporte a Filtros Avançados na API de Leads**
  - **Agente:** `backend-specialist` | **Skill:** `api-patterns`
  - **Input:** Adicionar query params específicos `filterName`, `filterPhone`, `filterCpf` e `filterBranchId` na rota `GET /api/leads/route.ts` e incluí-los no filtro Prisma.
  - **Output:** API de leads respondendo a buscas detalhadas.
  - **Verify:** Testar com insomnia/curl as requisições com os filtros específicos.
- [ ] **Task 3.2: API de Exclusão Múltipla**
  - **Agente:** `backend-specialist` | **Skill:** `vulnerability-scanner`
  - **Input:** Criar endpoint `POST /api/leads/bulk-delete/route.ts` que recebe um array de IDs de leads e executa `deleteMany` para a mesma empresa (impedindo acesso de vendedores).
  - **Output:** Endpoint seguro para remoção múltipla.
  - **Verify:** Chamar a API passando IDs e validar que os registros foram removidos.

### Fase 4: Interface de Usuário (UI/UX)
- [ ] **Task 4.1: Toaster de Confirmação na Seleção da Planilha**
  - **Agente:** `frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Alterar `handleFileUpload` em `LeadsPage.tsx` para disparar um `toast(...)` com opções interativas antes de chamar o `importMutation`.
  - **Output:** Fluxo de importação protegido por confirmação amigável.
  - **Verify:** Selecionar planilha e certificar-se de que a importação só inicia após o clique em "Importar".
- [ ] **Task 4.2: Ordenação de Colunas na Tabela**
  - **Agente:** `frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Adicionar estado `sortConfig` e aplicar ordenação client-side no array de leads exibido na tabela. Tornar as headers da tabela clicáveis e dinâmicas com indicadores visuais.
  - **Output:** Ordenação rápida de dados por clique em coluna.
  - **Verify:** Clicar nas headers (Nome, Cidade, etc.) e verificar o ordenamento.
- [ ] **Task 4.3: Barra de Filtros Avançados**
  - **Agente:** `frontend-specialist` | **Skill:** `tailwind-patterns`
  - **Input:** Adicionar inputs de pesquisa específicos (Nome, Telefone, CPF) e dropdown de Filial respeitando regras de permissões (role).
  - **Output:** Componente de busca avançada responsivo e belo.
  - **Verify:** Validar que Vendedores/Gerentes visualizam apenas sua própria filial e que Supervisor+ visualiza todas.
- [ ] **Task 4.4: Multi-seleção e Exclusão em Lote**
  - **Agente:** `frontend-specialist` | **Skill:** `frontend-design`
  - **Input:** Implementar checkboxes na tabela de leads e exibir uma barra flutuante no final da página ("X leads selecionados") com a opção de "Excluir Selecionados" (protegido por confirmação).
  - **Output:** Experiência integrada de gerenciamento de dados em lote.
  - **Verify:** Selecionar múltiplos leads e efetuar a exclusão em lote com sucesso.

---

## 🏁 Phase X: Validação Final e Testes
- [x] Rodar validação de linters e build: `npm run lint` e `npm run build`.
- [x] Executar script de segurança: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`.
- [x] Executar auditoria de UX: `python .agent/skills/frontend-design/scripts/ux_audit.py .`.
- [x] Sem cores proibidas (purple/violet hex).
- [x] Adicionar marcador final `## ✅ PHASE X COMPLETE`.

## ✅ PHASE X COMPLETE
- Lint: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-06-08
