/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.clearLog();
    // ns.tail();

    const currentServer = ns.getHostname();
    // const currentServer = 'nectar-net';
    const serverMaxRam = ns.getServerMaxRam(currentServer);

    const files = ['hackScript.js', 'weaken.js', 'grow.js', 'hack.js'];

    // wait until met hacking requirement
    const serverHackReq = ns.getServerRequiredHackingLevel(currentServer);
    while (serverHackReq > ns.getHackingLevel()) {
        ns.clearLog();
        ns.print(`Low Hack level: ${ns.getHackingLevel()} / ${serverHackReq}`);
        await ns.sleep(1e3 * 60 * (serverHackReq - ns.getHackingLevel()));
    }

    // can hack
    ns.tprintf(` (!) ${currentServer}: running ${ns.getScriptName()}`);

    while (true) {
        try {
            ns.clearLog();
            const timeHack = ns.getHackTime(currentServer);
            const timeWeak = ns.getWeakenTime(currentServer);
            const timeGrow = ns.getGrowTime(currentServer);

            const minSec = ns.getServerMinSecurityLevel(currentServer);
            // const maxMoney = ns.getServerMaxMoney(currentServer);

            const currentMoney = ns.getServerMoneyAvailable(currentServer);
            let currentSec = ns.getServerSecurityLevel(currentServer);

            let hackSecIncrease = 0;

            let hackThread = 1, weakThread = 1, growThread = 1;
            let finalRamUsage = 0;

            while (true) {
                [weakThread, growThread, hackSecIncrease, finalRamUsage] = await calculateThread(files, currentServer, serverMaxRam, currentSec, minSec, hackThread);

                if ((finalRamUsage > serverMaxRam || weakThread <= 0 || growThread <= 0) && hackThread > 1) {
                    [weakThread, growThread, hackSecIncrease, finalRamUsage] = await calculateThread(files, currentServer, serverMaxRam, currentSec, minSec, --hackThread);
                    break;
                }
                hackThread++;
                await ns.sleep(50);
            }
            const reducedSec = ns.weakenAnalyze(weakThread);

            const growSecIncrease = ns.growthAnalyzeSecurity(growThread, currentServer);
            const moneyIncrease = ns.formulas.hacking.growPercent(ns.getServer(currentServer), growThread, ns.getPlayer()) * currentMoney;

            // log result if success
            ns.print(`${currentServer}`);
            ns.print(`${ns.formatRam(finalRamUsage, 1)} / ${ns.formatRam(serverMaxRam, 1)}`);
            ns.print(`Weaken (th=${weakThread}, t=${ns.tFormat(timeWeak)}):\n ${ns.formatNumber(currentSec - reducedSec)}/${minSec} (-${ns.formatNumber(reducedSec)})`);
            ns.print(`Grow (th=${growThread}, t=${ns.tFormat(timeGrow)}):\n $${ns.formatNumber(currentMoney + moneyIncrease, 1)} (+$${ns.formatNumber(moneyIncrease, 1)})\n sec: +${ns.formatNumber(growSecIncrease)}`);
            ns.print(`Hack (th=${hackThread}, t=${ns.tFormat(timeHack)}, ${ns.formatPercent(ns.hackAnalyzeChance(currentServer), 2)}):\n $${ns.formatNumber(ns.hackAnalyze(currentServer) * currentMoney, 1)}\n sec: +${ns.formatNumber(hackSecIncrease)}`);

            if (finalRamUsage > serverMaxRam) {
                ns.alert(`Ram usage overflows\n${ns.formatRam(finalRamUsage, 1)} / ${ns.formatRam(serverMaxRam, 1)}`);
                return;
            }
            if (hackThread <= 0 || weakThread <= 0 || growThread <= 0) {
                ns.alert(`Thread count must be positive\n hack=${hackThread},weak=${weakThread},grow=${growThread}`);
                return;
            }

            // execute
            ns.run(files[1], weakThread, currentServer);
            await ns.sleep(timeWeak - timeGrow);
            ns.run(files[2], growThread, currentServer);
            await ns.sleep(timeGrow - timeHack + 20);
            ns.run(files[3], hackThread, currentServer);
            await ns.sleep(timeHack);
            await ns.sleep(100);
        } catch (error) {
            ns.tprintf(`${currentServer}: ${error.name}, ${error.message}`);
        }
    }

    async function calculateThread(files, currentServer, serverMaxRam, currentSec, minSec, hackThread) {
        let growThread = 1, weakThread = 1;
        let unusedRam = serverMaxRam - ns.getScriptRam(files[0]) - ns.getScriptRam(files[3]) * hackThread;

        const hackSecIncrease = ns.hackAnalyzeSecurity(hackThread, currentServer);
        // thread available
        const availableWeakThread = Math.trunc(unusedRam / ns.getScriptRam(files[1]));
        // thread to min sec
        while (currentSec - ns.weakenAnalyze(weakThread) + hackSecIncrease > minSec)
            weakThread++;
        weakThread = Math.min(availableWeakThread, weakThread); // choose lower

        let availableGrowThread = 1;
        do {
            // ram left with weak thread count
            unusedRam = serverMaxRam - ns.getScriptRam(files[0]) - weakThread * ns.getScriptRam(files[1]) - ns.getScriptRam(files[3]) * hackThread;
            // if none available, decrease weakThread
            availableGrowThread = Math.trunc(unusedRam / ns.getScriptRam(files[2]));
            availableGrowThread <= 0 ? weakThread-- : 0;

            // thread needed to regrow hacked amount
            let threadFromAnalyze = Math.trunc(ns.growthAnalyze(currentServer, ns.hackAnalyze(currentServer) * hackThread + 1));
            threadFromAnalyze <= 0 ? threadFromAnalyze = 1 : 0; // force to 1 if <1 is needed

            growThread = Math.min(availableGrowThread, threadFromAnalyze);

            await ns.sleep(50);
        } while (growThread < 1);

        const finalRamUsage = ns.getScriptRam(files[0]) + weakThread * ns.getScriptRam(files[1]) + growThread * ns.getScriptRam(files[2]) + hackThread * ns.getScriptRam(files[3]);

        return [weakThread, growThread, hackSecIncrease, finalRamUsage];
    }
}
