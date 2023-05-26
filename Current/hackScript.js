/** Version 2.0.1
 * Fixed bug with thread: can only increase
 * Rewrote grow thread calculation, it's now mutable -> can update if hack thread is fixed
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.clearLog();

    const currentSec = server => ns.getServerSecurityLevel(server);
    const currentMoney = server => ns.getServerMoneyAvailable(server);
    const maxMoney = server => ns.getServerMaxMoney(server)

    // * For purchased servers
    const servers = [
        "n00dles", "foodnstuff", "sigma-cosmetics", "joesguns", "hong-fang-tea", "harakiri-sushi", "iron-gym",
        "nectar-net", "zer0", "max-hardware",
        "neo-net", "phantasy", "silver-helix", "omega-net",
        "netlink", "crush-fitness", "the-hub", "johnson-ortho", "computek",
        "catalyst", "rothman-uni", "summit-uni", "zb-institute", "syscore",
        "millenium-fitness", "aevum-police", "lexo-corp", "alpha-ent", "rho-construction",
        "snap-fitness", "aerocorp", "global-pharm", "galactic-cyber",
        "unitalife", "omnia", "deltaone",
        "univ-energy", "zeus-med", "defcomm", "icarus", "solaris",
        "nova-med", "infocomm", "taiyang-digital", "zb-def",
        "titan-labs", "microdyne", "applied-energetics",
        "fulcrumtech", "stormtech", "helios", "vitalife",
        "kuai-gong", "4sigma", "omnitek",
        "blade", "clarkinc", "powerhouse-fitness", "b-and-a", "nwo",
        "ecorp", "megacorp", "fulcrumassets",
    ];
    const hackFromPurchasedServer = ns.args.includes('hackFromPurchased');

    const files = {
        control: { name: 'hackScript.js', ram: ns.getScriptRam('hackScript.js') },
        weakening: { name: 'weaken.js', ram: ns.getScriptRam('weaken.js') },
        growing: { name: 'grow.js', ram: ns.getScriptRam('grow.js') },
        hacking: { name: 'hack.js', ram: ns.getScriptRam('hack.js') },
    };

    // * Servers info
    const currentServer = ns.getHostname();
    let targetServer = hackFromPurchasedServer ? servers[0] : currentServer;
    let timeHack = ns.getHackTime(targetServer),
        timeWeak = ns.getWeakenTime(targetServer),
        timeGrow = ns.getGrowTime(targetServer);
    const minSec = ns.getServerMinSecurityLevel(targetServer),
        serverMaxRam = ns.getServerMaxRam(currentServer);

    // * Wait for hacking requirement
    if (!hackFromPurchasedServer) {
        const serverHackReq = ns.getServerRequiredHackingLevel(currentServer);
        while (serverHackReq > ns.getHackingLevel()) {
            ns.clearLog();
            ns.print(`Low Hack level: ${ns.getHackingLevel()} / ${serverHackReq}`);
            await ns.sleep(1e3 * 60 * (serverHackReq - ns.getHackingLevel()));
        }
    }

    // notify if can hack
    ns.tprintf(` (!) ${ns.getHostname()}: running ${ns.getScriptName()}`);

    while (true) {
        if (hackFromPurchasedServer)
            do {
                targetServer = servers[Math.trunc(Math.random() * servers.length)];
            } while (ns.getServerRequiredHackingLevel(targetServer) > ns.getHackingLevel());

        ns.clearLog();
        timeHack = ns.getHackTime(targetServer);
        timeWeak = ns.getWeakenTime(targetServer);
        timeGrow = ns.getGrowTime(targetServer);

        let willHack = currentMoney(targetServer) > 0,
            willGrow = currentMoney(targetServer) < maxMoney(targetServer),
            willWeak = currentSec(targetServer) > minSec;

        const maxHackThread = Math.trunc((serverMaxRam - files.control.ram) / files.hacking.ram);
        let [hackThread, hackSecIncrease, hackMoney, growThreadMoney, growSecIncrease, weakThreadSec, weakSecDecrease, usedRam] = await calculateThread(willHack, willGrow, willWeak, maxHackThread);

        // * Log result
        ns.clearLog();
        ns.print(`${currentServer} -> ${targetServer}`);
        ns.print(`${ns.formatRam(usedRam, 2)} / ${ns.formatRam(serverMaxRam, 2)}`);
        ns.print(`Weak (th=${weakThreadSec}):` +
            `\n time: ${ns.tFormat(timeWeak)}` +
            `\n ${ns.formatNumber(currentSec(targetServer), 3)} / ${minSec} (weak -> -${ns.formatNumber(weakSecDecrease, 3)})`);
        ns.print(`Grow (th=${growThreadMoney}):` +
            `\n time: ${ns.tFormat(timeGrow)}` +
            `\n current: $${ns.formatNumber(currentMoney(targetServer), 3)}` +
            `\n sec: +${ns.formatNumber(growSecIncrease)}`);
        ns.print(`Hack (th=${hackThread}, ${ns.formatPercent(ns.hackAnalyzeChance(currentServer), 2)}):` +
            `\n time: ${ns.tFormat(timeHack)}` +
            `\n take: $${ns.formatNumber(Math.min(hackMoney * currentMoney(targetServer), currentMoney(targetServer)), 3)}` +
            `\n sec: +${ns.formatNumber(hackSecIncrease, 3)}`);

        if (usedRam > serverMaxRam) {
            ns.alert(`Ram usage overflows\n${ns.formatRam(usedRam, 2)} / ${ns.formatRam(serverMaxRam, 2)}`);
            return;
        }
        if ((willHack && hackThread <= 0) || (willWeak && weakThreadSec <= 0) || (willGrow && growThreadMoney <= 0)) {
            ns.alert(`Thread count must be positive\n hack=${hackThread},weak=${weakThreadSec},grow=${growThreadMoney}`);
            return;
        }

        // execute
        if (willWeak) {
            ns.run(files.weakening.name, weakThreadSec, targetServer);
            await ns.sleep(willGrow ? timeWeak - timeGrow : timeWeak);
        }
        if (willGrow) {
            ns.run(files.growing.name, growThreadMoney, targetServer);
            await ns.sleep(willHack ? timeGrow - timeHack + 20 : timeGrow);
        }
        if (willHack) {
            ns.run(files.hacking.name, hackThread, targetServer);
            await ns.sleep(timeHack);
        }
        await ns.sleep(100);
    }

    async function calculateThread(willHack, willGrow, willWeak, hackThread = 1) {
        let hackSecIncrease = 0,
            hackMoney = 0,
            growThreadMoney = 0,
            growSecIncrease = 0,
            weakThreadSec = 0,
            weakSecDecrease = 0;

        if (!willHack) hackThread = 0;
        [hackSecIncrease, hackMoney, growThreadMoney] = getHackChanges(willHack, hackThread);
        growSecIncrease = willGrow ? ns.growthAnalyzeSecurity(growThreadMoney, targetServer) : 0;
        [weakThreadSec, weakSecDecrease] = await getWeakChanges(willWeak, hackSecIncrease, growSecIncrease);

        let usedRam = files.control.ram + files.hacking.ram * hackThread + files.growing.ram * growThreadMoney + files.weakening.ram * weakThreadSec;
        while (usedRam > serverMaxRam) {
            // decrease hackTh if hackTh > 1
            // -> decrease growTh (if hackTh reached limit) -> recalculate weakTh
            if (hackThread > 1) {
                hackThread = Math.trunc(hackThread / 1.5);
                [hackSecIncrease, hackMoney, growThreadMoney] = getHackChanges(willHack, hackThread);
                growSecIncrease = willGrow ? ns.growthAnalyzeSecurity(growThreadMoney, targetServer) : 0;
                [weakThreadSec, weakSecDecrease] = await getWeakChanges(willWeak, hackSecIncrease, growSecIncrease);
            }
            else {
                growThreadMoney = Math.trunc(growThreadMoney / 1.5);
                growSecIncrease = willGrow ? ns.growthAnalyzeSecurity(growThreadMoney, targetServer) : 0;
                [weakThreadSec, weakSecDecrease] = await getWeakChanges(willWeak, hackSecIncrease, growSecIncrease);
            }

            usedRam = files.control.ram + files.hacking.ram * hackThread + files.growing.ram * growThreadMoney + files.weakening.ram * weakThreadSec;
            ns.print(
                `hackThread: ${hackThread}\n` +
                `hackSecIncrease: ${hackSecIncrease}\n` +
                `hackMoney: ${hackMoney}\n` +
                `growThreadMoney: ${growThreadMoney}\n` +
                `growSecIncrease: ${growSecIncrease}\n` +
                `weakThreadSec: ${weakThreadSec}\n` +
                `weakSecDecrease: ${weakSecDecrease}\n` +
                `maxRam: ${serverMaxRam}\n` +
                `usedRam: ${usedRam}\n\n`
            );
            await ns.sleep(10);
        }

        return [Math.trunc(hackThread), hackSecIncrease, hackMoney, Math.trunc(growThreadMoney), growSecIncrease, Math.trunc(weakThreadSec), weakSecDecrease, usedRam];
    }

    function getHackChanges(willHack, hackThread) {
        // security increase & money percentage & grow thread from hack
        const hackMoney = ns.hackAnalyze(targetServer) * hackThread;
        const growThreadMoney = Math.max(1, Math.ceil(ns.growthAnalyze(targetServer, hackMoney + 1)));
        return willHack ? [ns.hackAnalyzeSecurity(hackThread, targetServer), hackMoney, growThreadMoney] : [0, 0, 0];
    }

    async function getWeakChanges(willWeak, hackSecIncrease, growSecIncrease) {
        // hack & grow security -> weak thread
        let weakThreadSec = 1;
        while (ns.weakenAnalyze(weakThreadSec) < hackSecIncrease + growSecIncrease) {
            weakThreadSec++;
            await ns.sleep(10);
        }
        return willWeak ? [weakThreadSec, ns.weakenAnalyze(weakThreadSec)] : [0, 0];
    }
}
