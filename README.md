# ⚔️ Escudo do Daimyo (PWA)

**Acesse o App ao vivo:** [https://richardfcs.github.io/antigravity-project-rpg/](https://richardfcs.github.io/antigravity-project-rpg/)

**Escudo do Daimyo** é um Companion App robusto e nativo da web, desenvolvido especialmente para Mestres de RPG que utilizam o sistema **GURPS 4ª Edição** em ambientações de Japão Feudal (como *A Era das Espadas Quebradas*). 

Este aplicativo transforma o seu navegador em uma central de comando para o mestre, com automação de regras complexas, gestão de iniciativa e ferramentas narrativas, tudo funcionando de forma **totalmente offline e sincronizada**.

---

## 🌟 Funcionalidades de Elite

### 💎 O Cofre Infinito (IndexedDB)
Migramos do antigo limite de 5MB do localStorage para o **IndexedDB**. 
- **Capacidade Gigante**: Armazene gigabytes de fichas, notas e estados de mapa sem limites.
- **Sincronização em Tempo Real**: Mantenha a Arena, o Mapa e a Biblioteca abertos em abas diferentes; qualquer mudança em uma é refletida instantaneamente na outra.
- **Persistência Total**: Seus NPCs, itens customizados e relógios agora estão protegidos em um banco de dados interno resiliente.

### 🎯 Arena de Combate (Iniciativa & Dano)
Gestão dinâmica de turnos baseada em **Velocidade Básica**, **DX** e **IQ**. 
- **Cálculo de Dano GURPS**: Automação total de multiplicadores de ferimento por localização (**Skull, Vitals, Limbs**) e tipos de dano (**cut, imp, pi, etc**).
- **SSR & Ranged**: Tabela de Size/Speed/Range integrada para disparos de arcos e arremessos.
- **Status Automáticos**: Gestão de PV/PF com alertas de Risco de Morte e Penalidades de Choque.

### 🗺️ Mapa Tático de Guerra
Um visualizador de mapa interativo com hierarquia de regiões.
- **Pins Interativos**: Marque cidades, santuários e pontos de interesse.
- **Navegação em Árvore**: Explore do mapa macro para vilas e rotas específicas.
- **Design Imersivo**: Interface escura e estilizada focada na estética Sengoku.

### 📚 Biblioteca Técnica & Arsenal
Base de dados completa e centralizada de GURPS 4e:
- **Técnicas de Budô**: Estilos de luta (Kenjutsu, Kusarijutsu) com manobras cinematográficas e realistas.
- **Arquivos do Clã**: Vantagens, Desvantagens, Perícias e Regras de Kegare (Corrupção).
- **Mercado e Forja**: Database de armas, armaduras e itens ninja com cálculo de custo e peso.

### 📜 Registro de Bushido (Fichas Premium)
Sistema de gerenciamento de personagens com design imersivo.
- **Cálculo de Atributos**: Geração automática de Velocidade, Esquiva e Aparada.
- **Gestão de Carga**: Cálculo de slots e penalidades de carga baseado em ST.
- **Sistema de Legado**: Registre as mortes heroicas e mova seus samurais para o **Túmulo dos Ancestrais**.

---

## 📱 PWA & Experiência Offline

O projeto foi construído como um **Progressive Web App**:
- **Offline First**: Funciona integralmente sem internet após o primeiro acesso comercial através de Cache-First Strategy.
- **Instalável**: Pode ser instalado no Android (via Chrome), iOS (via Safari), Windows e macOS como um aplicativo independente.
- **Sincronização entre Abas**: Utiliza `BroadcastChannel` para manter todas as páginas do app alinhadas instantaneamente.

---

## 📂 Estrutura de Arquivos

```text
/
├── index.html              # Arena de Combate e GM Tools
├── combat-calculator.html  # Calculadora de Dano e SSR dedicada
├── characters-sheet.html   # Editor de Fichas de Personagem
├── library.html            # Biblioteca de Referência Técnica
├── equipment-database.html # Arsenal, Mercado e Loot Oracle
├── kegare-panico.html      # Gestão de Sanidade e Corrupção
├── oracle-generators.html  # Gerador de Inimigos e Oráculo
├── time-management.html    # Relógios de Campanha e Calendário
├── js/
│   ├── daimyo-db.js        # O Cofre Infinito (IndexedDB Core)
│   ├── tactical-map.js     # Motor do Mapa de Guerra
│   ├── character-manager.js# Lógica de Fichas e Persistência
│   ├── library-data.js     # Motor da Biblioteca GURPS
│   └── header-loader.js    # Injeção de UI e Controle PWA
├── Maps/                    # Assets de Imagens de Mapa
└── sw.js                   # Service Worker (Motor Offline v9+)
```

---

## ⛩️ Como Instalar
1. Acesse: [richardfcs.github.io/antigravity-project-rpg/](https://richardfcs.github.io/antigravity-project-rpg/)
2. No seu navegador, clique no ícone de instalação (barra de endereço no Desktop) ou selecione **"Compartilhar" > "Adicionar à Tela de Início"** no Mobile.
3. Abra o **Escudo do Daimyo** e sinta o poder do Xogunato na palma da sua mão!

---
*Desenvolvido em parceria com Antigravity Kit — Elevando a experiência do mestre à era das espadas.*
