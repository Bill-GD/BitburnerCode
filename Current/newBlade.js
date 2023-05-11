/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.tail();
    ns.moveTail(1650, 800);

    const blade = ns.bladeburner;

    if (!blade.inBladeburner())
        blade.joinBladeburnerDivision() ? ns.tprintf(" (!) Joined Bladeburner") : ns.exit();

    // shortened function
    const successChance = (type = '', name = '') => blade.getActionEstimatedSuccessChance(type, name);
    const populationOf = city => blade.getCityEstimatedPopulation(city);
    const currentAction = () => blade.getCurrentAction();
    const actionTime = (type = '', name = '') => blade.getActionTime(type, name);
    const actionCount = (type = '', name = '') => blade.getActionCountRemaining(type, name);
    const requiredSP = skill => blade.getSkillUpgradeCost(skill);
    const cityChaos = (city = '') => blade.getCityChaos(city);

    // const
    const maxActionCount = 10; // maximum number of actions of each type

    const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    const generalActions = blade.getGeneralActionNames();
    const contracts = blade.getContractNames();
    const operations = blade.getOperationNames();
    const blackOps = blade.getBlackOpNames();

    let currentBlackOp = getCurrentBlackOp();

    while (true) {
        // general
        do {
            await checkBlackOps();
            await performAction('general', generalActions[0]);
            await checkAccuracy('contract', contracts[0]);
            await regulateChaos();
            await upgradeSkills();
            await ns.sleep(10);
        } while (successChance('contract', contracts[0])[0] < 0.5);

        // contracts
        do {
            for (const con of contracts) {
                let count = 0;
                await checkCity();
                while (actionCount('contract', con) > 0 && count < maxActionCount) {
                    await checkBlackOps();
                    await checkAccuracy('contract', con);
                    await performAction('contract', con);
                    await upgradeSkills();
                    count++;
                    await ns.sleep(10);
                }
            }
            await regulateChaos();
            await increaseWorkCount();
            await ns.sleep(10);
        } while (successChance('operation', operations[0])[0] < 0.6);

        // operations
        do {
            for (const op of operations) {
                let count = 0;
                await checkCity();
                while (actionCount('operation', op) > 0 && count < maxActionCount) {
                    await checkBlackOps();
                    if (op === 'Raid') return;
                    await checkAccuracy('operation', op);
                    await performAction('operation', op);
                    await upgradeSkills();
                    count++;
                    await ns.sleep(10);
                }
            }
            await regulateChaos();
            await increaseWorkCount();
            await ns.sleep(10);
        } while (successChance('black op', currentBlackOp)[0] < 1);

        await ns.sleep(10);
    }

    function logAction(type = '', name = '') {
        ns.resizeTail(425, 180);
        const city = blade.getCity();
        ns.clearLog();
        ns.print(
            ` c1=${ns.formatPercent(successChance('contract', contracts[0])[0], 1)}` +
            `, op1=${ns.formatPercent(successChance('operation', operations[0])[0], 1)}` +
            (currentBlackOp !== '' ? `, ${currentBlackOp.substring(10)}=${ns.formatPercent(successChance('black op', currentBlackOp)[0], 1)}` : '')
        );
        ns.printf(` action=${type}\n > ${name}`);
        ns.printf(' ----------------------------------');
        ns.printf(` rank=${ns.formatNumber(blade.getRank(), 1)}, SP=${ns.formatNumber(blade.getSkillPoints(), 1)}`);
        ns.printf(` city=${city}, chaos=${ns.formatNumber(blade.getCityChaos(city))}, pop=${ns.formatNumber(populationOf(city), 2)}`);
    }

    /** ```switchCity``` if current population is the lowest. Moves to highest. */
    async function checkCity() {
        let citiesCopy = cities.slice();

        let currentCity = blade.getCity();

        let index = citiesCopy.findIndex(city => city === currentCity);
        index > -1 ? citiesCopy.splice(index, 1) : 0;

        citiesCopy.sort((a, b) => populationOf(b) - populationOf(a));

        if (populationOf(currentCity) < populationOf(citiesCopy[0]))
            blade.switchCity(citiesCopy[0]);

        await ns.sleep(50);
    }

    /** If accuracy is insufficient (```[0] != [1]```) start ```Field Analysis``` */
    async function checkAccuracy(type, name) {
        while (successChance(type, name)[0] !== successChance(type, name)[1])
            await performAction('general', 'Field Analysis');
    }

    /** Starts the specified action a certain amount of time (```default=1```) and write to log.
     * 
     * Also check stamina beforehand.
    */
    async function performAction(type = '', action = '', count = 1, stamina = true) {
        stamina && await checkStamina();
        if (type === 'general' || type === 'contract' || type === 'operation' || type === 'black op') {
            if (blade.startAction(type, action)) {
                logAction(currentAction().type, currentAction().name);
                await ns.sleep(actionTime(type, action) * count / (actionTime(type, action) > 5e3 ? bonusTime() : 1));
            }
        }
        else {
            ns.alert('(!) Action type is Invalid (!)');
            ns.exit();
        }
    }

    /** Rest (loop) if stamina is less than half. Rest until full. */
    async function checkStamina() {
        if (blade.getStamina()[0] < 0.5 * blade.getStamina()[1])
            while (blade.getStamina()[0] < blade.getStamina()[1])
                await performAction('general', generalActions[4], 1, false);
    }

    function bonusTime() { return blade.getBonusTime() > 3000 ? 5 : 1; }

    /** Continuously upgrade skill while SP is sufficient. */
    async function upgradeSkills() {
        const allSkills = blade.getSkillNames();
        const skillIndex = [0, 1, 2, 3, 5, 6, 7, 11];

        const chosenSkills = [];
        skillIndex.forEach(i => {
            if (i === 5 && requiredSP(allSkills[i]) === 90) return;
            if (i === 11 && requiredSP(allSkills[i]) === 20) return;
            chosenSkills.push(allSkills[i]);
        });

        chosenSkills.sort((a, b) => requiredSP(a) - requiredSP(b));

        while (blade.getSkillPoints() >= requiredSP(chosenSkills[0])) {
            logAction('Upgrade Skill', chosenSkills[0]);
            blade.upgradeSkill(chosenSkills[0]);
            chosenSkills.sort((a, b) => requiredSP(a) - requiredSP(b));
            await ns.sleep(100);
        }
    }

    /** Increase work count for contracts/operations. */
    async function increaseWorkCount() {
        // - Incite Violence -> work count++, chaos++
        // - Diplomacy -> chaos--, can ignore if chance is sufficient
        while (actionCount('contract', contracts[0]) <= 100 || actionCount('operation', operations[0]) <= 100) {
            await performAction('general', generalActions[5]);
            await ns.sleep(10);
        }
        await regulateChaos();
    }

    async function regulateChaos() {
        if (cityChaos(blade.getCity()) < 300) return;

        while (cityChaos(blade.getCity()) > 50) {
            await performAction('general', generalActions[3]);
            await ns.sleep(10);
        }
    }

    /** Perform the current black op if chance is 100% */
    async function checkBlackOps() {
        await checkAccuracy('black op', currentBlackOp);
        if (blade.getRank() >= blade.getBlackOpRank(currentBlackOp) && successChance('black op', currentBlackOp)[0] >= 1) {
            await performAction('black op', currentBlackOp);
            await upgradeSkills();
            currentBlackOp = getCurrentBlackOp();
            if (currentBlackOp === blackOps[blackOps.length - 1]) {
                ns.alert(`(!) Operation Daedalus is accomplished (!)\n(!) Destroy this BitNode when you're ready (!)`);
                ns.exit();
            }
        }
    }

    function getCurrentBlackOp() {
        let currentBlackOp = '';
        blackOps.forEach(bo => {
            if (currentBlackOp !== '') return;
            if (actionCount('black op', bo) > 0) {
                currentBlackOp = bo;
                return;
            }
        });
        return currentBlackOp;
    }
}