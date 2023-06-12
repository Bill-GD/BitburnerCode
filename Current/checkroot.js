/** @param {NS} ns **/
export async function main(ns) {
  let servers = [
    //lv 1
    "n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea",
    "harakiri-sushi", "iron-gym",
    //lv 2
    "nectar-net", "zer0", "max-hardware", "CSEC",
    //lv 3
    "neo-net", "phantasy", "silver-helix", "omega-net",
    //lv 4
    "netlink", "crush-fitness", "avmnite-02h", "the-hub", "johnson-ortho",
    "computek",
    //lv 5
    "catalyst", "I.I.I.I", "rothman-uni", "summit-uni", "zb-institute",
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
    "titan-labs", "run4theh111z", "microdyne", "applied-energetics",
    //lv 12
    "fulcrumtech", "stormtech", "helios", "vitalife",
    //lv 13
    "kuai-gong", "4sigma", ".", "omnitek",
    //lv 14
    "blade", "clarkinc", "powerhouse-fitness", "b-and-a", "nwo",
    //lv 15
    "ecorp", "The-Cave", "megacorp", "fulcrumassets",
    //lv 16
    "w0r1d_d43m0n",
  ]

  const option = ns.flags([['noRoot', false]]);

  let hasRoot = [], noRoot = [];

  for (let server of servers)
    ns.hasRootAccess(server) ? hasRoot.push(server) : noRoot.push(server);

  if (option.noRoot)
    noRoot.length === 0
      ? ns.tprintf(` (!) Has root access to all servers`)
      : noRoot.forEach(server => { ns.tprintf(` - ${server}`); });
  else
    hasRoot.length === 0
      ? ns.tprintf(` (!) Has no root access to any server`)
      : hasRoot.forEach(server => { ns.tprintf(` - ${server}`); });

  ns.tprintf(` -> Total: ${option.noRoot ? noRoot.length : hasRoot.length}`);
}