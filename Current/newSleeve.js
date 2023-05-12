/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.tail();

    const sl = ns.sleeve;

    // shorten function
    const playerMoney = () => ns.getServerMoneyAvailable('home');

    const numSleeve = () => sl.getNumSleeves();
    const getSleeve = id => sl.getSleeve(id);

    const getAugs = id => sl.getSleevePurchasableAugs(id);
    const installAug = (id, aug) => sl.purchaseSleeveAug(id, aug);

    const recover = id => sl.setToShockRecovery(id);
    const setCrimeTask = (id, crime) => sl.setToCommitCrime(id, crime);
    const crimeChance = (id, crime) => ns.formulas.work.crimeSuccessChance(getSleeve(id), crime);
    const crimeStats = crime => ns.singularity.getCrimeStats(crime);

    // const
    // sort the ratio between time and exp gain of crimes with time <= 60s
    // best 1st
    const crimes = [
        'shoplift',
        'rob store',
        'mug',
        'larceny',
        'deal drugs',
        'bond forgery',
        'traffick arms',
        'homicide',
        'grand theft auto',
        'kidnap',
        'assassination',
        'heist',
    ]
        .sort((a, b) => compareCrimeStats(b, a))
        .filter(a => crimeStats(a).time <= 60e3);

    while (true) {
        for (let id = 0; id < numSleeve(); id++) {
            const augs = getAugs(id);
            augs.sort((a, b) => a.cost - b.cost)
                .filter(a => a.cost < playerMoney() / (augs.length * numSleeve()))
                .forEach(aug => installAug(id, aug.name));

            if (getSleeve(id).shock > 0)
                recover(id);
            else {
                const crimeTask = crimes.find(a => crimeChance(id, a) >= 0.8);
                setCrimeTask(id, crimeTask ? crimeTask : crimes[0]);
            }
            await ns.sleep(10);
        }

        await logTask();

        const time = new Date();
        ns.printf(
            '\n Time: ' +
            `${time.getHours() < 10 ? '0' : ''}${time.getHours()}:` +
            `${time.getMinutes() < 10 ? '0' : ''}${time.getMinutes()}`
        );
        await ns.sleep(600e3);
    }

    async function logTask() {
        ns.clearLog();
        ns.resizeTail(300, 275);
        for (let id = 0; id < numSleeve(); id++) {
            let task = sl.getTask(id);
            switch (task.type.toLowerCase()) {
                case 'recovery':
                    task = 'Recovery (' + ns.formatNumber(getSleeve(id).shock, 2) + ')';
                    break;
                case 'crime':
                    task = task.crimeType + ' (' + ns.formatPercent(crimeChance(id, task.crimeType), 1) + ')';
                    break;
            }
            ns.print(` #${id} (aug=${sl.getSleeveAugmentations(id).length}): ${task}`);
            await ns.sleep(10);
        }
    }

    /** @return
     * * ```positive``` if ```crime1``` is better than ```crime2```
     * * ```negative``` if ```crime1``` is worse than ```crime2```
     * * ```0``` if they are equal
     */
    function compareCrimeStats(crime1, crime2) {
        const stats1 = crimeStats(crime1),
            stats2 = crimeStats(crime2);
        let score1 = 0, score2 = 0;
        try {
            Object.entries(stats1).forEach(([key, value]) => {
                if (key.includes('_exp')) {
                    score1 += value;
                    score2 += stats2[key];
                }
            });
            score1 /= stats1.time;
            score2 /= stats2.time;
            return score1 - score2;
        } catch (error) { }
    }
}