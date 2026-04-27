export type OracleTable = Record<string, string>;

export type Estacao = "Primavera" | "Verão" | "Outono" | "Inverno";

export interface NpcProfile {
  clanName?: string; // Legacy
  cla: string;
  nome: string;
  specialty?: string; // Legacy
  especialidade: string;
  traco: string;
  segredo: string;
  status?: {
    label: string;
    value: number;
  };
}

export interface JourneyEvent {
  clima: string;
  visibilidade: string;
  encontro: string;
}

export interface WeatherEffect {
  titulo: string;
  efeito: string;
}

export interface KegareMutation {
  titulo: string;
  desc: string;
}

export interface MonsterConcept {
  forma: string;
  essencia: string;
  manifestacao: string;
  presenca: string;
}

export type ThreatLevel = "civil" | "recruta" | "capanga" | "veterano" | "elite" | "excepcional" | "mestre";

export interface EnemyStats {
  name: string;
  st: number;
  dx: number;
  iq: number;
  ht: number;
  vont: number;
  hp: number;
  hpMax: number;
  pf: number;
  pfMax: number;
  iniciativa: number;
  velocidade: number;
  esquiva: number;
  aparar: number;
  bloqueio: number;
  armas: string;
  armor?: string;
  rd?: string;
  carga?: string;
  cargaLevel?: number;
  pesoTotal?: string;
  notas: string;
  isNPC: boolean;
  loadoutTechniqueIds?: string[];
}
