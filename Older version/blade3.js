let skip = false;

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();
    ns.moveTail(1700, 800);
    ns.resizeTail(425, 175);

    const bp = ns.bladeburner;
    if (!bp.inBladeburner())
        bp.joinBladeburnerDivision() ? ns.tprintf(" (!) Joined Bladeburner") : ns.exit();

    const successChance = (type = "", name = "") => bp.getActionEstimatedSuccessChance(type, name);
    const blackOps = bp.getBlackOpNames();

    skip = await ns.prompt(`(!) When your combat skills are high enough you can use (!) \n(!) Skip Mode to quickly gain rank and finish Black Ops (!)\n\t      (Skip to ${blackOps[blackOps.length - 1]})\n\t\t(?) ENABLE Skip Mode (?)`);

    while (true) {
        changeCity(bp);

        if (skip) await skipMode(ns);

        let successLastOp = successChance('operation', bp.getOperationNames().slice(-1).pop());
        if (successLastOp[1] <= 0.4) {
            // ns.bladeburner.stopBladeburnerAction();
            ns.run('autoCrime.js', 1, 'homi');
            while (successLastOp[1] <= 0.4) {
                ns.clearLog();
                ns.print(`Operations success chance: ${ns.formatPercent((successLastOp[0] + successLastOp[1]) / 2, 1)}\n -> Insufficient.\n > Committing Crime...`);
                await ns.sleep(300e3);
                successLastOp = successChance('operation', bp.getOperationNames().slice(-1).pop());
            }
            ns.print(`Operations success chance are sufficient. Starting Skip Mode.`);
            ns.kill("autoCrime.js", "home");
            skip = true;
        }

        await upSkill(ns);
        await checkChaos(ns);

        await ns.sleep(10);
    }
}

function changeCity(bp) {
    const population = c => bp.getCityEstimatedPopulation(c);
    let cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"];
    let city = bp.getCity();
    for (let i in cities)
        if (cities[i] === city) cities.splice(i, 1);
    cities.sort((a, b) => population(a) - population(b));
    if (population(city) < population(cities[0]))
        bp.switchCity(cities[0]);
}

function showInfo(ns) {
    const curAction = ns.bladeburner.getCurrentAction();
    const city = ns.bladeburner.getCity();
    ns.printf(` - Skip=${skip}`);
    ns.printf(` - Current: ${curAction.type}\n  > ${curAction.name}`);
    ns.printf('----------------------------');
    ns.printf(` Rank=${ns.formatNumber(ns.bladeburner.getRank(), 0)}, SP=${ns.formatNumber(ns.bladeburner.getSkillPoints(), 0)}`);
    ns.printf(` City=${city}, Chaos=${ns.formatNumber(ns.bladeburner.getCityChaos(city))}, Pop=${ns.formatNumber(ns.bladeburner.getCityEstimatedPopulation(city))}`);
}

const bonusTime = ns => ns.bladeburner.getBonusTime() > 3000 ? 5 : 1;

async function chaos(ns, city, option) {
    const bp = ns.bladeburner;
    switch (option) {
        case 'up':
            await performAction(ns, 'general', 'Incite Violence');
            while (bp.getCityChaos(city) < bp.getStamina()[1] / 2) await ns.sleep(6e5);
            break;
        case 'down':
            await performAction(ns, 'general', 'Diplomacy');
            while (bp.getCityChaos(city) >= bp.getStamina()[1] / 2) await ns.sleep(6e5);
            break;
    }
}

async function checkChaos(ns) {
    const bp = ns.bladeburner;
    let city = bp.getCity();
    if (bp.getCityChaos(city) > bp.getStamina()[1] / 2) await chaos(ns, city, 'down');
}

