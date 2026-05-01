# Daimyo VTT Multiplayer Audit Plan

## Objetivo
Realizar uma auditoria técnica completa na base de código do Daimyo VTT focada na estabilidade, sincronização multijogador (Master vs Player), e validação de permissões e regras de acesso. NENHUM código será alterado, apenas será gerado um relatório de diagnóstico apontando potenciais falhas ou regressões.

## Foco da Auditoria
1. **Sincronização em Tempo Real (Realtime Sync):** Garantir que as atualizações de estado do Mestre sejam refletidas instantaneamente e sem conflitos nas telas dos Jogadores, e vice-versa.
2. **Controle de Acesso Baseado em Papel (RBAC):** Verificar se os jogadores só têm acesso às ações, telas e informações permitidas a eles, e se o Mestre mantém autoridade sobre o gerenciamento da sessão.
3. **Gerenciamento de Estado (State Management):** Analisar stores e hooks (Zustand + Supabase) quanto à prevenção de condições de corrida (race conditions) e desincronização.
4. **Resolução de Combate (GURPS):** Assegurar que os turnos, rolagem de dados, e cálculo de dano respeitem a lógica do GURPS e sincronizem perfeitamente.

## Estratégia de Execução (Fase 2)

A auditoria será dividida e executada em paralelo pelos seguintes agentes especialistas:

### 1. `backend-specialist` (Servidor & Sincronização)
- **Alvo:** `src/app/actions/*`, `src/hooks/use-session-*.ts`
- **Responsabilidade:** Auditar as Server Actions e subscrições do Supabase para garantir que eventos de broadcast (`use-private-events.ts`, presença, chat) não possuam memory leaks, não enviem dados não autorizados a jogadores e tratem reconexões corretamente.

### 2. `security-auditor` (Permissões & RBAC)
- **Alvo:** Middlewares, `session-store.ts`, componentes UI restritos (ex: `MasterShell` vs `PlayerShell`).
- **Responsabilidade:** Garantir que jogadores não possam disparar Server Actions do Mestre (ex: mudar a cena, aprovar dano, etc). Validar isolamento das Sessões.

### 3. `frontend-specialist` (Experiência e Interface)
- **Alvo:** `src/components/*` (ex: `PlayerTurnOverlay`, `MasterTurnOverlay`, `ui-shell-store.ts`).
- **Responsabilidade:** Verificar problemas de UI/UX durante uso simultâneo, avaliar travamentos de layout caso múltiplos eventos ocorram na tela do jogador, e se eles têm à disposição todas as ferramentas que devem usar.

### 4. `test-engineer` (Testes e Execução)
- **Alvo:** Base de Código Geral.
- **Responsabilidade:** Rodar scripts de checagem (ex: `lint_runner.py`, `security_scan.py`) para apontar problemas sistêmicos não cobertos pela análise manual.

## Entregável Final
Um relatório unificado detalhando todas as descobertas:
- **Erros Críticos:** Que quebram o jogo ou permitem cheating por parte dos jogadores.
- **Avisos (Warnings):** Possíveis desincronizações (ex: estados de interface).
- **Problemas de UX:** Falta de feedback visual para o jogador quando o Mestre faz uma ação.
