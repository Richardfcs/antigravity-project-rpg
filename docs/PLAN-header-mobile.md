# PLAN-header-mobile

## 1. Visão Geral
Transformar o sistema de navegação (Header Base) do *Escudo do Daimyo* em uma estrutura inteiramente responsiva "Mobile-First", garantida acessibilidade visual, alvos de toque maiores, e cessando a quebra bizarra de componentes quando usado no espaço ínfimo de um smartphone. 
Atacaremos de forma simultânea a sustentabilidade técnica do aplicativo: adotaremos um padrão moderno de **Componente Injetável**, isolando a complexa estrutura HTML do Header em um arquivo mestre que reflete suas mudanças por todas as abas das planilhas.

## 2. Agentes Designados
- `project-planner`: Coordena injeção em massa, checa a integridade das chamadas entre as páginas HTML. (Fase do planejamento rodando agora).
- `frontend-specialist`: Vai esculpir o delicado CSS do novíssimo botão *"Hambúrguer Menu (☰)"* com o painel deslizável off-canvas que ocultará todos os ícones da navegação no formato celular minimalista.

## 3. Divisão de Tarefas (Task Breakdown)

### Fase 1: Padronização e Componentização Global (DRY)
- [ ] Criar o controlador lógico `js/header-loader.js` que formata um painel padronizado exportado para HTML.
- [ ] Elaborar regra dentro do script que reconhece o `.html` em exibição e colore as abas para Dourado/Ativo com sucesso automático.
- [ ] Executar substituição: Deletar a `<header class="header">` dos 7 arquivos vitais (`index.html`, `library.html`, `equipment.html`, `oracle.html`, `time.html`, `combat.html`, `kegare.html`) colocando o ponto âncora `id="daimyo-header">` neles.

### Fase 2: Polimento Mobile-First
- [ ] Ocultar lista massiva de abas da header com `@media max-width: 900px`.
- [ ] Montar painel esticado em gaveta de "Navegação Móvel" (100vw Width com lista vertical ampla).
- [ ] Adicionar um bloqueio dinâmico para garantir que a rolagem lateral esteja proibida (`overflow-x: hidden`) matando arrastos esquisitos no touch device.

### Fase 3: Acessibilidade & Integração Contínua
- [ ] Aplicar no novo CSS base *Touch Targets* que atendem ao patamar (min 44px) para as ancoras das páginas e os acionadores Narrativos (`btn-ghost`).
- [ ] Confirmar que os gatilhos das funcionalidades criadas no escopo passado (`NarrativeTools.toggleDrawer()`) não foram corrompidas e reagem perfeitamente no novo teto limpo injetado.

## 4. Checklist Rápido de Verificação de Qualidade
- [ ] No celular, as tabelas laterais esbarram umas nas outras sem formatação de parágrafo? **(Deve estar limpo)**.
- [ ] Trocando de Aba (ex: de Oráculos para Combate) o botão fica sublinhado e as anotações secretas continuam acessíveis nos Drawers acima?
- [ ] O Header carregado rebitado num celular realmente oculta todos as dezenas de utilitários em favor de 1 único Botão Hambúrguer?
