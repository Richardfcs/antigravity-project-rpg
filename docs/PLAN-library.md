# PLAN - Expansão da Biblioteca Digital (library.html)

## Visão Geral
Expandir significativamente a `library.html`, resolvendo problemas de layout e populando-a com uma vasta gama de conteúdos extraídos de `Japão RPG 1.0.md` e `O Grimório do Oculto 1.0.md`.

## Objetivos
1. **Curadoria de Dados (Data Extraction):** Mapear e extrair Vantagens, Desvantagens, Qualidades, Peculiaridades, Perícias, Estilos de Luta (Budô), Feitiços e Templates do Mundo Oculto.
2. **Refatoração de UI/UX (CSS & Layout):** Consertar o comportamento "achatado" (squashed) dos botões do menu lateral em resoluções menores, garantindo que o texto "Ver Tudo" e as contagens de categorias permaneçam legíveis.
3. **Rolagem (Scroll):** Melhorar a rolagem da `.results-area` para que o Mestre possa navegar fluidamente pelo mar de regras sem que o layout principal quebre ou esconda conteúdo.
4. **Desacoplamento Opcional:** Estruturar o banco da biblioteca para fácil leitura, inserindo um enorme volume de dados.

## Fases de Implementação

---

### Fase 1: Interface UI / Layout (`library.html`)

- **Correção Geral do Layout Grid/Flexbox:** 
  - Ajustar o menu lateral (`.sidebar`) no *media query* para usar `overflow-x: auto` e `flex-wrap: nowrap` em dispositivos móveis, transformando-o num carrossel com scroll horizontal nativo ao invés de pílulas achatadas que espremem o texto.
  - Remover a limitação de `height: calc(100vh - 100px)` no Mobile, ou flexibilizar o `.library-main`, `.sidebar`, e `.content-area` para utilizarem `display: flex` com `flex-direction: column` adequadamente.
  - O painel de resultados (`.results-area`) deverá possuir rolagem interna perfeita.

---

### Fase 2: Mapeamento de Dados Extras

- **Conteúdo de `Japão RPG 1.0.md` (A Adicionar):**
  - *Vantagens de Combate:* Reflexos em Combate, Hipoalgia, Boa Forma, Ambidestria, Treinamento de Espadachim.
  - *Vantagens Chi / Sociais:* Status, Riqueza, Patrono, Empatia, Noção do Perigo, Equilíbrio Perfeito, Sorte.
  - *Desvantagens:* Código de Honra (Bushido e Ninja), Sede de Sangue, Visão Aterradora, Voto (Não derramar sangue).
  - *Perícias:* Kenjutsu, Iaijutsu, Sobrevivência, Armadilha, Fisiologia (Yokai), Venenos, entre outras.
- **Conteúdo de `O Grimório do Oculto 1.0.md` (A Adicionar):**
  - *Metafísica:* O Véu (Kekkai), Ki, Mácula (Kegare), Musubi.
  - *Poderes & Vantagens Ocultas:* A Besta Interior, Empatia com Espíritos, Psicometria, Propósito Superior (Caçar o Oculto). 
  - *Doutrinas / Classes:* O Yamabushi (Fé Verdadeira / Exorcismo), A Miko, O Artesão de Almas (Kajiya).

## Aprovação Necessária

Confirme a aprovação do plano acima:
(Y) - Aprovar e iniciar Fase 2 e Refatoração.
(N) - Revisar algo no escopo (Ex: externalizar JS para arquivar separado).
