/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  if (!ns.stock.has4SDataTIXAPI()) {
    ns.run('stockTix.js', { preventDuplicates: true });
    while (!ns.stock.purchase4SMarketDataTixApi())
      await ns.sleep(60e3);
    ns.kill('stockTix.js');
    ns.run('stockBN8.js');
  }
}