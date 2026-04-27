import { loadBaseCatalog } from "./apps/daimyo-vtt/src/lib/content-bridge/base-loader";

async function main() {
  const catalog = await loadBaseCatalog();
  const categories = {};
  catalog.equipmentEntries.forEach(e => {
    categories[e.category] = (categories[e.category] || 0) + 1;
  });
  console.log("Categorias de Equipamento:", categories);
  
  const armors = catalog.equipmentEntries.filter(e => e.category === "Armaduras" || e.category === "Equipamentos");
  console.log("Total Armaduras/Equipamentos:", armors.length);
  armors.forEach(a => console.log(`- ${a.name} (${a.category})`));
}

main();
