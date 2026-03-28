# ⚔️ Escudo do Daimyo (PWA)

**Acesse o App ao vivo:** [https://richardfcs.github.io/antigravity-project-rpg/](https://richardfcs.github.io/antigravity-project-rpg/)

**Escudo do Daimyo** é um Companion App robusto e nativo da web, desenvolvido especialmente para Mestres de RPG que utilizam o sistema **GURPS 4ª Edição** em ambientações de Japão Feudal (como *A Era das Espadas Quebradas*). 

Este aplicativo transforma o seu navegador em uma central de comando para o mestre, com automação de regras complexas, gestão de iniciativa e ferramentas narrativas, tudo funcionando de forma **totalmente offline**.

---

## 🌟 Funcionalidades Principais

### 1. Rastreador de Iniciativa (Combat Tracker)
Gestão dinâmica de turnos baseada em **Velocidade Básica** e **DX/IQ**. 
- Adição rápida de combatentes e controle de HP/PF.
- Aplicação automática de **Penalidades de Choque (-4)**, **Ferimentos Graves** e **Risco de Morte**.
- Gestão de condições (Bleeding, Stun, etc).

### 2. Calculadora de Dano GURPS 4e
Automação completa do cálculo de ferimento:
- Suporte a todos os tipos de dano (**cut, imp, cr, pi-, pi+, pi++**).
- Multiplicadores por localização de hit (**Skull, Face, Torso, Vitals, Limbs**).
- Integração de RD (Resistência a Dano) de armaduras.

### 3. Calculadora de Ataque à Distância (SSR Table) 📏
Automação estratégica de disparos:
- **Integração Total**: Agora presente como opção no painel de dano da `index.html` e como seção dedicada na `combat-calculator.html`.
- **Tabela SSR**: Redutores automáticos por distância oficial (2m, 10m, 100m, etc).
- **Mira Progressiva**: Soma de Precisão (Acc) e bônus por turnos extras.
- **Modificadores Extras**: Apoio (Braced), Tamanho do Alvo (SM) e Ataque Determinado.

### 4. Gerador Procedural de Inimigos (IA/Regras) 🎲
Criação instantânea de NPCs com um clique:
- **Níveis de Ameaça**: Capanga, Elite e Mestre.
- **Arsenal Dinâmico**: O gerador equipa automaticamente armas compatíveis do banco de dados `weaponsDB`.
- **Nomes Japoneses**: Geração de nomes e sobrenomes autênticos.
- **Oráculo Narrativo**: Cada inimigo vem com uma personalidade e motivação aleatória para improvisos rápidos.

### 5. Personalização Neon & Acessibilidade 🎨
Sistema de estética dinâmica para o Mestre:
- **Temas Predefinidos**: Escolha entre variações vibrantes como **Venenoso (Verde)**, **Dourado (Amarelo)** e **Sengoku (Vermelho)**.
- **Acessibilidade de Fontes**: Alternância instantânea entre fontes com serifa (Tradicional) e **Sem Serifa (Inter)** para melhor legibilidade mobile.
- **Persistência Local**: Suas preferências de tema são lembradas automaticamente em todos os dispositivos.

### 6. Ferramentas de Narrativa (GM Tools)
Exclusivo na página inicial para fácil acesso:
- **Anotações do Mestre**: Notas que persistem localmente entre sessões.
- **Relógios de Campanha (Progress Clocks)**: Gestão de eventos, progresso de vilões ou perigos ambientais.
- **Combate em Massa**: Resolução rápida de guerras e escaramuças com **Grade Responsiva 2x2** para uso fluido em celulares.

### 6. Biblioteca e Arsenal
Base de dados completa e centralizada de:
- **Arsenal**: Armas brancas, arcos, armaduras e itens ninja.
- **Biblioteca**: Referência rápida para Vantagens, Desvantagens e Regras de Sistema (Kegare, O Véu, etc).
- **Herdeiro/Legado**: Sistema para registrar mortes heroicas e herança de itens.

---

## 📱 PWA & Experiência Nativa

O projeto foi construído como um **Progressive Web App**:
- **Offline First**: Graças ao Service Worker (`sw.js`), o app funciona integralmente sem internet após o primeiro acesso comercial (Cache-First).
- **Instalável**: Pode ser instalado no Android (via Chrome), iOS (via Safari), Windows e macOS como um aplicativo independente.
- **Performance**: Sem telas de splash ou menus de navegação do browser, operando em modo *Standalone*.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5, Vanilla CSS (Design Premium/Dark Mode).
- **Lógica**: JavaScript Puro (ES6) - Sem dependências externas.
- **Persistência**: LocalStorage (Sincronização entre abas e sessões).
- **PWA**: Web App Manifest e Service Worker (Offline-First Strategy).

---

## 📂 Estrutura de Arquivos

```text
/
├── index.html              # Central de Combate e GM Tools
├── library.html            # Biblioteca de Referência
├── equipment-database.html # Arsenal e Catálogo
├── time-management.html    # Relógios e Log de Legado
├── js/
│   ├── header-loader.js    # Injeção de UI, Navegação e PWA
│   ├── ranged-calc.js      # Motor de Cálculo de Distância (SSR)
│   ├── weapons-data.js     # Banco de Dados de Itens
│   ├── library-data.js     # Referência de Regras
│   ├── enemy-generator.js  # Motor Procedural
│   └── narrative-tools.js  # Lógica de Relógios e Notas
├── sw.js                   # Service Worker (Motor Offline)
└── manifest.json           # Manifesto PWA
```

---

## ⛩️ Como Instalar
1. Acesse: [richardfcs.github.io/antigravity-project-rpg/](https://richardfcs.github.io/antigravity-project-rpg/)
2. No seu navegador, clique no ícone de instalação (barra de endereço no Desktop) ou selecione **"Compartilhar" > "Adicionar à Tela de Início"** no Mobile.
3. Abra o **Escudo do Daimyo** diretamente do seu menu de aplicativos e use-o mesmo em modo avião!

---
*Desenvolvido em parceria com Antigravity Kit — Elevando a experiência do mestre à era das espadas.*
