# Milestone 3: Geradores Procedurais e Oráculos — Escudo do Daimyo

## Visão Geral

Módulo de improvisação para o Mestre de "A Era das Espadas Quebradas". Três ferramentas procedurais em um único arquivo `.html` (estilo `combat-calculator.html`), reutilizando a estética Japão Feudal Dark Mode já estabelecida. **Não interfere no Motor de Combate.**

**Tipo de Projeto:** WEB (Single-file HTML/CSS/JS)
**Agente Primário:** `frontend-specialist`

---

## Confirmação de Entendimento das Mecânicas

### 1. Teste de Reação Social (Reaction Roll)

**Fórmula:** `3d6 + Modificador` (input numérico, positivo ou negativo).

A Tabela de Reação é extraída diretamente do livro [Japão RPG 1.0.md](file:///c:/Users/richa/Documents/Programação%202026.1/antigravity-project/rpg-data-md/Japão%20RPG%201.0.md) (linhas 3082-3101), adaptada com as faixas especificadas pelo usuário:

| Resultado Final | Nível       | Descrição Narrativa (do cenário)                         |
|-----------------|-------------|----------------------------------------------------------|
| ≤ 0            | Desastroso  | Ódio mortal. Ataca ou trai na primeira chance.           |
| 1–3             | Muito Ruim  | (Mesma faixa do livro) — Antipatia forte, prejudica ativamente. |
| 4–6             | Ruim        | Hostil. Nega ajuda, chama guardas.                       |
| 7–9             | Fraco       | Desconfiado. Ajuda só se muito bem pago.                 |
| 10–12           | Neutro      | Indiferente. Ignora se puder.                            |
| 13–15           | Bom         | Prestativo. Aceita negociar.                             |
| 16–18           | Muito Bom   | Amigável. Oferece abrigo e ajuda.                        |
| 19+             | Excelente   | Fã/Leal. Arrisca a vida para ajudar.                     |

> [!NOTE]
> **Motor:** Reutiliza `roll3d6()` do combat-calculator. O modificador é somado ao total dos 3d6 **antes** da consulta à tabela, podendo gerar resultados ≤ 0 ou ≥ 19.

**Fluxo de dados:**
```
Input: Modificador (int, pode ser negativo)
  → roll3d6() → { dice: [d1,d2,d3], total }
  → finalResult = total + modificador
  → Lookup na tabela de faixas → { nível, descrição, cor }
  → Render resultado + Log no histórico
```

---

### 2. Oráculo de Trama (d66 – Ação e Tema)

**Mecânica d66:** Dois dados de 6 faces independentes. O primeiro define a **dezena** (1-6) e o segundo a **unidade** (1-6). Isso gera 36 resultados possíveis (11 a 66), **NÃO** 6×6=36 numéricos contínuos  — os valores válidos são `{11,12,...,16, 21,22,...,26, ..., 61,...,66}`.

**Implementação:**
```javascript
function rollD66() {
  const tens = Math.floor(Math.random() * 6) + 1;
  const units = Math.floor(Math.random() * 6) + 1;
  return { tens, units, key: `${tens}${units}` };
}
```

O `key` (ex: `"31"`) é a chave de lookup em dois objetos/mapas:
- `ACTION_TABLE[key]` → string de ação (ex: `"Investigar"`)
- `THEME_TABLE[key]` → string de tema (ex: `"Segredo"`)

**Matriz de Ação (36 entradas):**
```
11=Atacar, 12=Defender, 13=Viajar, 14=Fugir, 15=Esperar, 16=Destruir,
21=Proteger, 22=Servir, 23=Vingar, 24=Jurar, 25=Desafiar, 26=Render-se,
31=Investigar, 32=Esconder, 33=Buscar, 34=Encontrar, 35=Negociar, 36=Trair,
41=Conquistar, 42=Sacrificar, 43=Purificar, 44=Corromper, 45=Revelar, 46=Ocultar,
51=Libertar, 52=Aprisionar, 53=Honrar, 54=Desonrar, 55=Unir, 56=Dividir,
61=Roubar, 62=Oferecer, 63=Observar, 64=Ignorar, 65=Suplicar, 66=Comandar
```

**Matriz de Tema (36 entradas):**
```
11=Sangue, 12=Honra, 13=Dever, 14=Clã, 15=Guerra, 16=Paz,
21=Aço, 22=Fogo, 23=Amor, 24=Ódio, 25=Vida, 26=Morte,
31=Segredo, 32=Verdade, 33=Mentira, 34=Passado, 35=Futuro, 36=Destino,
41=Ouro, 42=Terra, 43=Mar, 44=Montanha, 45=Floresta, 46=Rio,
51=Espírito, 52=Maldição, 53=Lâmina, 54=Veneno, 55=Sombra, 56=Luz,
61=Traição, 62=Lealdade, 63=Sacrifício, 64=Ambição, 65=Loucura, 66=Profecia
```

**Output:** `"[Ação] + [Tema]"` → Ex: `"Investigar Segredo"` — Prompt criativo para o Mestre improvisar.

---

### 3. Gerador Rápido de NPC

**Concatenação de strings para Nomes:**

Os prefixos e sufixos são inspirados pelo [Gerador de Clãs Aleatório](file:///c:/Users/richa/Documents/Programação%202026.1/antigravity-project/rpg-data-md/O%20Atlas%20do%20Mundo%201.0.md) (Apêndice A, linha 1517) e pelo [Gerador de Identidades](file:///c:/Users/richa/Documents/Programação%202026.1/antigravity-project/rpg-data-md/Japão%20RPG%201.0.md) (Apêndice D, linha 3743).

```javascript
// Sobrenome (Clã/Família) — geográfico, como no cenário
const PREFIXOS = ['Yama', 'Kawa', 'Mori', 'Ishi', 'Taka', 'Fuji', 'Kuro', 'Shiro'];
const SUFIXOS  = ['mura', 'da', 'guchi', 'sawa', 'moto', 'zaki', 'shima', 'hara'];

// Nome = prefix aleatório + sufixo aleatório
// Ex: "Yama" + "guchi" = "Yamaguchi"
```

O sistema também gera um **nome próprio** (primeiro nome) usando listas separadas de nomes masculinos e femininos extraídos do Apêndice D.

**Segredo/Motivação:** Sorteio aleatório de um array:
```javascript
const SEGREDOS = [
  'Dívida de sangue com clã ninja',
  'Herdeiro de linhagem maculada',
  'Guarda um tesouro roubado',
  'Informante de Otsuko',
  'Busca vingança contra Bizen',
  'Fobia de fogo'
];
```

> [!TIP]
> Podemos expandir com dados reais do cenário: as 6 Especialidades de Clã ([O Atlas do Mundo 1.0.md](file:///c:/Users/richa/Documents/Programação%202026.1/antigravity-project/rpg-data-md/O%20Atlas%20do%20Mundo%201.0.md), linhas 1523-1541), dando ao NPC uma **Especialidade** além do Segredo.

---

## Critérios de Sucesso

| # | Critério                                                      | Verificação               |
|---|---------------------------------------------------------------|---------------------------|
| 1 | Modificador negativo (-5) + rolagem 4 = resultado -1 → "Desastroso" | Teste manual no browser   |
| 2 | d66 gera apenas valores válidos (11-66, sem 7,8,9,0)          | Console: 100 rolagens     |
| 3 | NPC sempre exibe `Sobrenome + Nome + Segredo`                 | Clicar 20x, sem `undefined` |
| 4 | Arquivo `oracle-generators.html` funciona standalone (file://) | Abrir sem servidor        |
| 5 | Estética Dark Mode idêntica ao `combat-calculator.html`       | Visual comparison         |
| 6 | Histórico persiste em `localStorage` (chave diferente)        | Refresh → dados preservados |
| 7 | Não interfere com `combat-calculator.html`                    | Ambos abertos em paralelo |

---

## Stack Técnico

| Camada      | Tecnologia                  | Justificativa                                  |
|-------------|-----------------------------|-------------------------------------------------|
| Estrutura   | HTML5 semântico              | Single-file, zero dependências                  |
| Estilo      | CSS Vanilla (tokens do calculator) | Consistência com a Dark Mode Feudal existente  |
| Lógica      | JavaScript ES6+              | Mesma engine pura, `roll3d6()` reimplementada   |
| Persistência| `localStorage`               | Chave separada: `espadas_quebradas_oracles`     |
| Fontes      | Noto Serif JP + Inter        | Mesma identidade tipográfica                    |

---

## Estrutura de Arquivo

```
antigravity-project/
├── combat-calculator.html    # Milestone 1-2 (NÃO MODIFICAR)
├── kegare-panico.html        # Existente (NÃO MODIFICAR)
├── oracle-generators.html    # ← NOVO (Milestone 3)
├── docs/
│   └── PLAN-oracles-generators.md  # ← ESTE ARQUIVO
└── rpg-data-md/              # Fonte de dados (leitura)
```

---

## Task Breakdown

### T1: Estrutura CSS e Layout
- **Agente:** `frontend-specialist`
- **Skill:** `frontend-design`
- **INPUT:** Design tokens do `combat-calculator.html`
- **OUTPUT:** CSS completo com 3 painéis (Reação | Oráculo | NPC) + área de histórico
- **VERIFY:** Layout 3-colunas renderiza sem scroll em 1366×768

### T2: Painel de Reação Social
- **Agente:** `frontend-specialist`
- **INPUT:** Tabela de faixas + `roll3d6()`
- **OUTPUT:** Input de modificador, botão "Rolar Reação", resultado com cor e descrição narrativa
- **VERIFY:** Mod -5 + rolar 4 = -1 → "Desastroso" (vermelho)

### T3: Oráculo de Trama (d66)
- **Agente:** `frontend-specialist`
- **INPUT:** `rollD66()` + 2 matrizes de 36 entradas
- **OUTPUT:** Ação + Tema exibidos com animação, botão "Consultar Oráculo"
- **VERIFY:** 100 rolagens no console → nenhum `undefined`, todos keys válidos

### T4: Gerador de NPC
- **Agente:** `frontend-specialist`
- **INPUT:** Arrays de prefixos, sufixos, nomes, segredos
- **OUTPUT:** Card de NPC com Sobrenome, Nome, Especialidade, Segredo
- **VERIFY:** 20 cliques → nenhum campo vazio ou repetição implausível

### T5: Histórico Persistente
- **Agente:** `frontend-specialist`
- **INPUT:** Todas as ações dos 3 painéis
- **OUTPUT:** Strip de histórico no rodapé com `localStorage`
- **VERIFY:** Refresh mantém dados; `clearHistory()` funciona

### T6: Verificação Final
- **Agente:** `frontend-specialist`
- **INPUT:** Arquivo completo
- **OUTPUT:** 7 critérios de sucesso passando
- **VERIFY:** Testes manuais no browser

---

## Phase X: Verificação

- [ ] Layout 3-colunas + histórico renderiza correto (desktop + mobile)
- [ ] Reação Social: math correta com modificadores extremos (-10, +10)
- [ ] d66: apenas chaves válidas geradas (11-66, sem dígitos 7-9,0)
- [ ] NPC: sem `undefined`, todos os campos preenchidos
- [ ] `localStorage` usa chave separada (`espadas_quebradas_oracles`)
- [ ] Não interfere com `combat-calculator.html` (chaves diferentes)
- [ ] Sem cores roxas/violeta (Purple Ban)
- [ ] Responsivo em ≤ 1024px (stack vertical)
