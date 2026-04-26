# ⚔️ DAIMYO VTT: ESPECIFICAÇÃO TÉCNICA DE COMBATE GURPS (PRO-MAX)

Este documento é o guia definitivo de fluxos e variáveis para o motor de combate do Daimyo VTT. Ele detalha todas as capacidades, restrições e interações de cada ação.

---

## 🏗️ 1. O MOTOR DE MANOBRAS (`CombatActionEngine`)

Cada manobra selecionada no turno altera o estado do personagem. Abaixo, a lógica de fluxo para cada uma.

### 1.1 Ataque (`Attack`)
*   **Pode**: Atacar com qualquer arma pronta; Dar 1 passo (1 hex); Usar qualquer defesa ativa.
*   **Não Pode**: Atacar duas vezes (exceto se tiver vantagem específica); Mover mais que 1 passo.
*   **Variáveis**:
    *   `attack-variant: standard`: Sem bônus/penalidades.
    *   `attack-variant: deceptive`: -2 NH atacante = -1 Defesa alvo (cumulativo).

### 1.2 Ataque Total (`All-Out Attack`)
*   **Pode**: Mover até metade do deslocamento; Escolher uma das 4 variantes.
*   **Não Pode**: **DEFENDER**. O estado `noDefenseThisTurn` é setado como `true` até o início do próximo turno.
*   **Fluxos de Variantes**:
    *   **Determinado**: `attackBonus = +4`.
    *   **Forte**: `damageBonus = +2` (ou +1 por dado).
    *   **Duplo**: `attackCount = 2`. Dois testes de NH.
    *   **Longo**: `weaponReach += 1`.

### 1.3 Ataque Defensivo (`Defensive Attack`)
*   **Pode**: Atacar com arma pronta; +1 na Aparagem/Bloqueio ou +2 na Esquiva.
*   **Não Pode**: Causar dano total (`damagePenalty = -2` ou -1/dado).

### 1.4 Finta (`Feint`)
*   **Fluxo**: Disputa Rápida (Atacante DX/ST/IQ vs Defensor DX/ST/IQ).
*   **Resultado**: Se `Atacante > Defensor`, armazena `feintPenalty = Margem de Vitória` no alvo para o próximo ataque do personagem.
*   **Restrição**: Só afeta o próximo ataque realizado pelo personagem contra *este* alvo específico.

### 1.5 Esperar (`Wait`)
*   **Fluxo**: O personagem não age no seu número de iniciativa. Ele define um `waitTrigger`.
*   **Resolução**: Se o gatilho ocorrer, o personagem interrompe o turno do outro. Se não ocorrer, ele perde a ação, mas mantém suas defesas.

---

## 🤺 2. O FLUXO DE ATAQUE (STEP-BY-STEP)

Ao clicar em "Atacar", o motor processa:

1.  **Validação de Prontidão**: A arma está `ready`? Se não, erro.
2.  **Cálculo de NH Base**: Pega o nível da Perícia (ex: Espada Larga).
3.  **Aplicação de Modificadores de Estado**:
    *   `shockPenalty`: Subtrai dano recebido no turno anterior (max -4).
    *   `posturePenalty`: Em pé (0), Ajoelhado (-2), Deitado (-4).
    *   `evaluateBonus`: Adiciona bônus acumulado de Avaliações anteriores.
4.  **Modificadores Situacionais**:
    *   `rangePenalty`: Baseado em `rangeMeters`.
    *   `hitLocationPenalty`: Torso (0), Cabeça (-7), Vitais (-3), etc.
    *   `sizeModifier`: SM do alvo.
5.  **Variantes de Ataque**:
    *   `rapidStrike`: -6 NH (-3 se Weapon Master).
    *   `dualWeapon`: -4 mão principal / -8 mão inábil.
6.  **Rolagem (3d6)**:
    *   Se `Resultado <= NH Final`: Sucesso. Calcula `Margin of Success`.
    *   Se `Resultado 3 ou 4`: Crítico Automático.
7.  **Transição**: Se sucesso, envia `CombatPrompt` de Defesa para o alvo.

---

## 🛡️ 3. O FLUXO DE DEFESA (STEP-BY-STEP)

Ao receber um `CombatPrompt`, o motor processa:

1.  **Check de Invalidez**:
    *   Alvo fez `All-Out Attack`? Se sim, `options = ["none"]`.
    *   Alvo está `Stunned` (Atordoado)? Se sim, defesas com -4.
    *   Ataque veio por trás (Flanco)? Se sim, Esquiva com -2 (se tiver Noção de Perigo), caso contrário, nenhuma defesa.
