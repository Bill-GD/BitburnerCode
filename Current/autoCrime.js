/** Version 2.0.1
 * Added support for progress bar
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.tail();

    ns.atExit(() => {
        if (ns.singularity.getCurrentWork()?.type === 'CRIME') ns.singularity.stopAction();
    });

    if (ns.singularity.getCurrentWork()?.type === 'GRAFTING') {
        ns.print(`Currently grafting. Can't start crime. Exiting...`);
        ns.exit();
    }

    const crimes = Object.keys(ns.enums.CrimeType).map(c => ns.enums.CrimeType[c]);

    const crimeName = await ns.prompt('Choose crime', { 'type': 'select', 'choices': crimes });
    if (crimeName === '') ns.exit();

    ns.clearLog();

    const totalTime = ns.singularity.commitCrime(
        crimeName,
        !ns.singularity.getOwnedAugmentations().includes('Neuroreceptor Management Implant')
    );

    try {
        while (true) {
            ns.resizeTail(285, 155);
            ns.clearLog();
            ns.print(` Crime: ${crimeName}`);
            ns.print(` Time: ${ns.tFormat(totalTime)}`);
            ns.print(` Progress: ${progressBar((ns.singularity.getCurrentWork().cyclesWorked * 200) % totalTime, totalTime, 14)}`);
            ns.print(` Chance: ${ns.formatPercent(ns.formulas.work.crimeSuccessChance(ns.getPlayer(), crimeName), 2)}`);
            ns.print(` Karma: ${ns.formatNumber(ns.heart.break(), 3)}`);
            await ns.asleep(50);
        }
    } catch (error) {
        ns.print('Crime task was forcibly stopped.');
    }

    function progressBar(currentProgress, fullProgress, maxChar = 10) {
        const progressPerChar = fullProgress / maxChar;
        const progressChar = Math.trunc(currentProgress / progressPerChar);
        let p = '[';
        for (let i = 0; i < maxChar; i++)
            i < progressChar ? p += '\u2588' : p += ' ';
        return p + ']';
    }
}