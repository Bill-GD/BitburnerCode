export function autocomplete(data) {
    return [...data.servers];
}
/** @param {NS} ns */
export async function main(ns) {
    let targetServer = ns.args[0];

    if (!targetServer) {
        ns.tprintf(` (!) Server not found`);
        return;
    }

    ns.tprintf(`Server: ${targetServer}`);
    ns.tprintf(` -> Hack level: ${ns.getServerRequiredHackingLevel(targetServer)}`);
    ns.tprintf(` -> Backdoor: ${ns.getServer(targetServer).backdoorInstalled}`);
    ns.tprintf(` -> Root: ${ns.hasRootAccess(targetServer)} (${ns.getServer(targetServer).openPortCount} / ${ns.getServerNumPortsRequired(targetServer)})`);
    ns.tprintf(` -> Ram: ${ns.formatRam(ns.getServerMaxRam(targetServer), 1)}`);
    ns.tprintf(` -> Hack time: ${ns.tFormat(ns.getHackTime(targetServer))}`);
    ns.tprintf(` -> Weak time: ${ns.tFormat(ns.getWeakenTime(targetServer))}`);
    ns.tprintf(` -> Grow time: ${ns.tFormat(ns.getGrowTime(targetServer))}`);
    ns.tprintf(` -> Money: ${ns.formatNumber(ns.getServer(targetServer).moneyAvailable, 1)} / ${ns.formatNumber(ns.getServer(targetServer).moneyMax, 1)}`);
    ns.tprintf(` -> Security: ${ns.formatNumber(ns.getServerSecurityLevel(targetServer), 1)}`);

}