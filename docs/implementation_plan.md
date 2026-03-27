# Milestone Final — Controle de Tempo & Persistência de Estado

## Contexto

O "Escudo do Daimyo" atualmente possui 5 páginas com estados independentes. Combatentes criados no `index.html` não existem no `kegare-panico.html` e vice-versa. O Milestone Final unifica o estado e adiciona mecânicas de tempo (Sangramento e Descanso) em uma nova página dedicada.

---

## User Review Required

> [!IMPORTANT]
> **Novo atributo HT:** Será adicionado ao formulário de criação de combatentes no `index.html`. Combatentes migrados do formato antigo receberão HT = 10 (padrão GURPS).

> [!IMPORTANT]
> **Nome da nova página:** `time-management.html` — "Controle de Tempo: Sangramento & Descanso". Acessível via botão no header das páginas de combate.

> [!WARNING]
> **Migração de dados:** Combatentes salvos nos formatos antigos (`kegare_combatants`) serão automaticamente migrados para o novo formato unificado (`daimyoShieldState`). As chaves antigas serão removidas após migração bem-sucedida.

---

## Arquitetura de Estado Unificado

### Chave localStorage: `daimyoShieldState`

```javascript
{
  combatants: [
    {
      id: "c1",
      name: "Samurai Ronin",
      hpMax: 12, hpCur: 12,
      fpMax: 10, fpCur: 10,
      speed: 5.75,
      dx: 12,
      dr: 3,
      ht: 11,          // NOVO — Saúde (Health)
      will: 12,         // MIGRADO do kegare
      shockPenalty: 0,
      conditions: [],
      isBleeding: false, // NOVO — auto-set quando hpCur < 0
      isActive: true
    }
  ],
  combat: {
    activeIndex: -1,
    round: 0,
    isStarted: false,
    nextId: 1
  },
  kegare: {
    level: 1           // MIGRADO do localStorage separado
  },
  history: [],          // MIGRADO do escudo_daimyo_history
  kegareLog: []         // MIGRADO do kegare_log
}
```

### Fluxo de Dados Cross-Page

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  index.html │     │ kegare-panico.html│     │ time-management  │
│  (Iniciativa│     │ (Sanidade)        │     │ (Sangramento &   │
│  + Dano)    │     │                   │     │  Descanso)       │
└──────┬──────┘     └────────┬──────────┘     └────────┬─────────┘
       │                     │                          │
       │    saveState()      │     saveState()          │  saveState()
       └─────────┬───────────┴──────────┬───────────────┘
                 │                      │
                 ▼                      ▼
        ┌─────────────────────────────────────┐
        │  localStorage: 'daimyoShieldState'  │
        │  (Fonte Única de Verdade)           │
        └─────────────────────────────────────┘
```

**Regra:** Toda página lê o estado no `DOMContentLoaded` e salva via `saveState()` após qualquer mutação.

---

## Proposed Changes

### Componente 1: Shared State Module (Lógica Reutilizável)

O módulo de estado será definido **inline em cada página** (sem build system), mas com API idêntica para garantir consistência.

#### Funções Compartilhadas (copiar em cada página que lida com combatentes):

```javascript
// --- STATE API ---
const STATE_KEY = 'daimyoShieldState';

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return getDefaultState();
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function getDefaultState() {
  return {
    combatants: [],
    combat: { activeIndex: -1, round: 0, isStarted: false, nextId: 1 },
    kegare: { level: 1 },
    history: [],
    kegareLog: []
  };
}

