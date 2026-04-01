# ⛩️ Escudo do Daimyo — PWA v11.0

**Acesse o App ao vivo:** [https://richardfcs.github.io/antigravity-project-rpg/](https://richardfcs.github.io/antigravity-project-rpg/)

> *"Uma lâmina afiada é apenas metade da vitória; a outra metade é o conhecimento do campo de batalha."*

**Escudo do Daimyo** é uma central de comando completa para Mestres e Jogadores de RPG, desenvolvida sob medida para o sistema **GURPS 4ª Edição**, com foco na ambientação de fantasia histórica e horror oriental — **A Era das Espadas Quebradas**. Este Progressive Web App (PWA) automatiza as mecânicas mais densas do sistema, permitindo que a narrativa flua sem interrupções.

A aplicação é dividida em duas interfaces independentes:

| Interface | Acesso | Descrição |
|-----------|--------|-----------|
| **Portal do Viajante** (Jogador) | Público | Ficha de personagem, Arsenal, Biblioteca, Notas e Configurações |
| **Câmara do Daimyo** (Mestre) | Protegido por senha | Hub de combate, Mapa Tático, Oráculos, Kegare, Tempo e todas as ferramentas narrativas |

---

## 🌟 Funcionalidades Principais

### 💎 01. O Cofre Infinito (IndexedDB & Sync)

Esqueça os limites de 5MB do passado. O sistema utiliza **IndexedDB** (~1GB de capacidade) para armazenamento massivo e resiliente.

- **Sincronização Cross-Tab**: Mantenha múltiplas abas abertas (Arena, Mapa, Biblioteca); qualquer alteração em uma reflete instantaneamente em todas as outras via `BroadcastChannel`.
- **Persistência de Longo Prazo**: Personagens, notas de sessão, relógios de facção, configurações de mapa e histórico de combate são salvos localmente e persistem entre sessões.
- **Migração Inteligente**: Sistema automático que resgata dados antigos do `localStorage` para a nova arquitetura IndexedDB.
- **Backup & Restauração**: Exporte/importe o estado completo do app (localStorage + IndexedDB) para um arquivo JSON portátil.

### ⚔️ 02. Arena de Combate & SSR (Speed/Size/Range)

Um rastreador de iniciativa inteligente integrado com calculadoras de dano letais.

- **Gestão de Turnos GURPS**: Ordenação automática por Velocidade Básica, DX e IQ. Gerenciamento de PV/PF com barras visuais e estados de choque/morte.
- **Calculadora de Dano Localizado**: Automação de multiplicadores por tipo de dano (cut, imp, cr, pi, etc.) e localização do golpe (Skull, Vitals, Limbs).
- **Módulo Distância (SSR)**: Integração da tabela Size/Speed/Range para arcos, mosquetes e magias, calculando modificadores de distância e tamanho instantaneamente.
- **Combate em Massa**: Sistema embutido para gerenciar conflitos de larga escala.

### 🗺️ 03. Mapa Tático de Guerra V3

Uma interface de comando militar para visualização de território e combates táticos.

- **Hierarquia Regional**: Navegue do Mapa Macro para Regiões, Cidades e Campos de Batalha específicos.
- **Gestão de Tokens**: Adicione aliados e inimigos. Customize cor, tamanho e formato dos pins diretamente no mapa.
- **Upload de Manuscritos**: O mestre pode fazer upload de suas próprias imagens de mapa, armazenadas no Cofre Infinito.
- **Grid de Batalha**: Grade tática para combates posicionais com zoom e controle de câmera.

### 📖 04. Santuário de Heróis (Fichas & Legado)

O Registro de Bushido permite a gestão completa do grupo de jogadores.

- **Cálculo Automático**: Valores de Velocidade, Esquiva, Aparada, Carga e Custo de Aumento calculados em tempo real.
- **Rastreamento de Status**: Barras interativas de HP/FP por personagem no lado do jogador, com controles de ajuste.
- **Retratos de Personagem**: Upload de fotos de personagem com armazenamento em base64 no banco de dados.
- **Biblioteca de Arquétipos**: Base de dados completa com 70+ arquétipos pré-configurados para criação rápida de personagens.
- **Cofre de Itens**: Banco de dados de armas e armaduras com cálculo de dano baseado em ST.
- **Túmulo dos Ancestrais**: Sistema de legado para personagens inativos, mantendo a história da campanha viva.

### 👻 05. Oráculo de Kegare & Sanidade

Ferramentas dedicadas ao horror e sobriedade da campanha.

- **Mácula (Kegare)**: Rastreadores dinâmicos de corrupção espiritual com barra visual e níveis de contaminação.
- **Testes de Pânico**: Geradores procedurais para resultados de pânico e fobias baseados nas regras oficiais.
- **Cura de Ki**: Sistema para tratamento e purificação espiritual vinculado ao combate.

### 🕐 06. Gestão de Tempo & Relógios de Facção

Motor temporal completo para campanhas de duração estendida.

- **Ciclos dia/noite**: Fases da lua e calendário japonês tradicional.
- **Relógios de Facção**: Temporizadores narrativos para facções e arcos de história.
- **Histórico de Eventos**: Log cronológico de eventos e marcos da campanha.

### 🎲 07. Geradores de NPCs & Oráculos

Ferramentas procedurais para geração de conteúdo narrativo.

- **Gerador de Inimigos**: Criação rápida de NPCs combativos com estatísticas GURPS.
- **Oráculos de Sim/Não**: Sistema de respostas aleatórias para decisões narrativas.
- **Ferramentas Narrativas**: Anotações do mestre, notas de sessão e drawers de ferramentas.

### 📦 08. Arsenal de Equipamentos

Banco de dados consultivo com todas as armas, armaduras e itens da campanha.

- **Filtros por Categoria**: Armas de Lâmina, Haste, Esmagamento, Arremesso, Armaduras, Ninja, Oculto e mais.
- **Cálculos de Dano**: Fórmulas de dano baseadas em ST com tipo de dano (cor, cut, imp, pi, etc.).
- **Tabelas de Referência**: Regras de combate, tabelas de localização de dano e regras especiais.
- **Sistema de Mercador**: Calculadora de preços com descontos e regateio.

### 📚 09. Biblioteca de Referência GURPS

Base de dados consultiva com todo material da campanha.

- **8 Categorias**: Vantagens, Desvantagens, Perícias, Budô, Yokai, Arquétipos, Atlas e Regras.
- **Sub-filtros & Busca**: Busca textual integrada e chips de subcategoria.
- **Budô Detalhado**: Cards especiais para estilos de combate com técnicas, dificuldade, perícias realistas e qualidades de estilo.
- **Gestão de Categorias**: Adicione, reordene e remova categorias customizadas.

---

## 👤 Portal do Viajante (Interface do Jogador)

O Portal do Viajante é uma interface independente e dedicada aos jogadores, acessível sem senha.

| Página | Função |
|--------|--------|
| `Jogadores/index.html` | Hub de personagens — seleção, criação e legado |
| `Jogadores/characters-sheet.html` | Ficha completa com status HP/FP interativo |
| `Jogadores/notes.html` | Editor de notas com suporte a Markdown e preview |
| `Jogadores/equipment-database.html` | Arsenal (somente leitura) |
| `Jogadores/library.html` | Biblioteca de referência |
| `Jogadores/settings.html` | Temas, acessibilidade, backup e limpeza de dados |

**Recursos exclusivos do jogador:**
- 🎨 **7 Temas visuais** (Sumi-e, Washi, Sakura, Stone + 3 Neon)
- 📏 **Escala de fonte** ajustável para acessibilidade
- 📤 **Backup/Restauração** independente dos dados do mestre
- 📓 **Notas pessoais** com Markdown e preview live

---

## 📱 Tecnologia & PWA

O projeto utiliza o estado da arte em desenvolvimento web vanilla (HTML5/CSS3/ES2025):

- **Offline-First**: Service Workers (Master + Player) otimizados garantem que o app funcione 100% sem internet, com estratégia network-first e cache fallback.
- **Instalabilidade Nativa**: Compatível com Android (Chrome), iOS (Safari), Windows e macOS. Interface otimizada para toque e desktop.
- **Design Premium**: Estética minimalista japonesa utilizando tipografia *Noto Serif JP* + *Inter*, paleta harmônica com modo escuro por padrão.
- **Wake Lock API**: Mantém a tela ligada durante sessões de jogo (quando suportado pelo navegador).
- **View Transitions API**: Animações de transição suaves entre páginas no lado do mestre.
- **Zero Dependências**: Nenhum framework, nenhuma biblioteca externa, nenhum build step. Pure vanila.

---

## 📂 Arquitetura do Projeto

```text
/
├── index.html                  # Portão de Entrada (Login Mestre + Player)
├── master-hub.html             # 🏯 Hub Central do Mestre (Arena, Turnos, NPCs)
├── combat-calculator.html      # ⚔️ Calculadora de Dano & SSR
├── oracle-generators.html      # 🎲 Oráculos, Gerador de NPCs & Mapa Tático V3
├── kegare-panico.html          # 👻 Sistema de Kegare & Testes de Pânico
├── time-management.html        # 🕐 Gestão de Tempo & Relógios de Facção
├── characters-sheet.html       # 📜 Ficha de Personagem (Mestre)
├── equipment-database.html     # 📦 Arsenal de Equipamentos (Mestre)
├── library.html                # 📚 Biblioteca de Referência GURPS
├── manifest.json               # PWA Manifest (Mestre)
├── sw.js                       # Service Worker (Mestre)
├── inject-pwa.js               # Injetor de meta-tags PWA
│
├── js/                         # === MÓDULOS JAVASCRIPT (MESTRE) ===
│   ├── daimyo-db.js            # 💎 Core IndexedDB ("Cofre Infinito")
│   ├── character-manager.js    # Persistência de fichas (CRUD)
│   ├── character-ui.js         # UI editor de fichas
│   ├── archetypes-db.js        # Biblioteca de 70+ arquétipos
│   ├── weapons-data.js         # Banco de dados de armas & armaduras
│   ├── library-data.js         # Banco de dados da biblioteca GURPS
│   ├── header-loader.js        # Injetor de header global + SW + WakeLock
│   ├── theme-manager.js        # Gerenciador de temas visuais & acessibilidade
│   ├── log-manager.js          # Histórico de combate (buffer circular)
│   ├── kegare-manager.js       # Motor de Kegare & Testes de Pânico
│   ├── narrative-tools.js      # Ferramentas narrativas (notas, relógios, combate em massa)
│   ├── tactical-map.js         # Motor de mapa tático V3 (tokens, grid, upload)
│   ├── ranged-calc.js          # Calculador SSR (Size/Speed/Range)
│   ├── merchant-logic.js       # Sistema de mercador & descontos
│   ├── enemy-generator.js      # Gerador procedural de NPCs
│   └── daimyo-seal.js          # Export/Import de backup (JSON)
│
├── Jogadores/                  # === PORTAL DO VIAJANTE (JOGADOR) ===
│   ├── index.html              # Hub de personagens
│   ├── characters-sheet.html   # Ficha com status HP/FP interativo
│   ├── notes.html              # Editor de notas Markdown
│   ├── equipment-database.html # Arsenal (somente leitura)
│   ├── library.html            # Biblioteca de referência
│   ├── settings.html           # Temas, backup & configurações
│   ├── manifest.json           # PWA Manifest (Jogador)
│   ├── sw.js                   # Service Worker (Jogador)
│   └── js/                     # Módulos Player-specific
│       ├── daimyo-db.js        # Core IndexedDB (compartilhado)
│       ├── character-manager.js# CM com lógica de personagem ativo
│       ├── character-ui.js     # UI editor simplificado
│       ├── header-player.js    # Header dedicado do jogador
│       ├── theme-manager.js    # Temas (compartilhado)
│       ├── player-notes.js     # Motor de notas com Markdown
│       ├── daimyo-seal.js      # Backup do jogador
│       ├── archetypes-db.js    # Arquétipos (compartilhado)
│       ├── weapons-data.js     # Armas (compartilhado)
│       ├── library-data.js     # Biblioteca (compartilhado)
│       └── log-manager.js      # Log Manager (compartilhado)
│
├── maps/                       # Assets de mapas estáticos
│   ├── mapa-macro.png          # Mapa político geral
│   ├── regiao-chugoku.png      # Região Chugoku detalhada
│   ├── kamamura.png            # Cidade de Kamamura
│   └── grid-battle.png         # Textura do grid de batalha
│
├── icons/                      # Ícones PWA
│   ├── app-icon-192.png
│   └── app-icon-512.png
│
├── rpg-data-md/                # Lore & conteúdo de campanha (Markdown)
│   ├── Japão RPG 1.0.md
│   ├── O Atlas do Mundo 1.0.md
│   ├── O Grimório do Oculto 1.0.md
│   ├── O Livro do Daimyo. 1.0.md
│   ├── Biblioteca de Arquétipos.md
│   └── ...
│
└── docs/                       # Documentação de desenvolvimento
    ├── PLAN-escudo-daimyo.md
    ├── PLAN-combat-calculator.md
    ├── PLAN-oracles-generators.md
    └── ...
```

---

## 🔒 Segurança & Autenticação

| Camada | Mecanismo |
|--------|-----------|
| **Mestre** | Senha via `localStorage` (`daimyo_auth`). Todas as páginas do mestre verificam auth no carregamento e redirecionam para `index.html` se inválido. |
| **Jogador** | Acesso público (sem senha). O portal do jogador é intencionalmente aberto. |
| **Dados** | Todos os dados são armazenados localmente (IndexedDB + localStorage). Nenhum dado é enviado para servidores externos. |

---

## 🛠️ Infraestrutura de Dados

### IndexedDB — Stores

| Store | Conteúdo |
|-------|----------|
| `characters` | Fichas de personagem completas |
| `vault` | Estado de combate, relógios, notas do mestre, kegare, notas do jogador |
| `history` | Log de combate com buffer circular |
| `maps` | Dados de mapas e tokens salvos |
| `library` | Itens customizados da biblioteca |

### Sincronização

```
DaimyoDB.put() → BroadcastChannel("daimyo-sync") → Todas as abas abertas
                                                    ↓
                                              window.dispatchEvent('daimyoStateUpdated')
                                                    ↓
                                              Módulos reagem (CharacterManager, LogManager, etc.)
```

---

## ⛩️ Instalação & Uso

### Uso Online (Recomendado)
1. Abra **[Escudo do Daimyo](https://richardfcs.github.io/antigravity-project-rpg/)** no Chrome, Edge ou Safari
2. No menu do navegador → **"Instalar Aplicativo"** ou **"Adicionar à Tela de Início"**
3. O app aparecerá na sua lista de aplicativos, pronto para uso offline

### Uso Local (Desenvolvimento)
```bash
# Clone o repositório
git clone https://github.com/Richardfcs/antigravity-project-rpg.git

# Sirva com qualquer servidor HTTP local
npx serve .
# ou
python -m http.server 8000
```

> **Nota:** Service Workers requerem HTTPS ou `localhost` para funcionar.

---

## 📜 Licença & Créditos

- **Sistema GURPS 4e** é propriedade de Steve Jackson Games.
- Desenvolvido por **Richard FCS** em parceria com a inteligência **Antigravity**.
- Tipografia: **Noto Serif JP** e **Inter** (Google Fonts).

---

*Escudo do Daimyo — Elevando a sua mestria à dignidade de um Shogun.* ⛩️
