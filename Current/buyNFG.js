/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.enableLog('singularity.purchaseAugmentation');
  while (await ns.sleep(1)) {
    while (ns.getServerMoneyAvailable('home') < ns.singularity.getAugmentationPrice('NeuroFlux Governor')) {
      ns.clearLog();
      ns.print('Waiting for money');
      await ns.sleep(1e3);
    }
    ns.singularity.purchaseAugmentation('Sector-12', 'NeuroFlux Governor');
  }
}