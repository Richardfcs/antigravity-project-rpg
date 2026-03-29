# ⛩️ Escudo do Daimyo (PWA — V10.2)

**Acesse o App ao vivo:** [https://richardfcs.github.io/antigravity-project-rpg/](https://richardfcs.github.io/antigravity-project-rpg/)

> **"Uma lâmina afiada é apenas metade da vitória; a outra metade é o conhecimento do campo de batalha."**

**Escudo do Daimyo** é uma central de comando para Mestres de RPG, desenvolvida sob medida para o sistema **GURPS 4ª Edição**. Focado na ambientação de fantasia histórica e horror oriental (*A Era das Espadas Quebradas*), este Progressive Web App (PWA) automatiza as mecânicas mais densas do sistema, permitindo que a narrativa flua sem interrupções.

---

## 🌟 Pilares do Xogunato (Funcionalidades)

### 💎 01. O Cofre Infinito (IndexedDB & Sync)
Esqueça os limites de 5MB do passado. O sistema utiliza **IndexedDB** para armazenamento massivo e resiliente.
- **Sincronização Atômica**: Mantenha múltiplas abas abertas (Arena, Mapa, Biblioteca); qualquer alteração em uma reflete instantaneamente em todas as outras via `BroadcastChannel`.
- **Persistência de Longo Prazo**: Seus personagens, notas de sessão, relógios de facção e configurações de mapa são salvos localmente e persistem mesmo após limpar o cache do navegador.
- **Migração Inteligente**: Sistema automático que resgata dados antigos do `localStorage` para a nova arquitetura de banco de dados.

### ⚔️ 02. Arena de Combate & SSR (Speed/Size/Range)
Um rastreador de iniciativa inteligente integrado com calculadoras de dano letais.
- **Gestão de Turnos GURPS**: Ordenação automática por Velocidade Básica, DX e IQ. Gerenciamento de PV/PF com barras visuais e estados de choque/morte.
- **Calculadora de Dano Localizado**: Automação de multiplicadores por tipo de dano (cut, imp, cr, pi, etc.) e localização do golpe (Skull, Vitals, Limbs).
- **Módulo Distância (SSR)**: Integração da tabela Size/Speed/Range para arcos, mosquetes e magias, calculando modificadores de distância e tamanho instantaneamente.

### 🗺️ 03. Mapa Tático de Guerra V3
Uma interface de comando militar para visualização de território e combates táticos.
- **Hierarquia Regional**: Navegue do Mapa Macro para Regiões, Cidades e Campos de Batalha específicos.
- **Gestão de Tokens**: Adicione aliados e inimigos. Customize cor, tamanho e formato dos pins.
- **Upload de Manuscritos**: Mestre pode fazer upload de suas próprias imagens de mapa, que são armazenadas no banco de dados local (Cofre Infinito).

### 📖 04. Santuário de Heróis (Fichas & Legado)
O Registro de Bushido permite a gestão completa do grupo de jogadores.
- **Cálculo Automático**: Valores de Velocidade, Esquiva, Aparada e Carga calculados em tempo real com base nos atributos.
- **Cofre de Itens**: Arraste equipamentos do banco de dados de armas e armaduras para a ficha.
- **Túmulo dos Ancestrais**: Sistema de legado para personagens falecidos, mantendo a história da campanha viva.

### 👻 05. Oráculo de Kegare & Sanidade
Ferramentas dedicadas ao horror e sobriedade da campanha.
- **Mácula (Kegare)**: Rastreadores dinâmicos de corrupção espiritual.
- **Testes de Pânico**: Geradores procedurais para resultados de pânico e fobias baseados nas regras oficiais.
- **Gestão de Tempo**: Ciclos dia/noite, fases da lua e calendário japonês tradicional.

---

## 📱 Tecnologia & Modernidade PWA

O projeto utiliza o estado da arte em desenvolvimento web vanila (HTML5/CSS3/JS):
- **Offline-First (v10)**: O Service Worker otimizado garante que o app funcione 100% sem internet, inclusive carregando assets de mapas e sons em cache.
- **Instalabilidade Nativa**: Compatível com Android (Chrome), iOS (Safari), Windows e macOS. Interface otimizada para toque e desktop.
- **Design Premium**: Estética minimalista japonesa utilizando a tipografia *Noto Serif JP* e paletas de cores harmônicas (modo escuro por padrão).
- **Acessibilidade**: Conformidade com normas ARIA para leitores de tela e navegação por teclado.

---

## 📂 Arquitetura do Projeto

```text
/
├── index.html              # Dashboard Principal / Arena de Combate
├── characters-sheet.html   # Forja de Legendas (Editor de Fichas)
├── combat-calculator.html  # Laboratório de Dano e SSR
├── library.html            # Biblioteca de Referência GURPS
├── equipment-database.html # Arsenal e Mercado Tradicional
├── kegare-panico.html      # Módulo de Sanidade e Sanidade
├── oracle-generators.html  # Gerador de NPCs e Mapa Tático
├── time-management.html    # Relógios de Campanha e Tempo
├── sw.js                   # Motor Service Worker (PWA)
└── js/
    ├── daimyo-db.js        # Core do Cofre Infinito (IndexedDB)
    ├── character-manager.js# Lógica de Persistência de Fichas
    ├── tactical-map.js     # Motor de Mapas e Tokens
    ├── ranged-calc.js      # Calculador de Distância SSR
    ├── merchant-logic.js   # Sistema de Mercado e Descontos
    └── header-loader.js    # Injetor de UI Global e PWA Setup
```

---

## ⛩️ Instalação Rápida

1. Abra o link no Chrome ou Safari: [Escudo do Daimyo](https://richardfcs.github.io/antigravity-project-rpg/)
2. No menu do navegador, clique em **"Instalar Aplicativo"** ou **"Adicionar à Tela de Início"**.
3. O app aparecerá na sua lista de aplicativos, pronto para ser usado em qualquer sessão de jogo, mesmo no meio da floresta ou do sertão sem sinal.

---
*Escudo do Daimyo — Elevando a sua mestria à dignidade de um Shogun.*
*Desenvolvido em parceria com a inteligência Antigravity.*
