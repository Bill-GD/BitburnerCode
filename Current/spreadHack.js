/** @param {NS} ns */
export async function main(ns) {
  const servers = [
    //lv 1
    "n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea",
    "harakiri-sushi", "iron-gym",
    //lv 2
    "nectar-net", "zer0", "max-hardware",
    //lv 3
    "neo-net", "phantasy", "silver-helix", "omega-net",
    //lv 4
    "netlink", "crush-fitness", "the-hub", "johnson-ortho",
    "computek",
    //lv 5
    "catalyst", "rothman-uni", "summit-uni", "zb-institute",
    "syscore",
    //lv 6
    "millenium-fitness", "aevum-police", "lexo-corp", "alpha-ent",
    "rho-construction",
    //lv 7
    "snap-fitness", "aerocorp", "global-pharm", "galactic-cyber",
    //lv 8
    "unitalife", "omnia", "deltaone",
    //lv 9
    "univ-energy", "zeus-med", "defcomm", "icarus", "solaris",
    //lv 10
    "nova-med", "infocomm", "taiyang-digital", "zb-def",
    //lv 11
    "titan-labs", "microdyne", "applied-energetics",
    //lv 12
    "fulcrumtech", "stormtech", "helios", "vitalife",
    //lv 13
    "kuai-gong", "4sigma", "omnitek",
    //lv 14
    "blade", "clarkinc", "powerhouse-fitness", "b-and-a", "nwo",
    //lv 15
    "ecorp", "megacorp", "fulcrumassets",
  ];

  let count = 0;
  const files = ['hackScript.js', 'weaken.js', 'hack.js', 'grow.js'];

  let totalRam = 0;
  for (const file of files)
    totalRam += ns.getScriptRam(file);

  for (const server of servers) {
    if (ns.hasRootAccess(server) && ns.getServerMaxRam(server) > totalRam) {
      ns.killall(server, true);
      ns.scp(files, server, 'home');
      ns.exec(files[0], server);
      count++;
    }
    await ns.sleep(10);
  }
  // for (let i = 0; i < eval('ns.hacknet').numNodes(); i++) {
  //     const server = 'hacknet-server-' + i;
  //     ns.killall(server, true);
  //     ns.scp(files, server, 'home');
  //     ns.toast(`Copied to ${server}`, 'success', 10e3);
  //     await ns.sleep(Math.round(Math.random() * 500));
  //     ns.exec('hackScript.js', server, 1, 'hackFromPurchased');
  //     count++;
  // }

  count > 0 && ns.tprintf(` (!) Distributed to ${count} server(s)`);
}