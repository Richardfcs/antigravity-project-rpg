# PLAN: Banco de Dados de Consulta Rápida — Milestone 4

> **Escudo do Daimyo** — Searchable Database de Armas, Armaduras e Equipamentos
> Agente: `frontend-specialist` | Skill: `frontend-design`

---

## Contexto

O Milestone 4 visa criar uma página **standalone** (`equipment-database.html`) com um banco de dados client-side de consulta rápida para o Mestre (Daimyo). Os dados são extraídos diretamente dos documentos **"Japão RPG 1.0"** e **"O Grimório do Oculto 1.0"** e armazenados em arrays JSON no próprio arquivo HTML.

**Não há backend.** Toda a lógica é client-side.

---

## Dados Extraídos dos Documentos

### A. weaponsDB (Armas) — 22 itens do Cap. 2 "Japão RPG 1.0"

| Nome | Tipo | Dano | Alcance | Aparar | Força | Notas |
|------|------|------|---------|--------|-------|-------|
| Katana (1 mão) | Lâmina | GeB+1 cort / GdP+1 perf | 1 | 0 | 10 | Uso com uma mão |
| Katana (2 mãos) | Lâmina | GeB+2 cort / GdP+1 perf | 1-2 | 0 | 9† | Requer duas mãos |
| Wakizashi | Lâmina | GeB cort / GdP perf | 1 | 0 | 8 | Espada curta de acompanhamento |
| Nodachi | Lâmina | GeB+3 cort / GdP+2 perf | 1-2 | 0U | 12† | Grande espada, desequilibrada |
| Tanto | Lâmina | GeB-2 cort / GdP perf | C,1 | -1 | 6 | Faca de samurai |
| Yari (1 mão) | Haste | GdP+2 perf | 2 | 0 | 9 | Lança de uma mão |
| Yari (2 mãos) | Haste | GdP+3 perf | 2-3 | 0 | 9† | Lança longa, duas mãos |
| Naginata | Haste | GeB+2 cort / GdP+2 perf | 2-3 | 0U | 10† | Alabarda japonesa, desequilibrada |
| Bo (Bastão) | Haste | GeB+2 esm / GdP+1 esm | 1-2 | 2 | 7† | Bastão longo, bom aparar |
| Tetsubo | Esmagamento | GeB+4 esm | 1-2 | 0U | 13† | Maça de ferro, desequilibrada |
| Kusarigama | Especialista | GeB+2 esm / GeB cort | 1-4 | 0U | 8† | Foice com corrente (Ninja) |
| Jitte | Especialista | GeB esm | 1 | 0 | 6 | Bastão de ferro policial |
| Kunai | Especialista | GeB-1 cort / GdP-1 perf | C,1 | -1 | 6 | Faca ninja multiuso |
| Masakari | Força Bruta | GeB+3 cort | 1 | 0U | 11 | Machado de uma mão |
| Ono | Força Bruta | GeB+4 cort | 1-2 | 0U | 12† | Machado grande, duas mãos |
| Otsuchi | Força Bruta | GeB+4 esm | 1-2 | 0U | 12† | Martelo de guerra |
| Yumi | Arco | GdP+2 perf | x15/x20 | — | 11† | Arco longo japonês, Prec 3 |
| Shuriken | Arremesso | GdP-1 cort | x0.5/x1.0 | — | 4 | Pode ser envenenada |
| Bo-Shuriken | Arremesso | GdP-1 perf | x0.5/x1.0 | — | 4 | Dardo, penetra roupas grossas |
| Fukiya | Arremesso | 1d-3 pi- | x4 | — | — | Zarabatana, entrega veneno |
| Kunai (arremesso) | Arremesso | GdP-1 perf | x0.8/x1.5 | — | 6 | Pesada, também corpo a corpo |
| Tsubute | Arremesso | GdP esm | x1.0/x2.0 | — | — | Pedra polida para atordoar |

### B. armorDB (Armaduras) — 13 itens do Cap. 2 "Japão RPG 1.0"

