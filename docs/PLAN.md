# Plano de Correção: Daimyo VTT Combat Bugs

Este plano detalha as correções para os erros de tipagem e lógica encontrados no módulo de combate do Daimyo VTT.

## 🛠️ Problemas Identificados

1.  **`player-turn-overlay.tsx`**:
    *   **Acesso Inválido**: Tentativa de acessar `token.token.character` em vez de `token.character`.
    *   **Incompatibilidade de Contrato**: O objeto enviado para `onExecute` não possui propriedades obrigatórias da interface `CombatDraftAction` (`weaponId`, `weaponModeId`, `techniqueId`, `hitLocation` no nível superior).
2.  **`flow.ts`**:
    *   **Erro de Set**: O `Set<FeintType>` está sendo inicializado com strings (`"basic"`, `"beat"`, `"mental"`) que não existem no tipo `FeintType` (`"dx"`, `"st"`, `"iq"`).
3.  **`globals.css`**:
    *   **Avisos de Linter**: Avisos de `@apply` desconhecido (comum em Tailwind v4 quando a IDE não está configurada).

## 📋 Plano de Ação

### Fase 1: Correção de Tipos e Lógica (Core)

1.  **`apps/daimyo-vtt/src/components/combat/player-turn-overlay.tsx`**:
    *   Corrigir o acesso ao perfil do personagem para `token.character?.sheetProfile`.
    *   Atualizar a função `handleConfirm` para incluir todos os campos obrigatórios de `CombatDraftAction`.
    *   Garantir que `hitLocation` seja passado tanto no nível superior quanto dentro de `modifiers`.

2.  **`apps/daimyo-vtt/src/lib/combat/flow.ts`**:
    *   Corrigir a inicialização do `Set<FeintType>` para usar as chaves corretas: `"dx"`, `"st"`, `"iq"`.

### Fase 2: Estabilização de Estilos

1.  **`apps/daimyo-vtt/src/styles/globals.css`**:
    *   Confirmar que os avisos são apenas de linter e não afetam a funcionalidade. Como o projeto usa Tailwind v4, a sintaxe está correta.

### Fase 3: Verificação

1.  Executar o script de lint para garantir que não restam erros.
2.  Executar o typecheck (`npm run typecheck`).

## 👥 Agentes Envolvidos

*   `@[frontend-specialist]`: Responsável pelas correções no componente React e CSS.
*   `@[backend-specialist]`: Responsável pela correção na lógica de normalização do fluxo de combate.
*   `@[test-engineer]`: Responsável por rodar os scripts de verificação (lint/typecheck).

---

Aprovas este plano para prosseguirmos com a implementação?
