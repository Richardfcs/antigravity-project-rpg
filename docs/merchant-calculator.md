# Códex de Espólios e Alquimia (Mercado Dinâmico)

## Overview
Integração de uma "Calculadora de Comerciante" ao `equipment-database.html`. O objetivo é agilizar o processo de loot e venda no GURPS, permitindo ao Mestre adicionar itens selecionados do banco de dados a um "carrinho", onde modificadores (ex: estado de conservação, reação do mercador) são aplicados automaticamente. Além disso, a adição de um "Oráculo de Loot" para gerar instantaneamente o conteúdo dos bolsos de inimigos derrotados.

## Project Type
**WEB** - Modificação num arquivo `.html` e `.js` vanilla já existente.

## Success Criteria
- O Mestre pode clicar nos itens exibidos em `equipment-database.html` para adicioná-los à Calculadora.
- A Interface exibe o valor total base e aplica modificadores via botões/toggles (-50% para ferrugem/sangue, -20% para reação do NPC).
- O Oráculo de Loot possui um gerador aleatório que exibe resultados imersivos com 1 clique.
- O tema (Dark Mode feudal) e responsividade para celular do `equipment-database.html` são mantidos intactos.

## Tech Stack
- Frontend: HTML5, CSS Vanilla (variáveis root Dark Mode pré-existentes), JavaScript (DOM puramente isolado para agilidade).
- Dados: Array randomizado e acesso aos objetos carregados pela `weapons-data.js`.

## File Structure
- `equipment-database.html` → Será modificado para receber a UI do Carrinho de Compras / Calculadora de Comerciante flutuante ou painel lateral, além de modais/popups se necessário.
- `js/comerciante-logic.js` (Novo) → Lógica de adição ao carrinho, cálculo com multiplicadores e "Oráculo de Loot".

## Task Breakdown

### 1. Criar UI da Calculadora (Sidebar/Painel)
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Priority**: P1
- **Dependencies**: Nenhuma
- **Input**: `equipment-database.html`
- **Output**: Painel de "Negociação" na tela, botão flotante para abrir no Mobile.
- **Verify**: A UI de negociação não quebra a busca e listagem anterior no desktop/mobile.

### 2. Implementar Oráculo de Loot
- **Agent**: `frontend-specialist` (ou `game-developer` para a lógica dos arrays)
- **Skill**: `clean-code`
- **Priority**: P2
- **Dependencies**: 1
- **Input**: Definição de Arrays com itens de bandidos (Ex: Mon de Cobre, Ofuda sujo, etc).
- **Output**: Botão na UI que escolhe itens aleatoriamente e printa na tela.
- **Verify**: O output reflete "3 Mon de Cobre, 1 Ofuda sujo...".

### 3. Lógica de Seleção de Item e Multiplicadores
- **Agent**: `frontend-specialist`
- **Skill**: `clean-code`
- **Priority**: P1
- **Dependencies**: 1, 2
- **Input**: Clique nos cards da database para adicionar ao array de negociação.
- **Output**: Soma total calculada e botões de `[Sangue/Ferrugem: -50%]` ou `[Mercador Hostil: -20%]`.
- **Verify**: Preços refletem corretamente as divisões/regras de sucata do GURPS.

## Phase X: Verification
- [ ] Verificação de contraste no painel de negociação.
- [ ] Testar interatividade do clique no card x filtro de pesquisa anterior.
- [ ] Linter de JavaScript.
- [ ] Nenhum erro no console ao aplicar desconto e recriar o Loot Aleatório.

---
## ✅ PHASE X COMPLETE
- Lint: [ ] Pendente
- Security: [ ] Pendente
- Build: [ ] Pendente
- Date: [Em progresso]
