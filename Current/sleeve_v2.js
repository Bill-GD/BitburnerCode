/** Version 2.2.1
 * Renamed
 * Added preset: Recovery
*/
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

    const setRecover = id => sl.setToShockRecovery(id);
    const setCrimeTask = (id, crime) => sl.setToCommitCrime(id, crime);
    const crimeChance = (id, crime) => ns.formulas.work.crimeSuccessChance(getSleeve(id), crime);
    const crimeStats = crime => ns.singularity.getCrimeStats(crime);
    const setBladeWork = (id, task) => sl.setToBladeburnerAction(id, task);

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

    const bladeActions = [
        'Field analysis',
        'Recruitment',
        'Diplomacy',
        'Hyperbolic Regeneration Chamber',
        'Infiltrate synthoids',
        'Support main sleeve',
        'Take on contracts'
    ];

    let preset = await ns.prompt(
        'Use preset?',
        {
            'type': 'select',
            'choices': [
                'All Recover',
                'All Crime',
                'All Infiltrate',
                'All Diplomacy',
                'None'
            ]
        }
    );
    let sleeves = [];

    switch (preset) {
        case 'All Crime':
            sleeves = Array(numSleeve()).fill().map(() => ['Crime', null]);
            break;
        case 'All Infiltrate':
            sleeves = Array(numSleeve()).fill().map(() => ['Blade', 'Infiltrate synthoids']);
            break;
        case 'All Diplomacy':
            sleeves = Array(numSleeve()).fill().map(() => ['Blade', 'Diplomacy']);
            break;
        case 'All Recover':
            sleeves = Array(numSleeve()).fill().map(() => ['Recovery', null]);
            break;
    }

    if (preset === 'None') {
        sleeves = Array(numSleeve()).fill().map(() => [null, null]);

        let notification = '';
        selectID: while (!sleeves.every(([t, a]) => t !== null)) {
            let sleeveIDs = [];
            for (let i = 0; i < numSleeve(); i++)
                sleeveIDs.push(i);
            let selectedSleeve = await ns.prompt(
                `${notification}` +
                `Choose sleeve:\n` +
                `Confirm -> Confirm task assignments\n` +
                `Exit -> Exit program\n\n` +
                `'null' -> no change will be made\n` +
                `${getSleevesString()}`,
                { 'type': 'select', 'choices': [...sleeveIDs, 'Confirm', 'Exit'] }
            );
            if (selectedSleeve === 'Exit') ns.exit();
            if (selectedSleeve === 'Confirm') break;
            if (selectedSleeve === '') {
                notification = '(!) No sleeve selected\n\n';
                continue;
            }

            notification = '';
            let chosenOption = '';
            let chosenAction = '';
            while (chosenAction === '') {
                chosenOption = await ns.prompt(
                    `${notification}Chosen sleeve:\n` +
                    `${selectedSleeve}: ${sleeves[selectedSleeve][0]} - ${sleeves[selectedSleeve][1]}\n\n` +
                    `Choose action type for sleeve:`,
                    { 'type': 'select', 'choices': ['Recovery', 'Crime', 'Blade', 'Go Back'] });
                if (chosenOption === '') {
                    chosenAction = '';
                    notification = '(!) No action type selected\n\n';
                    continue;
                }
                if (chosenOption === 'Go Back') {
                    notification = '';
                    continue selectID;
                }
                if (chosenOption === 'Recovery' && getSleeve(selectedSleeve).shock <= 0) {
                    notification = `(!) Sleeve ${selectedSleeve} shock is 0\n\n`;
                    continue;
                }
                sleeves[selectedSleeve][0] = chosenOption;
                if (chosenOption === 'Recovery' || chosenOption === 'Crime') break;
                if (chosenOption === 'Blade') {
                    chosenAction = await ns.prompt(
                        'Choose Bladeburner action',
                        { 'type': 'select', 'choices': bladeActions }
                    );
                    if (chosenAction !== '') sleeves[selectedSleeve][1] = chosenAction;
                }
            }
        }
    }

    sleeves.forEach(([type, action], id) => {
        if (!type) return;

        if (type === 'Recovery')
            setRecover(id);
        else if (type === 'Crime') {
            const crimeTask = crimes.find(a => crimeChance(id, a) >= 0.8);
            setCrimeTask(id, crimeTask ? crimeTask : crimes[0]);
        }
        else if (type === 'Blade' && action)
            setBladeWork(id, action);
    });

    while (true) {
        sleeves.forEach(([t, a], id) => {
            const augs = getAugs(id);
            augs.sort((a, b) => a.cost - b.cost)
                .filter(a => a.cost < playerMoney() / (augs.length * numSleeve()))
                .forEach(aug => {
                    if (getSleeve(id).shock <= 0) installAug(id, aug.name);
                });
        });

        logTask();

        const time = new Date();
        ns.printf(
            '\n Time: ' +
            `${time.getHours() < 10 ? '0' : ''}${time.getHours()}:` +
            `${time.getMinutes() < 10 ? '0' : ''}${time.getMinutes()}`
        );
        await ns.sleep(600e3);
    }

    function logTask() {
        ns.clearLog();
        ns.resizeTail(450, 280);
        for (let id = 0; id < numSleeve(); id++) {
            let task = sl.getTask(id);
            switch (task.type.toLowerCase()) {
                case 'bladeburner':
                    task = task.actionName;
                    break;
                case 'recovery':
                    task = 'Recovery (' + ns.formatNumber(getSleeve(id).shock, 2) + ')';
                    break;
                case 'crime':
                    task = task.crimeType + ' (' + ns.formatPercent(crimeChance(id, task.crimeType), 1) + ')';
                    break;
                default:
                    task = task.type[0] + task.type.substring(1).toLowerCase();
                    break;
            }
            ns.print(` #${id} (aug=${sl.getSleeveAugmentations(id).length}): ${task}`);
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

    function getSleevesString() {
        let string = '';
        sleeves.forEach(([type, action], id) => string += `${id}: ${type} - ${action}\n`);
        return string;
    }
}