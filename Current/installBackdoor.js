/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('ALL');
    ns.enableLog('singularity.installBackdoor');
    ns.clearLog();
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

    ns.tprintf(" (!) Installing backdoor on servers...");

    ns.singularity.connect('home');
    for (let server of servers)
        if (ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel("home") && ns.hasRootAccess(server) && !ns.getServer(server).backdoorInstalled) {
            ns.run('directConnect.js', 1, server);
            await ns.sleep(10);
            await ns.singularity.installBackdoor();
            ns.toast(`Installed backdoor on ${server}`, 'success', 5e3);
            ns.singularity.connect('home');
        }
    ns.tprintf(' (!) Finished installing backdoor on servers\n');
}