/** Version 1.0
 * For constant free money, that's it.
 * Only need 1.6GB of RAM (and a certain exploit) to run.
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  const hnet = eval('ns.hacknet');

  while (await ns.sleep(100)) {
    ns.clearLog();
    if (hnet.numHashes() >= hnet.hashCost(hnet.getHashUpgrades()[0]))
      hnet.spendHashes(hnet.getHashUpgrades()[0]);
  }
}