// --- MIGRATION ---
function migrateOldData() {
  const existing = localStorage.getItem(STATE_KEY);
  if (existing) return; // já migrou

  const state = getDefaultState();

  // Migrar kegare_combatants
  try {
    const old = JSON.parse(localStorage.getItem('kegare_combatants'));
    if (old?.combatants) {
      old.combatants.forEach(c => {
        state.combatants.push({
          ...c,
          speed: c.speed || 5.0,
          dx: c.dx || 10,
          ht: c.ht || 10,
          will: c.will || 10,
          isBleeding: (c.hpCur < 0),
          isActive: true,
          shockPenalty: c.shockPenalty || 0
        });
      });
      state.combat.nextId = old.nextId || state.combatants.length + 1;
    }
  } catch {}

  // Migrar kegare level
  const kLevel = localStorage.getItem('kegare_level');
  if (kLevel) state.kegare.level = parseInt(kLevel) || 1;

  // Migrar históricos
  try {
    const hist = JSON.parse(localStorage.getItem('escudo_daimyo_history'));
    if (hist) state.history = hist;
  } catch {}
  try {
    const kLog = JSON.parse(localStorage.getItem('kegare_log'));
    if (kLog) state.kegareLog = kLog;
  } catch {}

  saveState(state);

  // Limpar chaves antigas
  ['kegare_combatants', 'kegare_level', 'kegare_log', 'escudo_daimyo_history']
    .forEach(k => localStorage.removeItem(k));
}
```

---

### Componente 2: Nova Página

#### [NEW] [time-management.html](file:///c:/Users/richa/Documents/Programa%C3%A7%C3%A3o%202026.1/antigravity-project/time-management.html)

Página dedicada ao controle de tempo com duas mecânicas:

**Layout:**

```
┌───────────────────────────────────────────────────────────────────────┐
│  ⚔ Escudo do Daimyo              [⚔ COMBATE] [🔮 ORÁCULO] [📦 ARSENAL] │
│                        [⏱ Tempo] [🧠 Sanidade] [🎲 Calculador]        │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────── LEFT PANEL ──────────┐  ┌──── RIGHT PANEL ──────────┐ │
│  │                                   │  │                           │ │
│  │  👥 COMBATENTES (Estado Atual)    │  │  ⏱ CONTROLE DE TEMPO      │ │
│  │                                   │  │                           │ │
│  │  ┌─────────────────────────────┐  │  │  ┌─────────────────────┐  │ │
│  │  │ Samurai Ronin               │  │  │  │ ⏱ Avançar 1 Minuto  │  │ │
│  │  │ PV: -3/12  PF: 8/10        │  │  │  │                     │  │ │
│  │  │ HT: 11  🩸 SANGRANDO       │  │  │  │ Rola 3d6 vs HT de  │  │ │
│  │  │ ████████░░░░ ████████████   │  │  │  │ cada combatente     │  │ │
│  │  └─────────────────────────────┘  │  │  │ sangrando.          │  │ │
│  │                                   │  │  └─────────────────────┘  │ │
│  │  ┌─────────────────────────────┐  │  │                           │ │
│  │  │ Ninja Kage                  │  │  │  ┌─────────────────────┐  │ │
│  │  │ PV: 5/10   PF: 2/8         │  │  │  │ 💤 Descansar 10 Min │  │ │
│  │  │ HT: 10  ⚡ EXAUSTO          │  │  │  │                     │  │ │
│  │  │ ████████████ ████░░░░░░░░   │  │  │  │ Todos recuperam     │  │ │
│  │  └─────────────────────────────┘  │  │  │ +1 PF (máx PF Máx). │  │ │
│  │                                   │  │  └─────────────────────┘  │ │
│  │  (Leitura do estado unificado)    │  │                           │ │
│  └───────────────────────────────────┘  │  ┌─────────────────────┐  │ │
│                                          │  │ 📜 Log de Eventos   │  │ │
│                                          │  │ 15:32 Ronin falhou  │  │ │
│                                          │  │ no teste de         │  │ │
│                                          │  │ Sangramento (-1PV)  │  │ │
│                                          │  │ 15:32 Kage          │  │ │
│                                          │  │ estabilizou.        │  │ │
│                                          │  └─────────────────────┘  │ │
│                                          └──────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

**Lógica JavaScript:**

1. **Avançar 1 Minuto (Sangramento)**
```javascript
function advanceOneMinute(state) {
  const results = [];
  state.combatants.forEach(c => {
    // Auto-detect bleeding
    if (c.hpCur < 0) c.isBleeding = true;
    if (c.hpCur >= 0) c.isBleeding = false;

    if (!c.isBleeding) return;

    const roll = roll3d6();
    if (roll.total > c.ht) {
      // Falha — perde 1 PV
      c.hpCur -= 1;
      results.push({
        name: c.name, roll: roll.total, ht: c.ht,
        success: false,
        msg: `${c.name} falhou no teste de Sangramento`
            + ` (${roll.total} > HT ${c.ht}) e perdeu 1 PV.`
            + ` PV Atual: ${c.hpCur}`
      });
    } else {
      // Sucesso — estabiliza este minuto
      results.push({
        name: c.name, roll: roll.total, ht: c.ht,
        success: true,
        msg: `${c.name} estabilizou o sangramento neste minuto.`
            + ` (${roll.total} ≤ HT ${c.ht})`
      });
    }
  });
  return results;
}
```

2. **Descansar 10 Minutos (Recuperação de PF)**
```javascript
function restTenMinutes(state) {
  const results = [];
  state.combatants.forEach(c => {
    if (c.fpCur < c.fpMax) {
      c.fpCur = Math.min(c.fpMax, c.fpCur + 1);
      results.push(`${c.name} recuperou +1 PF (${c.fpCur}/${c.fpMax})`);
    }
  });
  if (results.length === 0) {
    return ['Nenhum combatente precisava recuperar PF.'];
  }
  return results;
}
```

3. **Cards de Combatente (somente leitura)**
   - Mostram: Nome, PV/PF com barras, HT, status tags
   - Não permitem edição (combatentes criados no `index.html`)
   - Atualizam em tempo real após cada ação de tempo

