/** Version 1.0 */
/** @param {NS} ns */
export async function main(ns) {
  ns.tail(); ns.disableLog('ALL'); ns.clearLog();
  if (ns.singularity.checkFactionInvitations().includes('Sector-12')) ns.run('joinFaction.js', { preventDuplicates: true });
  let oldMoney = ns.getServerMoneyAvailable('home');
  while (1) {
    if (ns.scriptRunning('sleeveContracts.js', 'home')) {
      if (ns.getServerMoneyAvailable('home') - oldMoney < ns.singularity.getAugmentationPrice('NeuroFlux Governor') / 1e3)
        ns.run('int_InstallAug.js');
      oldMoney = ns.getServerMoneyAvailable('home');
    }

    let [reqRep, currentRep] = [ns.singularity.getAugmentationRepReq('NeuroFlux Governor'), ns.singularity.getFactionRep('Sector-12')];
    if (reqRep > currentRep) {
      const donation = (reqRep - currentRep) * 1e6 / ns.getPlayer().mults.faction_rep;
      if (ns.singularity.donateToFaction('Sector-12', donation)) ns.print(`Donated $${ns.formatNumber(donation, 3)} to Sector-12`);
    }

    if (ns.bladeburner.getActionCountRemaining('contract', 'Bounty Hunter') >= 10e3) {
      ns.run('sleeveContracts.js', { preventDuplicates: true });
      ns.print('Sleeves start Contracts');
    }
    if (ns.bladeburner.getActionCountRemaining('contract', 'Bounty Hunter') <= 0) {
      ns.scriptKill('sleeveContracts.js', 'home');
      ns.print('Sleeves finished Contracts');
    }

    await ns.sleep(10e3);
  }
}