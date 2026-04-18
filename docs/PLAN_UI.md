# 📜 Plano de Implementação (V2): Correção Visual e Detalhamento de Ficha

Este plano foca na visibilidade do arsenal mobile e no detalhamento de custos para Velocidade Básica na ficha de personagem.

---

## 🎼 Orchestration (Phase 1)

| # | Agent | Focus Area | Status |
|---|---|---|---|
| 1 | `project-planner` | Refinamento do PLAN_UI.md | ✅ |
| 2 | `frontend-specialist` | UI Fix (Mobile FAB) & HTML Character Sheet | ⏳ |
| 3 | `test-engineer` | Verificação de Visual e Ponto | ⏳ |

---

## 📅 Roadmap (Revisado)

### 🥊 Phase 1: Correção do Botão de Espólios (Mobile)
- **Problema:** O botão FAB (⚖️) injetado pelo `merchant-logic.js` some em Portrait no celular.
- **Ações:**
  - Analisar `js/merchant-logic.js`. 
  - Aumentar `z-index` do `.merchant-fab` para `1005` ou `1105`.
  - Revisar se o header do Daimyo (que é sticky) está cobrindo o botão ou se o `right: 24px` está fora da tela em resoluções pequenas (< 400px).
  - Garantir que o botão continue clicável e funcional.

### 📜 Phase 2: Detalhamento de Velocidade Básica (`characters-sheet.html`)
- **Objetivo:** Adicionar informação de custo na "Velocidade Básica".
- **Ações:**
  - Na seção de `🥋 Atributos Primários`, o campo `Vel. Básica` atualmente mostra apenas a fórmula `(DX+HT)/4`.
  - Mudar o label de custo para: `5 pts / +0.25`.
  - Verificar se outras partes da ficha precisam de labels de custo similares para manter a consistência visual "Premium".

### 🧪 Phase 3: Verificação Final
- Testar o layout mobile (Retrato).
- Validar se o personagem continua sendo exportado/salvo corretamente após a alteração no HTML.

---

## 🏁 Critérios de Aceite
- [ ] Botão FAB visível em Portrait no `equipment-database.html`.
- [ ] Label `5 pts / +0.25` presente abaixo de Velocidade Básica.
- [ ] Nenhuma quebra visual no design atual.
