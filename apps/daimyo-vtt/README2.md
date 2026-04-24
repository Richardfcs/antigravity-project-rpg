# Daimyo VTT

Guia central da app `apps/daimyo-vtt`.

Este arquivo existe para concentrar a visao pratica da mesa ao vivo: o que a app faz, como ela esta organizada, quais fluxos existem, como o banco entra na historia e onde mexer quando for evoluir a mesa.

## O que esta app e

O `Daimyo VTT` e a mesa ao vivo do ecossistema.

Ele nao tenta ser um VTT generico de tudo. A direcao da app hoje e:

- `teatro` para cena narrativa
- `campo tatico` para confronto
- `atlas/wiki` para exploracao e revelacao
- `trilhas`, `efeitos`, `chat`, `dados`, `notas` e `memoria` como apoio de sessao
- `mestre` e `jogador` com shells distintos
- `realtime` e persistencia em Supabase

O projeto base HTML/CSS/JS fora desta pasta continua como oficina offline e referencia de densidade visual, consulta e preparo. O `daimyo-vtt` e o runtime de sessao.

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`
- `Zustand`
- `Supabase`
- `Cloudinary`

## Estrutura da app

### Raiz da app

- `src/app`
  rotas, layouts, tela inicial, API routes internas e server actions
- `src/components`
  shells, estagios, paineis, layout primitives e componentes visuais
- `src/hooks`
  sincronizacao com a sessao, bootstrap e slices de realtime
- `src/lib`
  repositorios, seletores, contratos, infraestrutura e regras de dominio
- `src/stores`
  estado client-side por dominio
- `src/styles`
  estilo global e tokens visuais
- `src/types`
  contratos da mesa, viewer, snapshot, biblioteca, audio, atlas, notas etc.
- `supabase/migrations`
  schema incremental da mesa
- `docs`
  notas operacionais e planos complementares

## Rotas principais

### Home

Arquivo:

- `C:\Users\richa\Documents\Programação 2026.1\antigravity-project\apps\daimyo-vtt\src\app\page.tsx`

Fluxo atual:

1. usuario entra ou cria conta
2. depois ve `minhas mesas`
3. pode entrar numa mesa existente
4. pode abrir a tela separada de `criar ou entrar`

### Sessao do mestre

- `src/app/session/[code]/gm/page.tsx`

Carrega o bootstrap da sessao, valida o viewer e monta o shell do mestre.

### Sessao do jogador

- `src/app/session/[code]/player/page.tsx`

Carrega a mesma base de sessao, mas com shell mais enxuto. Se o participante foi removido da mesa, a rota redireciona de volta ao lobby.

## Shells

### Mestre

Arquivo central:

- `src/components/shell/master-shell.tsx`

Responsabilidades:

- top bar da sessao
- troca entre `preparacao` e `sessao ao vivo`
- troca de modo do palco
- abrir `biblioteca`
- abrir `apoio`
- montar `stage panel`, drawer lateral e tray inferior

Hoje a direcao do shell do mestre e `stage-first`:

- topo curto
- palco dominante
- biblioteca sob demanda
- apoio inferior

### Jogador

Arquivo central:

- `src/components/shell/player-shell.tsx`

Responsabilidades:

- manter o palco como foco
- abrir ficha/wiki/chat/caderno sem tirar a pessoa da mesa
- seguir mestre ou entrar em leitura livre
- priorizar mobile primeiro

## Modos de palco

O snapshot da sessao trabalha com modos claros de exibicao.

### 1. Teatro

Arquivos centrais:

- `src/components/stage/theater-stage.tsx`
- `src/lib/scenes`

Uso:

- fundos narrativos
- elenco em cena
- destaque e formacao
- atmosfera mais contemplativa

### 2. Campo tatico

Arquivos centrais:

- `src/components/stage/tactical-map-stage.tsx`
- `src/lib/maps`

Uso:

- batalha
- tokens
- faccoes
- status
- iniciativa
- recursos rapidos

Observacao:

- o fullscreen/imersivo do tatico deve favorecer o mapa
- iniciativa e detalhes entram como drawers/gavetas, nao como colunas fixas roubando o mapa

### 3. Atlas / Wiki

Arquivos centrais:

- `src/components/stage/atlas-stage.tsx`
- `src/lib/atlas`

Uso:

- mapa-mundi e submapas
- pins
- revelacao de nome
- revelacao de detalhes
- pistas
- historico de revelacao

Observacao:

- o atlas precisa mostrar o mapa primeiro
- detalhes de local entram como gaveta, nao como bloco fixo ocupando metade do palco

### 4. Biblioteca

A biblioteca do mestre hoje tambem pode assumir a area principal em `preparacao`, em vez de ficar sempre comprimida na lateral.

Arquivos centrais:

- `src/components/panels/explorer-panel.tsx`
- `src/stores/ui-shell-store.ts`

## Biblioteca

A biblioteca concentra a maior parte do preparo do mestre.

Secoes atuais:

- `Cenas`
- `Campos`
- `Oficina`
- `Notas`
- `Fichas`
- `Atlas`
- `Efeitos`
- `Dominio`
- `Trilhas`
- `Conversa`

Direcao de UX:

- lista compacta
- busca
- filtros curtos
- ordenacao
- criacao recolhida por padrao
- detalhes abertos sob demanda

Nao e recomendado deixar:

- lista + estatisticas + formulario + detalhes todos abertos ao mesmo tempo

## Apoio

O apoio e a area secundaria da mesa.

Arquivo central:

- `src/components/panels/bottom-dock.tsx`

Abas principais:

- `Conversa`
- `Dados`
- `Caderno`
- `Trilhas`

Direcao:

- apoio precisa ser compacto
- deve ter scroll proprio
- nao deve disputar protagonismo com o palco

## Layout primitives

Arquivos importantes:

- `src/components/layout/app-top-bar.tsx`
- `src/components/layout/app-drawer.tsx`
- `src/components/layout/app-tray.tsx`
- `src/components/layout/compact-panel-header.tsx`
- `src/components/layout/section-action-row.tsx`

Esses componentes definem a linguagem de shell da app:

- top bar curta
- drawer lateral
- tray inferior
- headers compactos

Se o frontend quebrar em densidade ou consistencia, esses arquivos devem ser revisados primeiro.

## Estado client-side

As stores estao em `src/stores`.

Principais:

- `scene-store.ts`
- `map-store.ts`
- `atlas-store.ts`
- `audio-store.ts`
- `chat-store.ts`
- `character-store.ts`
- `effect-layer-store.ts`
- `session-note-store.ts`
- `session-memory-store.ts`
- `library-organization-store.ts`
- `ui-shell-store.ts`

Uso pratico:

- stores guardam o estado vivo do client
- actions e hooks sincronizam esse estado com o servidor e o realtime

## Hooks

Os hooks em `src/hooks` conectam a app a sessao real.

Em geral eles fazem uma combinacao de:

- bootstrap inicial
- subscribe realtime
- fallback degradado
- hydrate das stores locais

## Camada de dominio em `src/lib`

Cada dominio principal tem seu proprio modulo:

- `assets`
- `atlas`
- `audio`
- `characters`
- `chat`
- `cloudinary`
- `content-bridge`
- `dice`
- `effects`
- `library`
- `maps`
- `notes`
- `private-events`
- `realtime`
- `scenes`
- `session`
- `supabase`
- `theme`

Padrao esperado:

- `repository.ts`
  acesso a banco
- `selectors.ts`
  leituras derivadas e composicao
- utilitarios ou contratos locais

## Server actions e API routes

### Server actions

Ficam em:

- `src/app/actions`

Elas cobrem:

- sessao
- chat
- audio
- atlas
- fichas
- efeitos
- notas
- admin
- content bridge

Regra pratica:

- mutacao importante da mesa tende a passar por action
- a action valida papel do viewer
- a action atualiza banco
- a action pode registrar memoria da sessao

### API routes

Ficam em:

- `src/app/api`

Uso principal:

- rotas protegidas
- fluxos que precisam ser consumidos no cliente
- assinaturas auxiliares, notas, memoria e afins

## Sessao, viewer e bootstrap

O dominio de sessao esta em:

- `src/lib/session`
- `src/types/session.ts`

Ele concentra:

- sessao
- participantes
- viewer
- snapshot
- bootstrap
- backup/restore
- estado de shell

O bootstrap e o ponto de entrada da mesa. Ele monta o conjunto minimo para renderizar:

- viewer
- participantes
- snapshot
- party/presence
- slices principais da sessao

## Realtime

O realtime esta em:

- `src/lib/realtime`

Existe estrategia de degradacao e reconciliacao.

A app nao depende de um unico subscribe gigante; ela trabalha por slices.

Isso melhora:

- custo de sincronizacao
- carga inicial
- manutencao

## Audio

O dominio de audio cobre:

- biblioteca de faixas
- player sincronizado
- play/pause/stop
- volume global
- loop

Arquivos centrais:

- `src/components/audio`
- `src/components/panels/audio-panel.tsx`
- `src/lib/audio`
- `src/stores/audio-store.ts`

## Atlas, efeitos, memoria e notas

Essas partes sao a assinatura mais autoral da mesa.

### Atlas

- pins podem ser ocultos
- nome pode ser revelado separado dos detalhes
- pode marcar pista
- pode ligar personagens e submapa

### Efeitos

- globais ou por alvo
- camada de atmosfera
- presets mais profundos para horror, pressao, febre, ritual etc.

### Notas

- mestre tem notas contextuais por cena, campo e local
- jogador tem caderno pessoal

### Memoria

- guarda rastros recentes da sessao
- mestre ve tudo
- jogador so ve o que for publico ou direcionado

## Participantes e papeis

Papeis basicos:

- `gm`
- `player`

O mestre controla:

- palco
- revelacao
- audio
- efeitos
- administracao
- remocao de jogador da mesa

O jogador acessa:

- palco
- ficha
- wiki
- conversa
- caderno

## Banco e migrations

As migrations ficam em:

- `apps/daimyo-vtt/supabase/migrations`

Panorama atual:

- `20260416_phase1_foundation.sql`
- `20260416_phase2_lobby.sql`
- `20260416_phase3_assets_characters.sql`
- `20260416_phase4_theater.sql`
- `20260416_phase5_tactical_maps.sql`
- `20260416_phase6_chat_audio.sql`
- `20260416_phase7_atlas_immersion.sql`
- refinamentos em `20260417`, `20260418`, `20260419` e `20260421`

Essas migrations cobrem:

- sessoes
- participantes
- auth/lobby
- assets e retratos
- fichas
- teatro
- mapas taticos
- chat
- audio
- atlas
- efeitos
- realtime hardening
- reset transacional
- grid
- visibilidade do atlas
- loop de audio
- combate
- notas
- memoria da sessao

## Scripts

### Da raiz do monorepo

```powershell
npm.cmd run dev:vtt
npm.cmd run build:vtt
npm.cmd run lint:vtt
npm.cmd run typecheck:vtt
npm.cmd run test:vtt
```

### Dentro de `apps/daimyo-vtt`

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
```

