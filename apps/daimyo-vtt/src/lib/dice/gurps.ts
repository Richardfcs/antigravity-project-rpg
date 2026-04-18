import type { RollPayload } from "@/types/message";

function randomDie(sides: number) {
  return Math.floor(Math.random() * sides) + 1;
}

function clampModifier(value: number) {
  return Math.min(99, Math.max(-99, Math.trunc(value)));
}

export function parseDiceFormula(input: string) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, "");
  const match = normalized.match(/^(\d{1,2})d(\d{1,3})([+-]\d{1,2})?$/);

  if (!match) {
    throw new Error("Use formulas no formato 3d6, 1d6 ou 2d6+1.");
  }

  const count = Number(match[1]);
  const sides = Number(match[2]);
  const modifier = match[3] ? clampModifier(Number(match[3])) : 0;

  if (count < 1 || count > 12) {
    throw new Error("A quantidade de dados deve ficar entre 1 e 12.");
  }

  if (sides < 2 || sides > 100) {
    throw new Error("O tamanho do dado deve ficar entre d2 e d100.");
  }

  return {
    count,
    sides,
    modifier,
    formula: `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ""}`
  };
}

export function rollDiceFormula(input: string, target?: number | null, label?: string | null): RollPayload {
  const parsed = parseDiceFormula(input);
  const dice = Array.from({ length: parsed.count }, () => randomDie(parsed.sides));
  const rawTotal = dice.reduce((sum, value) => sum + value, 0);
  const total = rawTotal + parsed.modifier;
  const payload: RollPayload = {
    formula: parsed.formula,
    dice,
    modifier: parsed.modifier,
    total,
    target: target ?? null,
    margin: null,
    outcome: null,
    label: label ?? null
  };

  if (parsed.count === 3 && parsed.sides === 6 && typeof target === "number") {
    const margin = target - total;
    let outcome = margin >= 0 ? "success" : "failure";

    if (total <= 4 || (total === 5 && target >= 15) || (total === 6 && target >= 16)) {
      outcome = "critical-success";
    } else if (total >= 18 || (total === 17 && target <= 15) || total - target >= 10) {
      outcome = "critical-failure";
    }

    payload.margin = margin;
    payload.outcome = outcome;
  }

  return payload;
}

export function formatRollSummary(payload: RollPayload) {
  const label = payload.label ? `${payload.label}: ` : "";
  const dicePreview = payload.dice.join(", ");
  const modifierPreview =
    payload.modifier > 0 ? ` +${payload.modifier}` : payload.modifier < 0 ? ` ${payload.modifier}` : "";
  const result = `${label}${payload.formula} = ${payload.total} [${dicePreview}]${modifierPreview}`;

  if (typeof payload.target !== "number" || !payload.outcome) {
    return result;
  }

  const outcomeMap: Record<string, string> = {
    success: "sucesso",
    failure: "falha",
    "critical-success": "critico de sucesso",
    "critical-failure": "critico de falha"
  };
  const marginLabel =
    typeof payload.margin === "number"
      ? payload.margin >= 0
        ? `margem ${payload.margin}`
        : `margem ${payload.margin}`
      : null;

  return `${result} - ${outcomeMap[payload.outcome] ?? payload.outcome}${marginLabel ? ` (${marginLabel})` : ""}`;
}