| Nome | Local | RD | Peso | Notas |
|------|-------|----|------|-------|
| Roupas Comuns | Corpo Inteiro | 0 | 1 kg | Sem proteção mecânica |
| Kamiko (Papel Laqueado) | Tronco+Braços | 1 | 1.5 kg | Muito barata e leve |
| Traje de Ninja | Corpo Inteiro | 1* | 3 kg | +1 Furtividade (noturno) |
| Cota de Malha (Kusari) | Tronco (oculta) | 3/1* | 4 kg | Pode usar sob a roupa. Converte corte em esm |
| Jingasa (Chapéu de Ferro) | Crânio | 3 | 1 kg | Protege de cima |
| Do (Couraça de Couro) | Tronco | 2 | 4 kg | Couro fervido/laqueado |
| Tatami (Malha e Placas) | Tronco | 3 | 7 kg | Dobrável e portátil |
| Kabuto (Elmo) | Cabeça | 5 | 3 kg | Inclui máscara (Mempo) |
| Do (Peitoral Lamelar) | Tronco | 5 | 12 kg | Pesado e resistente |
| Sode/Kote (Ombreiras) | Braços | 4 | 4 kg | Protege ombros/braços |
| Haidate (Coxotes) | Pernas | 4 | 5 kg | Protege coxas e canelas |
| O-Yoroi (Completa) | Tronco/Membros | 4-5 | 24 kg | Conjunto completo de samurai |
| Tate (Escudo de Chão) | — | 5 (PV 40) | 15 kg | Cobertura total agachado |

### C. gearDB (Equipamentos e Ocultismo) — 20+ itens de ambos os documentos

| Nome | Efeito | Alcance | Notas |
|------|--------|---------|-------|
| Bomba de Fumaça (Kemuridama) | Nuvem 3m, -5 Visão, Furtividade +4 | 1 | Ninja. $20 |
| Metsubishi (Pó Cegante) | HT ou cego temporariamente | 1 | DX-4 rosto. $10 |
| Kaginawa (Gancho e Corda) | +1 Escalada | — | Ninja. $20, 2.5 kg |
| Shuko/Ashiko (Garras) | +1 Escalada, +1 cort em Briga | C | $50 |
| Kit de Arrombamento | Abrir trancas | — | Gazuas. $50 |
| Tetsubishi (Estrepes) | 1 dano, para de andar | Área | $20 |
| Tessen (Leque de Guerra) | Aparar/sinais, +1 Liderança | 1 | $40 |
| Kit Primeiros Socorros | +1 Primeiros Socorros | — | $50, 1 kg |
| Kit Cirúrgico (Primitivo) | Cirurgia (amputações, flechas) | — | $300, 2.5 kg |
| Veneno Digestivo (Acônito) | 2d tóxico após 1h (ingerido) | — | $100/dose |
| Veneno de Lâmina (Víbora) | 1d fadiga + Dor (sangue) | — | $50/dose |
| Ofuda (Selo de Papel) | +1/+2 Exorcismo. Colado: -2 ataques inimigo | Toque | Ataque de Toque |
| Sinos de Purificação (Suzu) | Alarme vs Yokai invisível | Perímetro | $50 |
| Pílulas de Vitalidade (Hyou-Gan) | 1d-2 PF (mín 1). HT-2 | — | Máx 1/dia. $50-100 |
| Cinzas de Cremação | Yokai: HT-2 ou Cego + dor 1d6 seg | 1-2 | Coleta em templos |
| Óleo de Glicínia (Fuji-Abura) | Oni/Henge: HT-3 perde Regen 1d min | Lâmina | $150, dura 1 min |
| Bomba de Cinzas (Hai-Dama) | Yokai: Cegueira + -4 DX/IQ, área 2m | Arremesso | $30 |
| Água Sagrada (O-Miki) | +2 Pânico; cuspir: acerta Insubstancial | — | $50/garrafa |
| Espelho de Bronze (Kagami) | Revela Henge/Yurei. Luz solar: 1d dano | Concentrar | $200 |
| Sal Puro (Mori-Shio) | Dano x2 Yurei/Oni. Interrompe Regen 1 min | Linha/Área | Purificação |

---

## Arquitetura da Página

### Arquivo: `equipment-database.html` (NOVO)