## Arquivos e pastas que merecem respeito

Se for mexer, leia com cuidado:

- `src/components/shell/master-shell.tsx`
- `src/components/shell/player-shell.tsx`
- `src/components/panels/stage-panel.tsx`
- `src/components/stage/theater-stage.tsx`
- `src/components/stage/tactical-map-stage.tsx`
- `src/components/stage/atlas-stage.tsx`
- `src/components/panels/explorer-panel.tsx`
- `src/components/panels/bottom-dock.tsx`
- `src/lib/session`
- `src/lib/realtime`
- `src/stores/ui-shell-store.ts`
- `src/types/session.ts`

Esses arquivos amarram o coracao da experiencia.

## Direcao de frontend

Leitura atual mais saudavel para a app:

- `desktop mestre`: header curto + palco dominante + drawer lateral + tray inferior
- `desktop jogador`: palco dominante + apoio inferior
- `mobile`: player-first, com drawers e sheets
- menos texto
- menos chrome
- mais densidade visual
- menos cards brigando entre si

O projeto base HTML/CSS/JS continua sendo a referencia principal de:

- densidade
- clareza
- ritmo de interface

O VTT continua sendo a referencia principal de:

- atmosfera
- palco
- imersao

## Documentos complementares

- `C:\Users\richa\Documents\Programação 2026.1\antigravity-project\apps\daimyo-vtt\docs\OPERACAO_CONTINUA.md`
  rotina de uso, backup/restore e diagnostico
- `C:\Users\richa\Documents\Programação 2026.1\antigravity-project\apps\daimyo-vtt\docs\PLAN.md`
  plano de avaliacao/orquestracao de layout

## Resumo rapido para quem vai entrar agora

Se voce precisa entender a app em poucos minutos:

1. `master-shell` e `player-shell` definem a experiencia
2. `stage-panel` escolhe o palco e o chrome do momento
3. `theater`, `tactical` e `atlas` sao os tres estagios principais
4. `explorer-panel` e `bottom-dock` sao biblioteca e apoio
5. `src/lib` guarda a regra de dominio
6. `src/stores` guarda o estado local
7. `actions` e `api` executam as mutacoes e rotas protegidas
8. `supabase/migrations` conta a historia do schema

Se o objetivo for evoluir a mesa com seguranca, comece por aqui e depois abra os documentos de `docs`.
