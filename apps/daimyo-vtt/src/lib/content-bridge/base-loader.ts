import "server-only";

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

import { daimyoContentBridge } from "@/lib/content-bridge/contract";
import type {
  CharacterTemplate,
  CodexEntry,
  DaimyoContentManifest,
  EquipmentEntry
} from "@/lib/content-bridge/contract";

interface BaseCodexCategory {
  id: string;
  name: string;
  icon?: string;
  tags?: string[];
  order?: number;
}

interface BaseCatalog {
  manifest: DaimyoContentManifest;
  archetypes: CharacterTemplate[];
  codexEntries: CodexEntry[];
  codexCategories: BaseCodexCategory[];
  equipmentEntries: EquipmentEntry[];
}

let cachedCatalogPromise: Promise<BaseCatalog> | null = null;

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findProjectRoot() {
  const seeds = [
    process.cwd(),
    path.resolve("."),
    path.join(process.cwd(), "apps", "daimyo-vtt"), // Caso esteja rodando da raiz
    path.join(process.cwd(), "..") // Caso esteja rodando de dentro de apps
  ];

  for (const seed of seeds) {
    let currentPath = path.normalize(seed);
    
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const targetFile = path.join(currentPath, "js", "archetypes-db.js");

      if (await fileExists(targetFile)) {
        return currentPath;
      }

      const parent = path.dirname(currentPath);
      if (parent === currentPath) break;
      currentPath = parent;
    }
  }

  throw new Error(
    `Nao foi possivel localizar a raiz do projeto base para a ponte de conteudo. ` +
    `Verifique se a pasta 'js' existe na raiz do projeto. (CWD: ${process.cwd()})`
  );
}

