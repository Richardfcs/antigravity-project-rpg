/**
 * RangedCalc - GURPS 4e Ranged Attack Automation
 * Logic for Size, Speed, and Range (SSR) calculations.
 */

const RangedCalc = (function() {
  // SSR Table: Distance index to Penalty
  // GURPS 4e: 2yd=0, 3yd=-1, 5yd=-2, 7yd=-3, 10yd=-4, 15yd=-5, 20yd=-6, 30yd=-7, 50yd=-8, 70yd=-9, 100yd=-10...
  const SSR_TABLE = [
    { max: 2, mod: 0 },
    { max: 3, mod: -1 },
    { max: 5, mod: -2 },
    { max: 7, mod: -3 },
    { max: 10, mod: -4 },
    { max: 15, mod: -5 },
    { max: 20, mod: -6 },
    { max: 30, mod: -7 },
    { max: 50, mod: -8 },
    { max: 70, mod: -9 },
    { max: 100, mod: -10 },
    { max: 150, mod: -11 },
    { max: 200, mod: -12 },
    { max: 300, mod: -13 },
    { max: 500, mod: -14 },
    { max: 700, mod: -15 },
    { max: 1000, mod: -16 },
    { max: 1500, mod: -17 },
    { max: 2000, mod: -18 },
    { max: 3000, mod: -19 },
    { max: 5000, mod: -20 }
  ];

  function getRangeModifier(distance) {
    if (distance <= 2) return 0;
    const entry = SSR_TABLE.find(e => distance <= e.max);
    return entry ? entry.mod : -20; // Default to -20 for extreme distances
  }

  function calculateModifier(params) {
    const {
      distance = 2,
      sm = 0,
      acc = 0,
      aimTurns = 0, // 0=No Aim, 1=Acc, 2=Acc+1, 3=Acc+2
      isBraced = false,
      isDetermined = false,
      customMod = 0
    } = params;

    let total = 0;
    
    // 1. Distance & Size (SSR)
    total += getRangeModifier(distance);
    total += parseInt(sm);

    // 2. Accuracy & Aim
    if (aimTurns > 0) {
      total += parseInt(acc);
      if (aimTurns === 2) total += 1;
      if (aimTurns >= 3) total += 2;
      
      // Braced only applies if Aimed
      if (isBraced) total += 1;
    }

    // 3. Maneuvers
    if (isDetermined) total += 1;

    // 4. Custom
    total += parseInt(customMod);

    return total;
  }

  // --- UI INTEGRATION ---

  function toggleDrawer() {
    const drawer = document.getElementById('ranged-calc-drawer');
    if (drawer) {
      drawer.classList.toggle('open');
    }
  }

  function update() {
    const distance = parseFloat(document.getElementById('rc-distance').value) || 2;
    const sm = parseInt(document.getElementById('rc-sm').value) || 0;
    const acc = parseInt(document.getElementById('rc-acc').value) || 0;
    const aimTurns = parseInt(document.getElementById('rc-aim').value) || 0;
    const isBraced = document.getElementById('rc-braced').checked;
    const isDetermined = document.getElementById('rc-determined').checked;
    const customMod = parseInt(document.getElementById('rc-custom').value) || 0;

    const finalMod = calculateModifier({
      distance, sm, acc, aimTurns, isBraced, isDetermined, customMod
    });

    const display = document.getElementById('rc-result');
    if (display) {
      const sign = finalMod >= 0 ? '+' : '';
      display.textContent = `${sign}${finalMod}`;
      display.style.color = finalMod >= 0 ? 'var(--green-success)' : 'var(--red-accent)';
    }

    // Update individual breakdowns
    const rangeMod = getRangeModifier(distance);
    document.getElementById('rc-breakdown-range').textContent = `Distância: ${rangeMod >= 0 ? '+' : ''}${rangeMod}`;
  }

  return {
    getRangeModifier,
    calculateModifier,
    toggleDrawer,
    update
  };
})();

// Global registration if needed
window.RangedCalc = RangedCalc;
