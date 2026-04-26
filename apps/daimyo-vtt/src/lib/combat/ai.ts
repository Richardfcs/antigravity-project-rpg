import { 
  CombatActionType, 
  SessionCharacterSheetProfile
} from "@/types/combat";
import { TacticalCombatStateView } from "@/lib/maps/selectors";

/**
 * Inteligência Artificial Tática (GURPS / Daimyo)
 * Sugere a melhor manobra para um NPC baseado em seus atributos e estado do combate.
 */
export function suggestNpcManeuver(
  profile: SessionCharacterSheetProfile,
  combatState: TacticalCombatStateView,
  targetProfile?: SessionCharacterSheetProfile | null
): { maneuver: CombatActionType; reason: string } {
  const hpPercent = (profile.combat.currentHp / profile.attributes.hpMax) * 100;
  const fpPercent = (profile.combat.currentFp / profile.attributes.ht) * 100;
  
  // 1. Instinto de Sobrevivência (HP baixo)
  if (hpPercent < 25) {
    return { 
      maneuver: "all-out-defense", 
      reason: "Ferimentos graves! Priorizando sobrevivência absoluta." 
    };
  }

  // 2. Situação Tática (Se houver alvo)
  if (targetProfile) {
    const targetHpPercent = (targetProfile.combat.currentHp / targetProfile.attributes.hpMax) * 100;
    
    // Se o inimigo está quase caindo, finalize!
    if (targetHpPercent < 20 && profile.attributes.st > 12) {
      return { 
        maneuver: "all-out-attack", 
        reason: "Oponente vulnerável. Finalizar com força total!" 
      };
    }

    // Se o personagem é um mestre de armas (NH alto), use Finta
    const mainSkill = profile.skills[0]?.level ?? 10;
    if (mainSkill >= 15 && Math.random() > 0.5) {
      return { 
        maneuver: "feint", 
        reason: "Superioridade técnica. Usar finta para quebrar a defesa." 
      };
    }
  }

  // 3. Fadiga
  if (fpPercent < 30) {
    return { 
      maneuver: "evaluate", 
      reason: "Cansado. Avaliando o oponente para recuperar o fôlego e ganhar bônus." 
    };
  }

  // 4. Padrão
  return { 
    maneuver: "attack", 
    reason: "Padrão de combate: ataque direto." 
  };
}
