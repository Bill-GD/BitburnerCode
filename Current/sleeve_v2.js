/** Version 2.2.4
 * Now updates every second if all is Idling
 * Task and time logging is now in the same function
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

    const setIdle = id => sl.setToIdle(id);
    const setRecover = id => sl.setToShockRecovery(id);
    const setCrimeTask = (id, crime) => sl.setToCommitCrime(id, crime);
    const crimeChance = (id, crime) => ns.formulas.work.crimeSuccessChance(getSleeve(id), crime);
    const crimeStats = crime => ns.singularity.getCrimeStats(crime);
    const setBladeWork = (id, task) => sl.setToBladeburnerAction(id, task);

    // sort the ratio between time and exp gain of crimes with time <= 60s, best 1st
    const crimes = Object.keys(ns.enums.CrimeType).map(c => ns.enums.CrimeType[c])
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
        'Use preset?\nThese apply to all sleeves.\n\n' +
        'Ignore to skip',
        {
            'type': 'select',
            'choices': [
                'Idle',
                'Recover',
                'Combat',
                'Karma',
                'Infiltrate',
                'Diplomacy',
                'None'
            ]
        }
    );
    let sleeves = [];

    switch (preset) {
        case 'Idle':
            sleeves = Array(numSleeve()).fill().map(() => ['Idle', null]);
            break;
        case 'Combat':
            sleeves = Array(numSleeve()).fill().map(() => ['Crime', 'combat']);
            break;
        case 'Karma':
            sleeves = Array(numSleeve()).fill().map(() => ['Crime', 'karma']);
            break;
        case 'Infiltrate':
            sleeves = Array(numSleeve()).fill().map(() => ['Blade', 'Infiltrate synthoids']);
            break;
        case 'Diplomacy':
            sleeves = Array(numSleeve()).fill().map(() => ['Blade', 'Diplomacy']);
            break;
        case 'Recover':
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
                `Exit/Ignore -> Exit program\n\n` +
                `'null' -> no change will be made\n` +
                `${getSleevesString()}`,
                { 'type': 'select', 'choices': [...sleeveIDs, 'Confirm', 'Exit'] }
            );
            if (selectedSleeve === 'Exit' || selectedSleeve === '') ns.exit();
            if (selectedSleeve === 'Confirm') break;

            notification = '';
            let chosenOption = '';
            let chosenAction = '';
            while (chosenAction === '') {
                chosenOption = await ns.prompt(
                    `${notification}Chosen sleeve:\n` +
                    `${selectedSleeve}: ${sleeves[selectedSleeve][0]} - ${sleeves[selectedSleeve][1]}\n\n` +
                    `Choose action type for sleeve:`,
                    { 'type': 'select', 'choices': ['Idle', 'Recovery', 'Crime', 'Blade', 'Go Back'] });
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
                if (chosenOption === 'Recovery' || chosenOption === 'Crime' || chosenOption === 'Idle') break;
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

        switch (type) {
            case 'Recovery':
                setRecover(id);
                break;
            case 'Idle':
                setIdle(id);
                break;
            case 'Crime':
                if (action === 'combat') {
                    const crimeTask = crimes.find(a => crimeChance(id, a) >= 0.8);
                    setCrimeTask(id, crimeTask ? crimeTask : crimes[0]);
                }
                if (action === 'karma') {
                    crimes.sort((a, b) => crimeStats(b).karma - crimeStats(a).karma);
                    setCrimeTask(id, crimes[0]);
                }
                break;
            case 'Blade':
                if (action) setBladeWork(id, action);
                break;
        }
    });

    const isAllIdle = sleeves.every(([t, a]) => t === 'Idle');

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
        await ns.sleep(isAllIdle ? 1e3 : 600e3);
    }

    function logTask() {
        let maxWidth = 0;
        ns.clearLog();
        for (let id = 0; id < numSleeve(); id++) {
            let task = sl.getTask(id);
            if (!task) task = `Idle (${ns.formatNumber(getSleeve(id).storedCycles)})`;
            else
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
            const taskStr = ` #${id} (aug=${sl.getSleeveAugmentations(id).length}): ${task}`;
            maxWidth = Math.max(maxWidth, taskStr.length);
            ns.print(taskStr);
        }

        const time = new Date();
        ns.printf(
            `\n At: ` +
            `${time.getDate()}/${time.getMonth() + 1}` +
            ` ${time.getHours() < 10 ? '0' : ''}${time.getHours()}:${time.getMinutes() < 10 ? '0' : ''}${time.getMinutes()}`
        );
        ns.resizeTail(Math.max(250, maxWidth * 10), 280);
    }

    /** @return
     * ```number```
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