**Layout:**
```
┌──────────────────────────────────────────────────────┐
│  HEADER (⚔ Escudo do Daimyo — Banco de Dados)        │
│  Nav links para outras páginas                        │
├──────────────────────────────────────────────────────┤
│  🔍 BARRA DE PESQUISA (input + keyup listener)       │
│  Filtros: [Todos] [⚔ Armas] [🛡 Armaduras] [📦 Equip]│
│  Contador: "X resultados encontrados"                 │
├──────────────────────────────────────────────────────┤
│  SEÇÃO: ARMAS — Cards compactos                       │
│  nome | tipo | dano | alcance | aparar | força        │
├──────────────────────────────────────────────────────┤
│  SEÇÃO: ARMADURAS — Cards compactos                   │
│  nome | local | RD | peso                             │
├──────────────────────────────────────────────────────┤
│  SEÇÃO: EQUIPAMENTOS — Cards compactos                │
│  nome | efeito | alcance                              │
└──────────────────────────────────────────────────────┘
```

### Motor de Busca (Search Engine)

```
1. Input com keyup event listener + debounce 150ms
2. Normaliza query: toLowerCase() + remove acentos
3. Filtra os 3 arrays simultaneamente (nome, notas, tipo/efeito)
4. Combina com filtro de categoria ativo
5. Renderiza cards filtrados com animação
6. Atualiza contador de resultados
```

### Design System (reutilizado)
- Tokens: `--bg-deep`, `--bg-panel`, `--red-accent`, `--gold`, etc.
- Fontes: Noto Serif JP + Inter
- Cards compactos escuros com hover
- Badge vermelho para armas "U" (desequilibradas)
- Cores por tipo de arma (Lâminas=vermelho, Hastes=azul, etc.)

---

## Alterações em Arquivos Existentes

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `index.html` | MODIFICAR | Adicionar link "📦 Arsenal" no header |
| `combat-calculator.html` | MODIFICAR | Adicionar link "📦 Arsenal" no header |
| `kegare-panico.html` | MODIFICAR | Adicionar link "📦 Arsenal" no header |
| `oracle-generators.html` | MODIFICAR | Adicionar link "📦 Arsenal" no header |
| `equipment-database.html` | NOVO | Página completa do banco de dados |

---

## Task Breakdown

### Fase 1: Dados JSON
- [ ] Montar `weaponsDB[]` com 22 armas
- [ ] Montar `armorDB[]` com 13 armaduras
- [ ] Montar `gearDB[]` com 20+ equipamentos/ocultismo

### Fase 2: Layout e CSS
- [ ] Criar `equipment-database.html` com design tokens
- [ ] Header com título + nav links
- [ ] Barra de pesquisa estilizada
- [ ] Filtros por categoria (toggle buttons)
- [ ] Cards de item compactos e responsivos
- [ ] Responsivo para mobile (≤ 768px)

### Fase 3: Motor de Busca (JS)
- [ ] `keyup` listener com debounce 150ms
- [ ] Normalização: lowercase + sem acentos
- [ ] Filtro simultâneo dos 3 arrays
- [ ] Filtro por categoria combinável com busca
- [ ] Animação suave nos cards

### Fase 4: Navegação Cross-Page
- [ ] Adicionar link "📦 Arsenal" em `index.html`
- [ ] Adicionar link "📦 Arsenal" em `combat-calculator.html`
- [ ] Adicionar link "📦 Arsenal" em `kegare-panico.html`
- [ ] Adicionar link "📦 Arsenal" em `oracle-generators.html`

### Fase 5: Verificação
- [ ] Busca parcial: "kata" → Katana
- [ ] Filtros isolados funcionam
- [ ] Busca + filtro combinados
- [ ] Todos os dados conferem com documentos fonte
- [ ] Links de navegação funcionam entre páginas
- [ ] Mobile responsivo (375px)

---

## Verificação Final

| Critério | Teste |
|----------|-------|
| Dados corretos | Cada item bate com documento fonte |
| Busca funcional | "kata" → Katana, "veneno" → items com veneno |
| Filtros | "Armaduras" → só armaduras |
| Busca + filtro | "Armas" + "esm" → Tetsubo, Bo, Otsuchi |
| Responsivo | Viewport 375px sem quebra |
| Navegação | Todos os links cross-page funcionam |
| Performance | Sem lag ao digitar |