2.  **Cálculo de Alvos de Defesa**:
    *   **Esquiva**: `Velocidade Básica + 3 + Bônus de Recuo (+3)`.
    *   **Aparagem**: `(NH/2) + 3 + Bônus de Recuo (+1)`.
3.  **Penalidades Cumulativas**:
    *   `parryCount`: Cada aparagem após a primeira no mesmo turno sofre -4 (-2 para Esgrima).
4.  **Resolução**:
    *   Se `Sucesso na Defesa`: Ataque anulado.
    *   Se `Falha na Defesa`: Transição para `resolving-damage`.

---

## 🧪 4. CATÁLOGO EXAUSTIVO DE TÉCNICAS DE COMBATE

As técnicas permitem "comprar" de volta penalidades de ataques difíceis. No VTT, elas devem ser selecionadas como substitutos do ataque padrão.

### 4.1 Técnicas Ofensivas Realistas
| Técnica | Perícia Base | Penalidade (Default) | Efeito Mecânico |
| :--- | :--- | :---: | :--- |
| **Ataque Direcionado (Face)** | Qualquer | -5 | Multiplicador x1; Teste de nocaute se dano > HP/2. |
| **Ataque Direcionado (Órgãos Vitais)** | Qualquer | -3 | Multiplicador x3 para imp/pi. |
| **Ataque Direcionado (Pescoço)** | Qualquer | -5 | Mult. x1.5 (cut), x2 (imp). Decapitação possível. |
| **Ataque Direcionado (Olho)** | Qualquer | -9 | Ignora RD; Nocaute imediato se dano > 0. |
| **Chute (`Kicking`)** | Briga/Karate | -2 | Dano esm+1; Teste de DX se errar para não cair. |
| **Cotovelada (`Elbow Strike`)** | Briga/Karate | -2 | Dano esm+1; Requer Alcance C. |
| **Joelhada (`Knee Strike`)** | Briga/Karate | -1 | Dano esm+1; Requer Alcance C. |
| **Cabeçada (`Headbutt`)** | Briga/Karate | -1 | Dano esm; Alvo faz teste de nocaute. |
| **Desarmar (`Disarm`)** | Qualquer | 0 / Var. | Disputa de NH; Se vencer, o alvo derruba a arma. |
| **Finta (Técnica)** | Qualquer | NH Base | Aumenta o NH apenas para a manobra de Finta. |
| **Luta no Chão (`Ground Fighting`)**| Qualquer | -4 | Elimina penalidades por estar deitado. |

### 4.2 Técnicas Defensivas e de Contra-Ataque
| Técnica | Perícia Base | Penalidade (Default) | Efeito Mecânico |
| :--- | :--- | :---: | :--- |
| **Aparagem Agressiva** | Briga/Karate | -1 / -2 | Se aparar com sucesso, causa dano no membro do atacante. |
| **Contra-Ataque** | Qualquer | -2 | Só pode ser usada após uma defesa bem sucedida contra o mesmo alvo. |
| **Riposta (`Riposte`)** | Espada/Esgrima | Var. | Aceita -1 no Aparar para dar -1 na Defesa do alvo no próximo turno. |
| **Defesa Oportuna (`Timed Defense`)**| Defesa Ativa | NH-2 | Teste de defesa contra ataques "invisíveis" ou surpresa. |
| **Ataque Duplo (`Dual-Weapon`)** | Qualquer | -4 / -8 | Ataca com as duas mãos como uma única ação. |
| **Ataque Rodopiante** | Qualquer | -5 / Var. | Um ataque contra cada inimigo em hexágonos adjacentes. |
| **Ataque Surpresa (Iai)** | Iaijutsu | 0 | Requer Sacar Rápido; Alvo tem -1 na Defesa. |
| **Kiai (Grito)** | Kiai (HT) | Disputa | Atordoa o alvo mentalmente se vencer a disputa. |
| **Pontos de Pressão** | IQ/D | NH-5 | Ataque que ignora RD para causar paralisia ou dor. |
| **Ataque Voador** | Karate/Salto | NH-4 | Dano aumentado baseado na distância saltada. |
| **Golpe de Mão de Ferro** | Karate | NH-3 | Aumenta drasticamente o dano de contusão das mãos. |

---

## 🩹 5. RESOLUÇÃO DE DANO E TRAUMA AVANÇADO