function genSkillsList(ns, skip = false) {
    const skill = ns.bladeburner.getSkillNames();
    let skillAll = [];
    let arr = [0, 1, 2, 3, 6, 7];


    skip ? arr.splice(1, 1) : 0;
    ns.bladeburner.getSkillLevel(skill[5]) < 90 ? skillAll.push(skill[5]) : 0;
    ns.bladeburner.getSkillLevel(skill[11]) < 20 ? skillAll.push(skill[11]) : 0;

    for (let i of arr) skillAll.push(skill[i]);
    return skillAll;
}

async function upSkill(ns, skip = false) {
    const bp = ns.bladeburner;
    let skillAll = [];
    do {
        skillAll = genSkillsList(ns, skip).sort((a, b) => bp.getSkillUpgradeCost(a) - bp.getSkillUpgradeCost(b));
        if (bp.getSkillPoints() >= bp.getSkillUpgradeCost(skillAll[0]) && bp.upgradeSkill(skillAll[0])) {
            ns.clearLog();
            ns.print(" > Upgrading Skills");
            showInfo(ns);
        }
        await ns.sleep(10);
    } while (bp.getSkillPoints() >= bp.getSkillUpgradeCost(skillAll[0]));
}

async function performAction(ns, type, action, count = 1) {
    //	count: do 'action' 'count' times
    const bp = ns.bladeburner;
    ns.clearLog();
    if (type == 'general' || type == 'contract' || type == 'operation' || type == 'black op') {
        ns.bladeburner.startAction(type, action);
    }
    else {
        ns.alert('(!) Action type is Invalid (!)');
        ns.exit();
    }
    showInfo(ns);
    await ns.sleep(bp.getActionTime(type, action) * count / (bp.getActionTime(type, action) > 5e3 ? bonusTime(ns) : 1));
}

/** @param {NS} ns */
async function skipMode(ns) {
    const bp = ns.bladeburner;

    const rank = () => bp.getRank();
    const actionCount = (type = "", name = "") => bp.getActionCountRemaining(type, name);

    let ops = bp.getOperationNames();
    ops.splice(3, 1);

    let i = 0;
    while (rank() < 4e5) {
        if (ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()) == 0) changeCity(ns);
        if (ns.bladeburner.getActionCountRemaining('operation', ops[ops.length - 1 - i]) == 0) i++;
        if (i == ops.length) break;
        await performAction(ns, 'operation', ops[i]);
        await upSkill(ns, true);
    }
    if (rank() < 4e5) {
        ns.alert('(!) Ran out of Operation to do and Rank is below 400k (!)');
        ns.exit();
    }
    let s = bp.getActionEstimatedSuccessChance('black op', 'Operation Typhoon');
    while (s[1] - s[0] != 0) {
        await performAction(ns, 'general', 'Field Analysis');
        s = bp.getActionEstimatedSuccessChance('black op', 'Operation Typhoon');
    }

    let blackOps = bp.getBlackOpNames();
    s = bp.getActionEstimatedSuccessChance('black ops', blackOps[blackOps.length - 1]);
    if (s[0] + s[1] < 2) {
        ns.alert(`(!) ${blackOps[blackOps.length - 1]} is not guaranteed to succeed (!)`);
        i = 0;
        while (s[0] + s[1] < 2) {
            if (ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()) == 0) changeCity(ns);
            if (ns.bladeburner.getActionCountRemaining('operation', ops[ops.length - 1 - i]) == 0) i++;
            if (i == ops.length) break;
            await performAction(ns, 'operation', ops[i]);
            await upSkill(ns, true);
            s = bp.getActionEstimatedSuccessChance('black ops', bp.getBlackOpNames()[bp.getBlackOpNames().length - 1]);
        }
        ns.exit();
    }

    for (let bo of blackOps) {
        if (actionCount('black ops', bo) == 1) await performAction(ns, 'black op', bo);
        await upSkill(ns, true);
    }
    ns.alert(`(!) Operation Daedalus is accomplished (!)\n(!) Destroy this BitNode when you're ready (!)`);
    ns.exit();
}