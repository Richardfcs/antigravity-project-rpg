# Revisão e Integração do Fluxo de Combate (Arsenal)

## 1. Problema Identificado
Atualmente, as armas na Ficha Completa e Mediana são meras caixas de texto (`raw.weapon1`, `raw.weapon2`), que são salvas no banco mas **não populam o array oficial `profile.weapons`**. Isso quebra a integração com o *Card de Combate* do Mapa Tático, onde o Mestre tenta selecionar uma arma ativa e o sistema exibe "Sem armas cadastradas". Além disso, características vitais como Qualidade da Arma (enferrujada, balanceada, fina), e Armas Improvisadas não estão bem modeladas no frontend.

## 2. Objetivos da Orquestração
- Garantir a conexão de mão dupla perfeita entre a Ficha (Edição) e o HUD de Combate (Uso).
- Suportar todos os modificadores narrativos e mecânicos de arsenal exigidos pelo usuário.
- Substituir textareas simplistas por um CRUD ágil de Armas compatível com a fluidez do Daimyo VTT.

## 3. Plano de Implementação (Fases)

### Fase 1: Atualização do Modelo (Backend Specialist)
- **`src/types/combat.ts`**: Confirmar se `CharacterWeaponRecord` suporta totalmente os casos de "arma improvisada" (pode ser via categoria ou tag) e modificadores (já possui `quality`, mas precisamos garantir a renderização).

### Fase 2: Componente de Edição do Arsenal (Frontend Specialist)
- **`src/components/panels/character-sheet-modal.tsx`**: 
  - Remover as antigas textareas (`char-weapon-1`).
  - Implementar uma interface limpa onde o Mestre adiciona um `CharacterWeaponRecord`.
  - Campos a incluir no form rápido: `Nome`, `Qualidade` (Enferrujada, Comum, Fina), `Categoria` (Lâmina, Improvisada, etc.), e `Dano Bruto` (`rawDamage`).

### Fase 3: HUD de Combate (Frontend Specialist / Test Engineer)
- **`src/components/combat/combat-sheet-card.tsx`**:
  - Exibir a qualidade da arma (ex: `Katana (Fina)`).
  - Permitir que o Mestre, direto no combate, mude o `estado` da arma (de *ready* para *broken* ou *spent*) se aplicável, ou pelo menos exiba as notas da arma improvisada.

## 4. Agentes a Serem Utilizados (Pós-Aprovação)
- `@backend-specialist`: Para alinhar a interface `combat.ts`.
- `@frontend-specialist`: Para construir o Editor de Arsenal na Ficha.
- `@test-engineer`: Para garantir a verificação estrita via `typecheck:vtt` e revisão de erros de hidratação.

## 5. Perguntas em Aberto para o Mestre
- Você prefere que a criação da arma na ficha seja um formulário minucioso (com vários botões) ou apenas um bloco limpo onde você digita Nome, Dano e Qualidade rapidamente?
- Deseja que a arma tenha "durabilidade" visível ou apenas o campo de "Qualidade/Enferrujada" já basta para você gerenciar na narrativa?
