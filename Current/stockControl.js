/** @param {NS} ns */
export async function main(ns) {
    if (!ns.stock.has4SDataTIXAPI()) {
        ns.run('stockTix.js');
        while (!ns.stock.purchase4SMarketDataTixApi())
            await ns.sleep(1800e3);
        ns.kill('stockTix.js');
        ns.run('stockBN8.js');
    }
}