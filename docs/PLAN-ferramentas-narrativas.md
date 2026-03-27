# PLAN-ferramentas-narrativas

## 1. Contexto
Adicionar três novos módulos ao Escudo do Daimyo para dar mais flexibilidade à narrativa de campanhas *Sandbox*: Anotações em tempo real do mestre, relógios de avanço para ameaças e uma ferramenta simples, porém rápida, para Combate em Massa, respeitando rolagens físicas de dados e o armazenamento local de longo prazo.

## 2. Agentes Designados
- `project-planner`: Coordenação e visão macro (Concluído).
- `frontend-specialist`: Desenho dos modais e Drawers laterais para não quebrar a tela ativa principal, adequando ao tema Feudal.
- `orchestrator/backend-specialist`: Responsável por estruturar a lógica da matemática (Combate) e as persistências no banco do navegador (`localStorage`).

## 3. Divisão de Tarefas (Task Breakdown)

### Fase 1: Atualização Arquitetural e Visual (HTML/CSS)
- [ ] Construir 3 novos ícones na barra de navegação/comandos (Anotações, Relógios, Massa).
- [ ] Injetar a casca modal principal em `index.html` para os Modais de Combate.
- [ ] Criar Componentes do tipo "Drawer" (Abaixo para a esquerda/direita) invisíveis no HTML puro para Notas e Relógios.

### Fase 2: O Motor Narrativo (js/narrative-tools.js)
- [ ] Criar núcleo de persistência em LocalStorage (`saveDraft`, `loadDraft`).
- [ ] Habilitar auto-save dinâmico na *Textarea* do Drawer de Anotação.
- [ ] Sistema de Relógios (Threat Clocks): Permitir "Criar Novo", "Rolar d6", que avança o contador e mostra alertas se o vilão alcançou `MaxEtapas`. 
- [ ] Integrar persistência dos Clocks à função global.

### Fase 3: A Calculadora do General
- [ ] Painel de Combate em Massa: Adicionar campos de Força do atacante/defensor.
- [ ] Campo customizado para "+ Vantagens" e "- Desvantagens" baseadas no cenário livre do Mestre.
- [ ] Campo aberto para "Inserir Rolagem" (dado físico d6+).
- [ ] Função `SimularBatalha()` que processa as diferenças e imprime a mensagem colorida de vitória/baixas.

## 4. Checklist Rápido de Verificação de Qualidade
- [ ] Atualizar ou fechar a aba do navegador **NÃO apaga** as anotações do mestre sobre a campanha.
- [ ] Os Relógios possuem UI intuitiva de se acompanhar e clicar para rolar os avanços na surdina.
- [ ] Nenhuma das ferramentas novas cobre 100% permanente a tela do escudo atual, permitindo *Multitasking*.
