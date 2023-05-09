/** @param {NS} ns */
export async function main(ns) {
    let sv = [
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

    let fileList = []
    fileList.push("hq.js");
    for (let i in ns.ls("home", "hack")) {
        fileList.push(ns.ls("home", "hack")[i]);
    }
    for (let i in ns.ls("home", "grow")) {
        fileList.push(ns.ls("home", "grow")[i]);
    }
    for (let i in ns.ls("home", "weak")) {
        fileList.push(ns.ls("home", "weak")[i]);
    }
    let count = 0
    ns.tprintf("\n")
    for (let i = 0; i < sv.length; i++) {
        if (ns.hasRootAccess(sv[i]) && ns.getServerRam(sv[i])[0] >= 32) {
            for (let j in fileList) {
                if (!ns.fileExists(fileList[j], sv[i])) {
                    await ns.scp(fileList[j], sv[i]);
                }
            }
            count++
        }
        ns.exec("hq.js", sv[i], 1, 1)
    }
    await ns.sleep(250)
    ns.tprintf("\n (!) Distributed to %d server(s).\n\n", count)
}