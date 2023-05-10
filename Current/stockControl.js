/** @param {NS} ns */
export async function main(ns) {
    if (!ns.getPlayer().has4SDataTixApi) {
        ns.exec('stockTix.js', 'home')
        while (!ns.stock.purchase4SMarketDataTixApi())
            await ns.sleep(3600e3);
        ns.kill('stockTix.js', 'home');
        ns.exec('stockBN8.js', 'home');
    }
}