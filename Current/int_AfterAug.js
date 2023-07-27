/** @param {NS} ns */
export async function main(ns) {
  ns.run('hudExtra_v2.js', { preventDuplicates: true });
  ns.run('gang_v3.js', { preventDuplicates: true });
  ns.run('blade_v4.js', { preventDuplicates: true });
  ns.run('intTravel.js', { preventDuplicates: true });
  ns.run('intLog.js', { preventDuplicates: true });
  ns.run('buyNFG.js', { preventDuplicates: true });
  ns.run('sleevePresets.js', { preventDuplicates: true }, '--script', '--preset', 'Infiltrate');
  ns.run('int_SleeveC-NFG.js', { preventDuplicates: true });
  await ns.sleep(6000);
  ns.run('extraServer_v2.js', { preventDuplicates: true }, '--script');
  await ns.sleep(50);
  ns.run('stanek_v2.js', { preventDuplicates: true });
  ns.run('manageChargeStanek.js', { preventDuplicates: true });
  ns.run('spreadStanekCharger.js', { preventDuplicates: true });
}