/**
 * ════════════ ARSENAL DE DADOS GURPS 4E - ESCUDO DO DAIMYO ════════════
 * Banco de dados centralizado de Equipamentos, Armas e Armaduras.
 */

const weaponsDB = [
  { id: "w1", nome: "Katana (1 mão)", tipo: "Lâmina", dano: "GeB+1 cort / GdP+1 perf", alcance: "1", aparar: "0", forca: "10", notas: "Uso com uma mão. A espada padrão do samurai." },
  { id: "w2", nome: "Katana (2 mãos)", tipo: "Lâmina", dano: "GeB+2 cort / GdP+1 perf", alcance: "1-2", aparar: "0", forca: "9†", notas: "Requer duas mãos. Maior dano e alcance." },
  { id: "w3", nome: "Wakizashi", tipo: "Lâmina", dano: "GeB cort / GdP perf", alcance: "1", aparar: "0", forca: "8", notas: "Espada curta de acompanhamento. Funciona em combate próximo (C)." },
  { id: "w4", nome: "Nodachi", tipo: "Lâmina", dano: "GeB+3 cort / GdP+2 perf", alcance: "1-2", aparar: "0U", forca: "12†", notas: "Grande espada. Desequilibrada — não apara se atacar." },
  { id: "w5", nome: "Tanto", tipo: "Lâmina", dano: "GeB-2 cort / GdP perf", alcance: "C, 1", aparar: "-1", forca: "6", notas: "Faca de samurai. Funciona em agarramento." },
  { id: "w6", nome: "Yari (1 mão)", tipo: "Haste", dano: "GdP+2 perf", alcance: "2", aparar: "0", forca: "9", notas: "Lança de uma mão. Rainha do campo de batalha." },
  { id: "w7", nome: "Yari (2 mãos)", tipo: "Haste", dano: "GdP+3 perf", alcance: "2-3", aparar: "0", forca: "9†", notas: "Lança longa com duas mãos. Controle de distância." },
  { id: "w8", nome: "Naginata", tipo: "Haste", dano: "GeB+2 cort / GdP+2 perf", alcance: "2-3", aparar: "0U", forca: "10†", notas: "Alabarda japonesa. Desequilibrada. Comum entre Sohei e mulheres samurais." },
  { id: "w9", nome: "Bo (Bastão)", tipo: "Haste", dano: "GeB+2 esm / GdP+1 esm", alcance: "1-2", aparar: "2", forca: "7†", notas: "Bastão longo. Bom aparar (+2). Não letal, mas quebra ossos." },
  { id: "w10", nome: "Tetsubo", tipo: "Esmagamento", dano: "GeB+4 esm", alcance: "1-2", aparar: "0U", forca: "13†", notas: "Maça de ferro brutal. Desequilibrada." },
  { id: "w11", nome: "Kusarigama", tipo: "Especialista", dano: "GeB+2 esm / GeB cort", alcance: "1-4", aparar: "0U", forca: "8†", notas: "Foice com corrente (Ninja). Difícil de bloquear." },
  { id: "w12", nome: "Jitte", tipo: "Especialista", dano: "GeB esm", alcance: "1", aparar: "0", forca: "6", notas: "Bastão de ferro policial. Usado para desarmar." },
  { id: "w13", nome: "Kunai", tipo: "Especialista", dano: "GeB-1 cort / GdP-1 perf", alcance: "C, 1", aparar: "-1", forca: "6", notas: "Faca ninja multiuso. Pode ser arremessada." },
  { id: "w14", nome: "Masakari", tipo: "Força Bruta", dano: "GeB+3 cort", alcance: "1", aparar: "0U", forca: "11", notas: "Machado de uma mão." },
  { id: "w15", nome: "Ono", tipo: "Força Bruta", dano: "GeB+4 cort", alcance: "1-2", aparar: "0U", forca: "12†", notas: "Machado grande. Requer duas mãos." },
  { id: "w16", nome: "Otsuchi", tipo: "Força Bruta", dano: "GeB+4 esm", alcance: "1-2", aparar: "0U", forca: "12†", notas: "Martelo de guerra. Requer duas mãos." },
  { id: "w17", nome: "Yumi (Arco Longo)", tipo: "Arco", dano: "GdP+2 perf", alcance: "x15/x20", aparar: "—", forca: "11†", notas: "Arco longo japonês. Precisão 3." },
  { id: "w18", nome: "Shuriken", tipo: "Arremesso", dano: "GdP-1 cort", alcance: "x0.5/x1.0", aparar: "—", forca: "4", notas: "Estrela de arremesso." },
  { id: "w19", nome: "Bo-Shuriken", tipo: "Arremesso", dano: "GdP-1 perf", alcance: "x0.5/x1.0", aparar: "—", forca: "4", notas: "Dardo de arremesso." }
];

