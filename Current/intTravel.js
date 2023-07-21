/** @param {NS} ns */
export async function main(ns) {
  const cities = ['Aevum', 'Chongqing', 'New Tokyo', 'Ishima', 'Volhaven', 'Sector-12'];
  while (1) {
    cities.forEach(c => ns.singularity.travelToCity(c));
    await ns.sleep(1);
  }
}