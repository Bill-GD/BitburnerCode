/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog("getHackingLevel");
    ns.disableLog("getServerRequiredHackingLevel");
    ns.disableLog("getServerSecurityLevel")

    if (ns.getHostname() == "home") ns.tprintf(" (!) weak.js is running.");

    let sv = [
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
    ]

    let a = sv.length;

    while (true) {
        for (var i = 0; i < a; i++) {
            if (ns.hasRootAccess(sv[i]) && ns.getHackingLevel("home") >= ns.getServerRequiredHackingLevel(sv[i]) && ns.getServerSecurityLevel(sv[i]) > ns.getServerMinSecurityLevel(sv[i])) {
                await ns.weaken(sv[i]);
            }
        }
    }
}