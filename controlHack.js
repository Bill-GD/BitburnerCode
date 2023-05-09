/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.tail();

    while (true) {
        const portExe = ['BruteSSH.exe', 'FTPCrack.exe', 'RelaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'];
        let ownedExe = 0;
        for (const p of portExe) {
            if (!ns.fileExists(p, 'home')) {
                do {
                    ns.print(`Attempting to buy ${p}...`);
                    ns.exec('getPortExe.js', 'home');

                    if (ns.fileExists(p, 'home')) break;

                    ns.print(`Failed to buy ${p}`);
                    await ns.sleep(600e3);
                } while (!ns.fileExists(p, 'home'));

                if (ns.fileExists(p, 'home')) {
                    ns.print(`Getting root access with ${p}`);
                    ns.exec('getRootAccess.js', 'home');
                }
            }
            else ownedExe++;
        }

        ns.print(`Spreading latest 'hackScript.js'`);
        ns.exec('spreadHack.js', 'home');

        if (ownedExe === 5) {
            ns.print('Got all exe. Exiting...');
            ns.tprintf('Got all exe. Program terminated.');
            ns.closeTail();
            break;
        }

        await ns.sleep(600e3);
    }
}