/** @param {NS} ns **/
export async function main(ns) {

  ns.disableLog("getServerMoneyAvailable");
  ns.disableLog("getServerNumPortsRequired");

  let servers = [
    // lv 0
    'darkweb',
    // lv 1
    "n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea",
    "harakiri-sushi", "iron-gym",
    // lv 2
    "nectar-net", "zer0", "max-hardware", "CSEC",
    // lv 3
    "neo-net", "phantasy", "silver-helix", "omega-net",
    // lv 4
    "netlink", "crush-fitness", "avmnite-02h", "the-hub", "johnson-ortho",
    "computek",
    // lv 5
    "catalyst", "I.I.I.I", "rothman-uni", "summit-uni", "zb-institute",
    "syscore",
    // lv 6
    "millenium-fitness", "aevum-police", "lexo-corp", "alpha-ent",
    "rho-construction",
    // lv 7
    "snap-fitness", "aerocorp", "global-pharm", "galactic-cyber",
    // lv 8
    "unitalife", "omnia", "deltaone",
    // lv 9
    "univ-energy", "zeus-med", "defcomm", "icarus", "solaris",
    // lv 10
    "nova-med", "infocomm", "taiyang-digital", "zb-def",
    // lv 11
    "titan-labs", "run4theh111z", "microdyne", "applied-energetics",
    // lv 12
    "fulcrumtech", "stormtech", "helios", "vitalife",
    // lv 13
    "kuai-gong", "4sigma", ".", "omnitek",
    // lv 14
    "blade", "clarkinc", "powerhouse-fitness", "b-and-a", "nwo",
    // lv 15
    "ecorp", "The-Cave", "megacorp", "fulcrumassets",
    // lv 16
    "w0r1d_d43m0n",
  ]

  for (let server of servers) {
    if (server === 'darkweb' && !ns.serverExists(server) && !ns.singularity.purchaseTor()) continue;
    openPorts(server);
    nukeServer(server);
  }

  function openPorts(server) {
    if (ns.fileExists("BruteSSH.exe", "home") && ns.getServer(server).sshPortOpen == false)
      ns.brutessh(server);
    if (ns.fileExists("FTPCrack.exe", "home") && ns.getServer(server).ftpPortOpen == false)
      ns.ftpcrack(server);
    if (ns.fileExists("RelaySMTP.exe", "home") && ns.getServer(server).smtpPortOpen == false)
      ns.relaysmtp(server);
    if (ns.fileExists("HTTPWorm.exe", "home") && ns.getServer(server).httpPortOpen == false)
      ns.httpworm(server);
    if (ns.fileExists("SQLInject.exe", "home") && ns.getServer(server).sqlPortOpen == false)
      ns.sqlinject(server);
  }

  function nukeServer(server) {
    if (!ns.hasRootAccess(server) && ns.getServerNumPortsRequired(server) <= ns.getServer(server).openPortCount) {
      ns.nuke(server);
      ns.tprintf(` > ${server}: Root Access acquired.`);
    }
  }
}