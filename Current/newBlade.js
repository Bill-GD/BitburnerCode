/** Version 4.6.2
 * * Changed checkCity
 *  - Population lower limit: 1b
 *  - Actually select most populated city now
 * * Fixed difficultyFac:
 *  - Was: 1.44
 *  - Now: 1.044
 *  - The average was increased by 0.2 because of this
 * 
 * * Changed work count check: increase if any contract/operation has ran out
 * ! Consider removing this feature:
 *  - Each 'Incite Violence' completed: 0-1 work, 50-100 chaos (too much)
 *  - Sleeves can 'Infiltrate': no chaos increase, potentially infinite work, separated script, 8 sleeves
*/
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.clearLog();
    ns.tail();

    const blade = ns.bladeburner;

    if (!blade.inBladeburner())
        blade.joinBladeburnerDivision() ? ns.tprintf(" (!) Joined Bladeburner") : ns.exit();

    // shortened function
    const player = () => ns.getPlayer();
    const successChance = (type = '', name = '') => blade.getActionEstimatedSuccessChance(type, name);
    const populationOf = city => blade.getCityEstimatedPopulation(city);
    const currentAction = () => blade.getCurrentAction();
    const actionTime = (type = '', name = '') => blade.getActionTime(type, name);
    const actionCount = (type = '', name = '') => blade.getActionCountRemaining(type, name);
    const requiredSP = skill => blade.getSkillUpgradeCost(skill);
    const cityChaos = (city = '') => blade.getCityChaos(city);
    const skillLvl = skill => blade.getSkillLevel(skill);

    // for chaos purpose
    const stealthSuccessMult = () => skillLvl(`Cloak`) * 0.055 + 1;
    const retirementSuccessMult = () => skillLvl(`Short-Circuit`) * 0.055 + 1;
    const opSuccessMult = () => skillLvl(`Digital Observer`) * 0.04 + 1;

    // const
    const cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    const contracts = blade.getContractNames();
    const operations = blade.getOperationNames();
    operations.splice(3, 1); // removes 'Raid'

    let currentBlackOp = getCurrentBlackOp();

    while (true) {
        // general
        await checkCity();
        await performAction('general', 'Training');
        await performAction('general', 'Field Analysis');
        await regulateChaos();
        await upgradeSkills();

        // contracts
        await checkAccuracy('contract', 'Tracking');
        if (successChance('contract', 'Tracking')[0] >= 0.7 &&
            successChance('operation', 'Investigation')[0] < 0.8) {
                for (const con of contracts) {
                await checkCity();
                await checkBlackOps();
                await checkAccuracy('contract', con);
                if (successChance('contract', con)[0] < 0.7) continue;
                await performAction('contract', con, Math.min(10, actionCount('contract', con)));
                await upgradeSkills();
                await ns.sleep(10);
            }
            await regulateChaos();
            await increaseWorkCount();
        }

        // operations
        await checkAccuracy('operation', 'Investigation');
        if (successChance('operation', 'Investigation')[0] >= 0.8) {
            for (const op of operations) {
                await checkCity();
                await checkBlackOps();
                await checkAccuracy('operation', op);
                if (successChance('operation', op)[0] < 0.8) continue;
                await performAction('operation', op, Math.min(10, actionCount('operation', op)));
                await upgradeSkills();
                await ns.sleep(10);
            }
            await regulateChaos();
            await increaseWorkCount();
        }

        await checkBlackOps();
        await ns.sleep(10);
    }

    function logAction(type = '', name = '', count = 1) {
        ns.moveTail(1655, 815);
        ns.resizeTail(460, 230);
        const city = blade.getCity();
        ns.clearLog();
        ns.print(
            ` Tracking: ${ns.formatPercent(successChance('contract', 'Tracking')[0], 1)}` +
            `, Investigation: ${ns.formatPercent(successChance('operation', 'Investigation')[0], 1)}\n` +
            (currentBlackOp !== '' ? ` ${currentBlackOp}: ${ns.formatPercent(successChance('black op', currentBlackOp)[0], 1)}` : '')
        );
        ns.printf(` Current action: ${type}\n > ${name}${count > 1 ? ` x${count}` : ''}`);
        ns.printf(' ----------------------------------');
        ns.printf(
            ` Rank: ${ns.formatNumber(blade.getRank())} / ${ns.formatNumber(blade.getBlackOpRank(currentBlackOp))}` +
            `, SP: ${ns.formatNumber(blade.getSkillPoints())}`);
        ns.printf(` Stamina: ${ns.formatNumber(blade.getStamina()[0], 1)} / ${ns.formatNumber(blade.getStamina()[1], 1)}`);
        ns.printf(` City: ${city}, Chaos: ${ns.formatNumber(cityChaos(city))}, Pop: ${ns.formatNumber(populationOf(city))}`);
    }

    /** Calculates the best city based on the population, chaos, player stats and Bladeburner skills (from source code) */
    async function checkCity() {
        let citiesCopy = cities.slice();

        citiesCopy = citiesCopy.filter(c => populationOf(c) >= 1e9);

        citiesCopy.sort((a, b) => getAverageChance(a) - getAverageChance(b));
        blade.switchCity(citiesCopy[citiesCopy.length - 1]);

        await ns.sleep(50);
    }

    /** Loosely estimated average success chance of the specified ```city```.
     * 
     * Since this is hardcoded and there's no way to dynamically calculate them (Bitburner doesn't provide any way to get ```weights``` and ```decays```), this CAN break if source changes.
     * @formula ```chance = competence / difficulty```
     * @see https://github.com/bitburner-official/bitburner-src/blob/dev/src/Bladeburner/Action.tsx#L239
    */
    function getAverageChance(city = '') {
        return Math.min(1, getCompetence(city) / getDifficulty(city));
    }

    /** Calculates the chaos threshold based on the loosely calculated situation of the specified ```city```.
     * @see {@link getAverageChance()}
     */
    function getChaosThreshold(city = '', chance = 1) {
        let contractLevel = 0, opLevel = 0;
        contracts.forEach(c => contractLevel += blade.getActionCurrentLevel('contract', c));
        operations.forEach(op => opLevel += blade.getActionCurrentLevel('operation', op));
        const averageActionLevel = (contractLevel / contracts.length + opLevel / operations.length) / 2;

        return Math.pow(getCompetence(city) / (100 * chance * Math.pow((1.03 + 1.044) / 2, averageActionLevel - 1)), 2) + 49;
    }

    function getCompetence(city) {
        let competence = 0;
        // + actionWeight * Math.pow(skillMult * playerLvl, actionDecay) // for each stat
        competence += 0.083 * Math.pow(1 * player().skills.hacking, 0.37);
        competence += 0.1125 * Math.pow(1 * player().skills.strength, 0.876);
        competence += 0.1125 * Math.pow(1 * player().skills.defense, 0.876);
        competence += 0.254 * Math.pow(1 * player().skills.dexterity, 0.876);
        competence += 0.23 * Math.pow(1 * player().skills.agility, 0.876);
        competence += 0.104 * Math.pow(1 * player().skills.charisma, 0.592);
        competence += 0.097 * Math.pow(1 * player().skills.intelligence, 0.908);

        competence *= 1 + (0.75 * Math.pow(player().skills.intelligence, 0.8)) / 600;
        competence *= Math.min(1, blade.getStamina()[0] / (0.5 * blade.getStamina()[1]));
        competence *= Math.pow(populationOf(city) / 1e9, 0.7);
        competence *= (skillLvl(`Blade's Intuition`) * 0.03 + 1);
        competence *= ((stealthSuccessMult() + retirementSuccessMult() * 2) / 3
            + (stealthSuccessMult() * 3 + retirementSuccessMult() + stealthSuccessMult() * retirementSuccessMult() * 2) * opSuccessMult() / 6) / 2;
        competence *= player().mults.bladeburner_success_chance;

        return competence;
    }

    // average difficultyFac: contract - 1.03, op - 1.044
    function getDifficulty(city) {
        let contractLevel = 0, opLevel = 0;
        contracts.forEach(c => contractLevel += blade.getActionCurrentLevel('contract', c));
        operations.forEach(op => opLevel += blade.getActionCurrentLevel('operation', op));
        const averageActionLevel = (contractLevel / contracts.length + opLevel / operations.length) / 2;

        const chaos = cityChaos(city);
        let chaosBonus = chaos > 50 ? Math.pow(chaos - 49, 0.5) : 1;

        return 100 * Math.pow((1.03 + 1.044) / 2, averageActionLevel - 1) * chaosBonus;
    }

    /** If success chance accuracy of ```name``` is insufficient (```[0] != [1]```) starts ```Field Analysis``` */
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
            for (let i = 0; i < count; i++) {
                if (blade.startAction(type, action)) {
                    logAction(currentAction().type, currentAction().name, i + 1);
                    await ns.sleep(Math.max(1e3, actionTime(type, action) / bonusTime()));
                }
                await ns.sleep(10);
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
                await performAction('general', 'Hyperbolic Regeneration Chamber', 1, false);
    }

    function bonusTime() { return blade.getBonusTime() > 1e3 ? 5 : 1; }

    /** Continuously upgrade skill while SP is sufficient. */
    async function upgradeSkills() {
        const allSkills = blade.getSkillNames();
        const skillIndex = [0, 1, 2, 3, 5, 6, 7, 11];

        const chosenSkills = [];
        skillIndex.forEach(i => {
            if (i === 5 && skillLvl(allSkills[i]) === 90) return;
            if (i === 11 && skillLvl(allSkills[i]) === 20) return;
            chosenSkills.push(allSkills[i]);
        });

        chosenSkills.sort((a, b) => requiredSP(a) - requiredSP(b));

        while (blade.getSkillPoints() >= requiredSP(chosenSkills[0])) {
            if (chosenSkills[0] === 'Overclock' && skillLvl(chosenSkills[0]) >= 90 ||
                chosenSkills[0] === 'Hyperdrive' && skillLvl(chosenSkills[0]) >= 20)
                chosenSkills.splice(0, 1);
            logAction('Upgrade Skill', chosenSkills[0]);
            blade.upgradeSkill(chosenSkills[0]);
            chosenSkills.sort((a, b) => requiredSP(a) - requiredSP(b));
            await ns.sleep(10);
        }
    }

    function hasContractRanOut() {
        let ranOut = false;
        !ranOut && contracts.forEach(con => {
            if (actionCount('contract', con) <= 0) {
                ranOut = true;
                return;
            }
        });
        return ranOut;
    }

    function hasOpRanOut() {
        let ranOut = false;
        !ranOut && operations.forEach(op => {
            if (actionCount('operation', op) <= 0) {
                ranOut = true;
                return;
            }
        });
        return ranOut;
    }

    /** Increase work count for contracts/operations. Regulate chaos afterwards.
     * @see {@link regulateChaos()}
    */
    async function increaseWorkCount() {
        while (hasContractRanOut() || hasOpRanOut()) {
            await performAction('general', 'Incite Violence');
            await regulateChaos();
            await ns.sleep(10);
        }
    }

    /** Starts ```Diplomacy``` if ```chaos > getChaosThreshold```, nothing otherwise.
     * @see {@link getChaosThreshold()}
     */
    async function regulateChaos() {
        const currentCity = blade.getCity();
        if (cityChaos(currentCity) <= 50) return;

        while ((successChance('black op', currentBlackOp)[0] < 1 || successChance('operation', 'Assassination')[0] < 1)
            && cityChaos(currentCity) > getChaosThreshold(currentCity, 0.3)) {
            await performAction('general', 'Diplomacy');
            await performAction('general', 'Training');
            await performAction('general', 'Field Analysis');
            await ns.sleep(10);
        }
    }

    /** Perform the current black op if ```chance === 100%``` and ```rank``` is sufficient */
    async function checkBlackOps() {
        while (true) {
            if (currentBlackOp === '') { // Daedalus is done
                ns.alert(`=====  Operation Daedalus is accomplished  =====\n(!) Destroy this BitNode when you're ready (!)`);
                blade.stopBladeburnerAction();
                ns.closeTail();
                ns.exit();
            }
            if (blade.getRank() < blade.getBlackOpRank(currentBlackOp)) return;
            await checkAccuracy('black op', currentBlackOp);
            if (successChance('black op', currentBlackOp)[0] < 1) return;

            await performAction('black op', currentBlackOp);
            await upgradeSkills();
            currentBlackOp = getCurrentBlackOp();
            await ns.sleep(10);
        }
    }

    function getCurrentBlackOp() {
        let currentBlackOp = '';
        blade.getBlackOpNames().forEach(bo => {
            if (currentBlackOp !== '') return;
            if (actionCount('black op', bo) > 0) {
                currentBlackOp = bo;
                return;
            }
        });
        return currentBlackOp;
    }
}