1.  **Dano de Contusão (cr)**: Se `Dano Penetrante > 0`, sempre causa no mínimo 1 de Ferimento.
2.  **Dano de Corte (cut)**: Multiplica o dano que passou a RD por 1.5.
3.  **Trauma Grave**:
    *   Se `Ferimento > HP/2`: O personagem cai e deve testar HT para não desmaiar.
    *   Se `HP <= 0`: Deve testar HT a cada turno para não morrer.
    *   Se `HP <= -1 * HP Máximo`: Teste de Morte imediato.

---

## 🌀 6. TABELA DE ESTADOS E POSTURAS (REFERÊNCIA DE FLUXO)

| Estado | Custo Mov. | Mod. Ataque | Mod. Defesa | Pode Esquivar? |
| :--- | :---: | :---: | :---: | :---: |
| **Atordoado** | Nenhum | N/A | -4 | Sim |
| **Caído** | 2 | -4 | -3 | Sim |
| **Ajoelhado** | 1/3 | -2 | -2 | Sim |
| **Crouching** | 2/3 | -2 | 0 | Sim |
| **Grappled** | Nenhum | -4 | -4 | Não (Exceto Esquiva) |

---

## 💮 7. REGRAS ESPECÍFICAS: A ERA DAS ESPADAS QUEBRADAS

Estas regras são exclusivas do cenário e devem ser priorizadas pelo motor do VTT.

### 7.1 Níveis de Maestria e Slots (Regra Pág. 45)
O número de **Slots de Memória Muscular** (Manobras Avançadas equipáveis) depende do NH na perícia principal:
*   **Nível Shoden (NH 12-14):** 1 Slot.
*   **Nível Chuden (NH 15-16):** 2 Slots.
*   **Nível Okuden (NH 17+):** 3 Slots.
*   **Nível Menkyo Kaiden (NH 20+):** 4 Slots.

### 7.2 Lógica de Iaijutsu (Sacar e Cortar)
*   **Ataque Surpresa (`iai-strike`)**: Requer que a arma esteja na bainha.
*   **Fluxo**: Teste de `Sacar Rápido` -> Se sucesso, realiza um `Attack` imediato. O alvo tem **-1 na Defesa Ativa** por não estar esperando o golpe.

### 7.3 Kiai e Projeção Espiritual (`Kiai`)
*   **Fluxo**: Teste de `Kiai (HT)` vs `Vontade` do alvo.
*   **Efeito**: Se o usuário vencer, o alvo fica **Atordoado Mentalmente** por 1 turno.

### 7.4 Qualidades de Cenário (Perks)
*   **Postura da Montanha**: O personagem é imune a recuos forçados (knockback) de ataques que causem menos de 10 de dano.
*   **Pé Firme**: Ignora penalidades de terreno instável (lama, neve, convés de navio).
*   **Vínculo com Arma**: +1 no NH efetivo com uma arma específica.

---

## 🎖️ 8. CAPACIDADES ESPECIAIS E VANTAGENS DE COMBATE

Estas vantagens alteram a lógica base do motor de combate:

### 7.1 Reflexos em Combate (`Combat Reflexes`)
*   **Fluxo de Defesa**: +1 em todas as Defesas Ativas.
*   **Fluxo de Atordoamento**: +2 em testes de HT para se recuperar de atordoamento físico.
*   **Fluxo de Iniciativa**: +1 em testes de iniciativa.

### 7.2 Mestre de Armas / Especialista em Artes Marciais (`Weapon Master`)
*   **Fluxo de Ataque**: Penalidade de `Rapid Strike` é reduzida para -3 por ataque (em vez de -6).
*   **Fluxo de Dano**: Bônus de +1 no dano por dado (se NH for 16+) ou +2 por dado (se NH for 20+).
*   **Fluxo de Aparagem**: Penalidade de aparagens múltiplas com a arma é reduzida para -2 (como se fosse esgrima).

### 7.3 Ataque Extra (`Extra Attack`)
*   **Fluxo de Manobra**: Permite realizar um segundo `Attack` ou `Feint` sem penalidade de `Rapid Strike`. 
*   **Restrição**: Não pode ser usado junto com `All-Out Attack (Double)`.

### 7.4 Hipoalgia (`High Pain Threshold`)
*   **Fluxo de Dano**: O personagem ignora completamente o `shockPenalty`.
*   **Fluxo de Trauma**: +3 em testes de HT para evitar nocaute ou atordoamento por Ferimento Grave.

---

> [!IMPORTANT]
> **Nota de Implementação:** O VTT deve verificar a presença destas tags no `characterProfile` antes de iniciar qualquer cálculo de `NH Final` ou `DefenseTarget`.