---

### Componente 3: Modificações em Páginas Existentes

#### [MODIFY] [index.html](file:///c:/Users/richa/Documents/Programa%C3%A7%C3%A3o%202026.1/antigravity-project/index.html)

| Mudança | Detalhe |
|---------|---------|
| **Adicionar campo HT** | Input `HT` no formulário, ao lado de DX e RD |
| **Adicionar campo Will** | Input `Vontade` no formulário (migrar do kegare) |
| **Objeto combatante** | Incluir `ht`, `will`, `isBleeding` na criação |
| **State API** | Substituir `state` local por `loadState()/saveState()` |
| **Auto-bleed** | Ao aplicar dano e PV ficar < 0, setar `isBleeding = true` |
| **Tag 🩸 Sangrando** | Card exibe tag vermelha pulsante quando `isBleeding` |
| **Nav link** | Adicionar botão `⏱ Tempo` no header |
| **Migração** | Chamar `migrateOldData()` no init |
| **Salvar estado** | Toda mutação chama `saveState(state)` |
| **Restaurar estado** | Init → `loadState()` restaura combatentes |

#### [MODIFY] [kegare-panico.html](file:///c:/Users/richa/Documents/Programa%C3%A7%C3%A3o%202026.1/antigravity-project/kegare-panico.html)

| Mudança | Detalhe |
|---------|---------|
| **State API** | Substituir estado local por `loadState()/saveState()` |
| **Combatentes compartilhados** | Ler do `daimyoShieldState.combatants` |
| **Kegare level** | Ler/salvar de `daimyoShieldState.kegare.level` |
| **Log** | Ler/salvar de `daimyoShieldState.kegareLog` |
| **Nav link** | Adicionar botão `⏱ Tempo` no header |
| **Migração** | Chamar `migrateOldData()` no init |

#### [MODIFY] combat-calculator.html, oracle-generators.html, equipment-database.html

| Mudança | Detalhe |
|---------|---------|
| **Nav link** | Adicionar botão `⏱ Tempo` no header (apenas link) |

---

## Task Breakdown

### Fase 1: Infraestrutura de Estado
- [ ] 1.1 Refatorar `index.html` para usar estado compartilhado
  - Adicionar campos HT e Will ao formulário
  - Substituir state local por loadState/saveState
  - Auto-detect isBleeding quando PV < 0 (no applyDamage)
  - Tag 🩸 no card de combatente
- [ ] 1.2 Refatorar `kegare-panico.html` para usar estado compartilhado
  - Ler combatentes do estado unificado
  - Salvar kegare level no estado unificado
  - Migração automática de dados antigos

### Fase 2: Nova Página
- [ ] 2.1 Criar `time-management.html`
  - Layout 2 colunas: combatentes (esquerda) + controles (direita)
  - Design system: dark mode feudal, tokens existentes
- [ ] 2.2 Implementar "Avançar 1 Minuto" (Sangramento)
  - Loop combatentes com isBleeding
  - Roll 3d6 vs HT, falha → -1 PV, sucesso → estabiliza
- [ ] 2.3 Implementar "Descansar 10 Minutos"
  - Todos +1 PF (cap), log sumarizado
- [ ] 2.4 Log de eventos com timestamp

### Fase 3: Navegação
- [ ] 3.1 Adicionar botão `⏱ Tempo` em todas as páginas

### Fase 4: Verificação
- [ ] 4.1 Criar combatente no index → verificar aparece no time-management
- [ ] 4.2 Aplicar dano até PV < 0 → verificar isBleeding = true
- [ ] 4.3 Avançar 1 minuto → verificar roll vs HT correto
- [ ] 4.4 Descansar 10 min → verificar PF +1 capped
- [ ] 4.5 Fechar e reabrir → verificar estado persiste
- [ ] 4.6 Migração de dados antigos → formato novo

---

## Verification Plan

### Automated Tests (console)
```
Sangramento: PV < 0, HT 11, roll 12 → falha → -1 PV
Sangramento: PV < 0, HT 11, roll 10 → sucesso → PV inalterado
Descanso: PF 8/10 → rest → PF 9/10
Descanso: PF 10/10 → rest → PF 10/10 (cap)
Migração: kegare_combatants → daimyoShieldState → chave antiga removida
Persistência: saveState → reload → loadState === salvo
```

### Manual Verification
- Criar 2 combatentes no `index.html` com HT definido
- Aplicar dano até PV < 0 em um deles
- Navegar para `time-management.html` → combatente aparece com 🩸
- Clicar "Avançar 1 Minuto" → log mostra resultado
- Clicar "Descansar 10 Min" → PF sobe
- Fechar e reabrir → tudo persiste
- Navegar para `kegare-panico.html` → mesmos combatentes visíveis
