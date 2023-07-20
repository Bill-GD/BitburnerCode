/** @param {NS} ns */
export async function main(ns) {
  ns.getPurchasedServers().forEach(server => {
    ns.killall(server);
    ns.scp('chargeStanek.js', server, 'home');
    ns.exec('chargeStanek.js', server, { threads: Math.trunc(ns.getServerMaxRam(server) / 7) });
  });
}