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
    const crimeTime = ns.singularity.getCrimeStats(crimeName).time;

    while (true) {
        ns.clearLog();
        ns.resizeTail(275, 130);
        ns.moveTail(1820, 650);

        ns.printf(` Crime: ${crimeName}`);
        ns.printf(` Time: ${ns.tFormat(crimeTime)}`);
        ns.print(` Chance: ${ns.formatPercent(ns.formulas.work.crimeSuccessChance(ns.getPlayer(), crimeName), 2)}`);
        ns.print(` Karma: ${ns.formatNumber(ns.heart.break(), 1)}`);

        await ns.asleep(ns.singularity.commitCrime(
            crimeName,
            !ns.singularity.getOwnedAugmentations().includes('Neuroreceptor Management Implant')
        ));
    }
}