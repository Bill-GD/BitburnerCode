/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.tail();
    ns.moveTail(1700, 800);
    ns.resizeTail(425, 200);

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
    const currentSP = () => blade.getSkillPoints();
    const cityChaos = (city = '') => blade.getCityChaos(city);

    // const
    const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    const generalActions = blade.getGeneralActionNames();
    const contracts = blade.getContractNames();
    const operations = blade.getOperationNames();
    const blackOps = blade.getBlackOpNames();

    let isSkipping = false;
    isSkipping = await ns.prompt(`(!) Skip Mode: quickly finish Black Ops (!)\n\t     (Skip to Daedalus)\n\t  (?) ENABLE Skip Mode (?)`);

    while (true) {
        // normal
        if (!isSkipping) {
            // general
            while (successChance('contract', contracts[0])[0] < 0.5) {
                await performAction('general', generalActions[0]);
                await checkAccuracy();
                await regulateChaos();
                await upgradeSkills();
                await ns.sleep(10);
            }

            // contracts
            do {
                for (const con of contracts) {
                    await checkCity();
                    await checkAccuracy();
                    do {
                        await performAction('contract', con);
                        await upgradeSkills();
                        await ns.sleep(10);
                    } while (actionCount('contract', con) > 0);
                }
                await regulateChaos();
                await increaseWorkCount();
                await ns.sleep(10);
            } while (blade.getRank() < 4e5 || successChance('operation', operations[0])[0] < 0.6);

            isSkipping = true;
        }
        // skip mode
        if (isSkipping) {
            // increase stats if chose skip
            await checkAccuracy();
            while (successChance('operation', operations[0])[0] < 0.6) {
                blade.stopBladeburnerAction();
                ns.clearLog();
                ns.print(`Operations success chance: ${ns.formatPercent(successChance('operation', operations[0])[0], 1)}\n -> Insufficient.\n > Committing Crime...`);
                ns.run('autoCrime.js', 1, 'homi');
                await ns.sleep(1e3 * 60 * 30);
                ns.kill('autoCrime.js', 'home');
                await ns.sleep(3e3);
                await checkAccuracy();
            }

            // operations
            while (blade.getRank() < 4e5 || successChance('black op', blackOps[blackOps.length - 1])[0] < 1) {
                for (const op of operations) {
                    await checkCity();
                    await checkAccuracy();
                    do {
                        if (op === 'Raid') return;
                        await performAction('operation', op);
                        await upgradeSkills();
                        await ns.sleep(10);
                    } while (actionCount('operation', op) > 0);
                }
                await regulateChaos();
                await increaseWorkCount();
                await ns.sleep(10);
            }

            // black ops
            if (blade.getRank() >= 4e5 && successChance('black op', blackOps[blackOps.length - 1])[0] >= 1) {
                for (const bo of blackOps) {
                    await performAction('black op', bo);
                    await upgradeSkills();
                }
                if (actionCount(blackOps[blackOps.length - 1]) < 1) {
                    ns.alert(`(!) Operation Daedalus is accomplished (!)\n(!) Destroy this BitNode when you're ready (!)`);
                    ns.exit();
                }
            }
        }

        await ns.sleep(10);
    }

    function logAction(type = '', name = '') {
        const city = blade.getCity();
        ns.clearLog();
        ns.printf(` skip=${isSkipping}`);
        ns.print(` t1=${ns.formatPercent(successChance('contract', contracts[0])[0], 1)}, op1=${ns.formatPercent(successChance('operation', operations[0])[0], 1)}, bo1=${ns.formatPercent(successChance('black op', blackOps[0])[0], 1)}`);
        ns.printf(` action=${type}\n > ${name}`);
        ns.printf(' ----------------------------------');
        ns.printf(` rank=${ns.formatNumber(blade.getRank(), 1)}, SP=${ns.formatNumber(blade.getSkillPoints(), 1)}`);
        ns.printf(` city=${city}, chaos=${ns.formatNumber(blade.getCityChaos(city), 1)}, pop=${ns.formatNumber(populationOf(city), 2)}`);
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
    async function checkAccuracy() {
        while (successChance('operation', operations[0])[0] !== successChance('operation', operations[0])[1])
            await performAction('general', 'Field Analysis');
        await ns.sleep(10);
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
        await ns.sleep(50);
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

        while (currentSP() >= requiredSP(chosenSkills[0])) {
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
}