const armorDB = [
  { id: "a1", nome: "Kamiko (Papel Laqueado)", local: "Tronco + Braços", rd: "1", peso: "1.5 kg", notas: "Leve e barata." },
  { id: "a2", nome: "Traje de Ninja", local: "Corpo Inteiro", rd: "1*", peso: "3 kg", notas: "+1 em Furtividade (noturno)." },
  { id: "a3", nome: "Cota de Malha (Kusari)", local: "Tronco (Oculta)", rd: "3/1*", peso: "4 kg", notas: "Converte Corte em Esmagamento." },
  { id: "a4", nome: "Jingasa (Chapéu de Ferro)", local: "Crânio", rd: "3", peso: "1 kg", notas: "Protege de cima." },
  { id: "a5", nome: "Do (Peitoral Lamelar)", local: "Tronco", rd: "5", peso: "12 kg", notas: "Resistente. Placas de metal/couro." },
  { id: "a6", nome: "O-Yoroi (Completa)", local: "Tronco/Membros", rd: "4-5", peso: "24 kg", notas: "Carga Média ou Pesada!" }
];

const gearDB = [
  { id: "g1", nome: "Bomba de Fumaça", efeito: "Nuvem 3m. -5 Visão. Furtividade +4.", subtipo: "ninja", notas: "Ninja. $20." },
  { id: "g2", nome: "Sal Puro (Mori-Shio)", efeito: "Dano x2 (Queimadura) em Yurei/Oni/Kaii. Interrompe Regeneração por 1 min. Barreira contra fantasmas.", subtipo: "oculto", notas: "Purificação fundamental. Círculos de sal impedem passagem. Barato." },
  { id: "g3", nome: "Espelho de Bronze (Kagami)", efeito: "Revela forma verdadeira de Henge/Yurei invisível. Luz solar refletida: 1d dano em Yurei.", subtipo: "oculto", notas: "Espelho polido de Onmyoji. Ação de Concentrar. $200." },
  { id: "g4", nome: "Kit Primeiros Socorros", efeito: "+1 em Primeiros Socorros.", subtipo: "mundano", notas: "Essencial. $50." },
  { id: "g5", nome: "Óleo de Glicínia", efeito: "Anula Regeneração de Oni por 1d min.", subtipo: "oculto", notas: "$150. Caro." },
  { id: "g6", nome: "Ofuda (Selo Sagrado)", efeito: "+1 em Exorcismo ou Rituais. Pode ser colado no alvo (Ataque Toque).", subtipo: "oculto", notas: "$5/unidade." },
  { id: "g7", nome: "Bomba de Cinzas", efeito: "Cega (DX-4) por 1 turno e revela Yokais Insubstanciais na área.", subtipo: "ninja", notas: "Arremesso (DX). $30." },
  { id: "g8", nome: "Pílula de Vitalidade", efeito: "Recupera 1d de Pontos de Fadiga (PF) instantaneamente. Causa 'Crash' de -2 HT após 1 hora.", subtipo: "alquimia", notas: "Rara. $100." }
];

// Helper to get weapon stats by name or ID
function findWeapon(query) {
  return weaponsDB.find(w => w.id === query || w.nome === query);
}


window.weaponsDB = weaponsDB;
window.armorDB = armorDB;
window.gearDB = gearDB;
window.findWeapon = findWeapon;
