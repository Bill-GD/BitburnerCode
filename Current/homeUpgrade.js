/** @param {NS} ns */
export async function main(ns) {
  if (!(await ns.prompt(
    `Upgrade RAM: ${ns.formatRam(ns.getServer('home').maxRam, 2)} -> ${ns.formatRam(ns.getServer('home').maxRam * 2, 2)}\n` +
    `Cost: $${ns.formatNumber(ns.singularity.getUpgradeHomeRamCost(), 3)}`
  ))) ns.exit();

  try {
    if (ns.singularity.upgradeHomeRam())
      ns.toast('Upgraded RAM', 'success', 7e3);
    else ns.toast('Failed to upgrade RAM', 'error', 7e3);
  } catch { }
}