/** @param {NS} ns */
export async function main(ns) {
  ns.run('hudExtra_v2.js');
  ns.run('gang_v3.js');
  ns.run('blade_v4.js');
  ns.run('intTravel.js');
  ns.run('intLog.js');
  ns.run('buyNFG.js');
  ns.run('sleevePresets.js', { preventDuplicates: true }, '--script', '--preset', 'Infiltrate');
  ns.run('int_SleeveC-NFG.js');
  ns.run('extraServer_v2.js', { preventDuplicates: true }, '--script');
  ns.run('stanek_v2.js', 'home', { preventDuplicates: true });
  ns.run('manageChargeStanek.js', 'home', { preventDuplicates: true });
  ns.run('spreadStanekCharger.js', 'home', { preventDuplicates: true });
}