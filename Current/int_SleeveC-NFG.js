/** Version 1.0.1
 * Improved conditions to install aug
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.tail(); ns.disableLog('ALL'); ns.clearLog();
  let oldMoney = ns.getServerMoneyAvailable('home');
  while (1) {
    if (ns.singularity.checkFactionInvitations().includes('Sector-12')) ns.run('joinFaction.js', { preventDuplicates: true });
    if (ns.scriptRunning('sleeveContracts.js', 'home')) {
      // if money gain rate is much lower than current amount (too slow)
      // AND the current amount is not enough for aug
      // -> install aug
      let [reqRep, currentRep] = [ns.singularity.getAugmentationRepReq('NeuroFlux Governor'), ns.singularity.getFactionRep('Sector-12')];
      const donation = (reqRep - currentRep) * 1e6 / ns.getPlayer().mults.faction_rep;
      if (ns.getServerMoneyAvailable('home') > oldMoney && ns.getServerMoneyAvailable('home') - oldMoney < oldMoney / 1e4
        && ns.getServerMoneyAvailable('home') < ns.singularity.getAugmentationPrice('NeuroFlux Governor')
        // && ns.getServerMoneyAvailable('home') < donation
      ) {
        ns.write(
          'check.txt',
          `Old: ${oldMoney} (${ns.formatNumber(oldMoney, 3)})\n` +
          `New: ${ns.getServerMoneyAvailable('home')} (${ns.formatNumber(ns.getServerMoneyAvailable('home'), 3)})\n` +
          `Ratio (O/N): ${oldMoney / ns.getServerMoneyAvailable('home')}\n` +
          `Cost: ${ns.singularity.getAugmentationPrice('NeuroFlux Governor')} (${ns.formatNumber(ns.singularity.getAugmentationPrice('NeuroFlux Governor'), 3)})\n` +
          `Rep req.: ${reqRep} (${ns.formatNumber(reqRep, 3)})\n` +
          `Rep: ${currentRep} (${ns.formatNumber(currentRep, 3)})\n` +
          `Donation needed: ${donation} (${ns.formatNumber(donation, 3)})`,
          'w'
        )
        // ns.spawn('int_InstallAug.js');
      }
      oldMoney = ns.getServerMoneyAvailable('home');
    }

    let [reqRep, currentRep] = [ns.singularity.getAugmentationRepReq('NeuroFlux Governor'), ns.singularity.getFactionRep('Sector-12')];
    if (reqRep > currentRep) {
      const donation = (reqRep - currentRep) * 1e6 / ns.getPlayer().mults.faction_rep;
      if (ns.singularity.donateToFaction('Sector-12', donation)) {
        const date = new Date();
        let [hour, minute, second] = [date.getHours(), date.getMinutes(), date.getSeconds()].map(t => t > 9 ? t : '0' + t);
        ns.print(`[${hour}:${minute}:${second}] Donated $${ns.formatNumber(donation, 3)} to Sector-12`);
      }
    }
    await ns.sleep(1e3);
  }
}