function createSandbox() {
  const windowObject: Record<string, unknown> = {};
  const documentObject = {
    readyState: "loading",
    addEventListener: () => undefined,
    removeEventListener: () => undefined
  };

  const sandbox = {
    window: windowObject,
    document: documentObject,
    console: {
      log: () => undefined,
      warn: () => undefined,
      error: () => undefined
    },
    CustomEvent: class CustomEvent {
      type: string;
      detail: unknown;

      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    setInterval: () => 0,
    clearInterval: () => undefined,
    setTimeout: () => 0,
    clearTimeout: () => undefined
  };

  windowObject.window = windowObject;
  windowObject.document = documentObject;
  windowObject.addEventListener = () => undefined;
  windowObject.removeEventListener = () => undefined;
  windowObject.setInterval = sandbox.setInterval;
  windowObject.clearInterval = sandbox.clearInterval;
  windowObject.setTimeout = sandbox.setTimeout;
  windowObject.clearTimeout = sandbox.clearTimeout;

  return sandbox;
}

async function executeScript(filePath: string) {
  const source = await readFile(filePath, "utf8");
  const sandbox = createSandbox();
  const context = vm.createContext(sandbox);
  const script = new vm.Script(source, { filename: filePath });
  script.runInContext(context);
  return sandbox;
}

function mapArchetypeToTemplate(entry: Record<string, unknown>): CharacterTemplate {
  const attributes = (entry.attributes ?? {}) as Record<string, unknown>;
  return {
    id: String(entry.name ?? `archetype-${Date.now()}`),
    name: String(entry.name ?? "Arquétipo sem nome"),
    role: "player",
    portraitAssetId: null,
    stats: {
      points: entry.points ?? null,
      clan: entry.clan ?? null,
      concept: entry.concept ?? "",
      attributes,
      advantages: entry.advantages ?? [],
      disadvantages: entry.disadvantages ?? [],
      skills: entry.skills ?? [],
      equipment: entry.equipment ?? "",
      history: entry.history ?? "",
      basicSpeed: entry.basicSpeed ?? null
    },
    tags: [
      "arquetipo",
      typeof entry.clan === "string" ? entry.clan : "sem-clan"
    ]
  };
}

function mapLibraryItemToCodexEntry(item: Record<string, unknown>): CodexEntry {
  const sections = [
    typeof item.sub === "string" && item.sub ? `**Subcategoria:** ${item.sub}` : null,
    typeof item.cust === "string" && item.cust ? `**Custo:** ${item.cust}` : null,
    typeof item.fonte === "string" && item.fonte ? `**Fonte:** ${item.fonte}` : null,
  ].filter(Boolean) as string[];
  if (typeof item.conceito === "string" && item.conceito) {
    sections.push(`> ${item.conceito}`);
  }

  if (typeof item.desc === "string" && item.desc) {
    let formattedDesc = item.desc.replace(/\\n/g, "\n");
    
    if (formattedDesc.includes("|") && !formattedDesc.includes("---|")) {
      const lines = formattedDesc.split("\n");
      const firstLine = lines[0] ?? "";
      
      if (firstLine.includes("|")) {
        const colsCount = firstLine.split("|").length;
        const separator = Array(colsCount).fill("---").join("|");
        lines.splice(1, 0, separator);
        formattedDesc = lines.join("\n");
      }
    }
    
    sections.push(formattedDesc);
  }

  if (Array.isArray(item.pericias_realistas) && item.pericias_realistas.length > 0) {
    sections.push(`### Perícias\n${item.pericias_realistas.map(p => `- ${p}`).join("\n")}`);
  }

  if (Array.isArray(item.tecnicas) && item.tecnicas.length > 0) {
    const tecnicas = item.tecnicas as Array<{nome: string, dificuldade: string, base: string, desc: string}>;
    sections.push(`### Técnicas\n${tecnicas.map(t => `- **${t.nome}** (${t.dificuldade} | ${t.base}): ${t.desc}`).join("\n")}`);
  }

  if (Array.isArray(item.qualidades_estilo) && item.qualidades_estilo.length > 0) {
    const qualidades = item.qualidades_estilo as Array<{nome: string, desc: string}>;
    sections.push(`### Qualidades do Estilo\n${qualidades.map(q => `- **${q.nome}:** ${q.desc}`).join("\n")}`);
  }

  return {
    id: String(item.id ?? `codex-${Date.now()}`),
    title: String(item.nome ?? "Entrada sem titulo"),
    category: String(item.cat ?? "Geral"),
    markdown: sections.join("\n\n"),
    tags: Array.isArray(item.tags)
      ? item.tags.map((tag) => String(tag))
      : []
  };
}

function mapEquipmentEntry(
  source: "weapon" | "armor" | "gear",
  entry: Record<string, unknown>
): EquipmentEntry {
  const category =
    source === "weapon"
      ? "Armas"
      : source === "armor"
        ? "Armaduras"
        : "Equipamentos";

  return {
    id: `${source}:${String(entry.id ?? entry.nome ?? Date.now())}`,
    name: String(entry.nome ?? "Item sem nome"),
    category,
    stats: { ...entry },
    tags: [
      source,
      typeof entry.tipo === "string"
        ? entry.tipo
        : typeof entry.subtipo === "string"
          ? entry.subtipo
          : category
    ]
  };
}

async function loadBaseCatalogInternal(): Promise<BaseCatalog> {
  const projectRoot = await findProjectRoot();
  const [archetypeSandbox, librarySandbox, weaponsSandbox] = await Promise.all([
    executeScript(path.join(projectRoot, "js", "archetypes-db.js")),
    executeScript(path.join(projectRoot, "js", "library-data.js")),
    executeScript(path.join(projectRoot, "js", "weapons-data.js"))
  ]);

  const archetypeSource = archetypeSandbox as unknown as {
    archetypesDB?: unknown[];
  };
  const archetypeEntries = Array.isArray(archetypeSource.archetypesDB)
    ? (archetypeSource.archetypesDB as Record<string, unknown>[])
    : [];
  const libraryManager = (librarySandbox.window as {
    LibraryManager?: {
      getItems: () => unknown[];
      getCategories: () => unknown[];
    };
  }).LibraryManager;
  const weaponsWindow = weaponsSandbox.window as Record<string, unknown[]>;

  const codexItems = libraryManager?.getItems?.() ?? [];
  const codexCategories = libraryManager?.getCategories?.() ?? [];
  const weapons = Array.isArray(weaponsWindow.weaponsDB)
    ? (weaponsWindow.weaponsDB as Record<string, unknown>[])
    : [];
  const armors = Array.isArray(weaponsWindow.armorDB)
    ? (weaponsWindow.armorDB as Record<string, unknown>[])
    : [];
  const gear = Array.isArray(weaponsWindow.gearDB)
    ? (weaponsWindow.gearDB as Record<string, unknown>[])
    : [];

  return {
    manifest: daimyoContentBridge.defaultManifest("base"),
    archetypes: archetypeEntries.map(mapArchetypeToTemplate),
    codexEntries: codexItems.map((item) =>
      mapLibraryItemToCodexEntry(item as Record<string, unknown>)
    ),
    codexCategories: codexCategories as BaseCodexCategory[],
    equipmentEntries: [
      ...weapons.map((entry) => mapEquipmentEntry("weapon", entry)),
      ...armors.map((entry) => mapEquipmentEntry("armor", entry)),
      ...gear.map((entry) => mapEquipmentEntry("gear", entry))
    ]
  };
}

export async function loadBaseCatalog() {
  if (!cachedCatalogPromise) {
    cachedCatalogPromise = loadBaseCatalogInternal();
  }

  return cachedCatalogPromise;
}

export async function findBaseArchetypeById(archetypeId: string) {
  const catalog = await loadBaseCatalog();
  return catalog.archetypes.find((item) => item.id === archetypeId) ?? null;
}
