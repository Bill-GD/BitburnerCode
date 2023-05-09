/** @param {NS} ns */
//	v1.1: moved func outside
export async function main(ns) {
    const flag = ns.flags([
        ['analyze', false],
    ]);

    ns.disableLog("ALL")
    ns.clearLog()
    ns.tail()
    let bp = ns.bladeburner
    if (!ns.getPlayer().inBladeburner) if (bp.joinBladeburnerDivision()) ns.tprintf(" (!) Joined Bladeburner division")
    let actionCount = (type = "", name = "") => bp.getActionCountRemaining(type, name)
    let successChance = (type = "", name = "") => bp.getActionEstimatedSuccessChance(type, name)
    let population = (name) => bp.getCityEstimatedPopulation(name)

    //	can change
    let chaosThreshold = 50 //	low chaos point = 0.7 threshold

    //	const general info
    let actions = bp.getGeneralActionNames()
    let contracts = bp.getContractNames()
    let ops = bp.getOperationNames()
    let blackOps = bp.getBlackOpNames()
    let contractPos = 0
    let opPos = -1
    let blackOpPos = 0
    let skillAll = []
    let rank = 0
    let bonus = 1
    let s1 = 0, s2 = 0, s3 = 0
    let cities = []
    let city = ""
    while (true) {
        //	dynamic general info
        rank = bp.getRank()
        bonus = 1
        bonus = bonusTime(ns)
        skillAll = [
            bp.getSkillNames()[0],	//	Blade's Intuition
            bp.getSkillNames()[1],	//	Cloak
            bp.getSkillNames()[2],	//	Short-Circuit
            bp.getSkillNames()[3],	//	Digital Observer
            //	bp.getSkillNames()[4],	//	Tracer
            bp.getSkillNames()[6],	//	Reaper
            bp.getSkillNames()[7],	//	Evasive System
            //	bp.getSkillNames()[9],	//	Cyber's Edge
            bp.getSkillNames()[10],	//	Hands of Midas
        ]
        if (bp.getSkillLevel(bp.getSkillNames()[5]) < 90) skillAll.push(bp.getSkillNames()[5])	//	Overclock
        if (bp.getSkillLevel(bp.getSkillNames()[11]) < 20) skillAll.push(bp.getSkillNames()[11])	//	Hyperdrive

        cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"]
        city = bp.getCity()
        for (let i in cities)
            if (cities[i] === city) cities.splice(i, 1)	//	get cities available
        for (let i in cities) {
            for (let j = 0; j < cities.length - i - 1; j++) {
                if (population(cities[j]) >= population(cities[j + 1])) {
                    let tmp = cities[j];
                    cities[j] = cities[j + 1];
                    cities[j + 1] = tmp;
                }
            }
        }
        //	move city to highest pop
        if (population(city) < population(cities[cities.length - 1]))
            bp.switchCity(cities[cities.length - 1])
        //	join faction
        if (rank >= 25 && bp.joinBladeburnerFaction() == false) {
            bp.joinBladeburnerFaction()
            ns.print(" Joined Bladeburner Faction")
            ns.alert(" Joined Bladeburner Faction")
        }
        ns.clearLog()
        await upSkill(ns, skillAll)
        if (bp.getCityChaos(city) > chaosThreshold) await lowerChaos(ns, city, actions, chaosThreshold)
        //	quick black op
        let blackOpLeft = []
        for (let bo of blackOps) {
            if (actionCount("black op", bo) == 1) blackOpLeft.push(bo)
        }
        let skipBO = 0

        let sc = successChance("black op", blackOpLeft[skipBO])
        while (sc[0] + sc[1] >= 1.8 && rank >= bp.getBlackOpRank(blackOpLeft[skipBO])) {
            ns.clearLog()
            heal(ns)
            await stamina(ns)
            bonus = bonusTime(ns)
            bp.startAction("black op", blackOpLeft[skipBO])
            ns.print(" (Skip) Black Ops: ", blackOpLeft[skipBO] + (bonus == 5 ? " (Bonus)" : ""))
            await ns.sleep(bp.getActionTime("black op", blackOpLeft[skipBO]) / bonus)
            skipBO++
            sc = successChance("black op", blackOpLeft[skipBO])
            rank = bp.getRank()
            await upSkill(ns, skillAll)
            await ns.sleep(1e3 / bonus)
        }
        //	field analysis
        if (flag.analyze) {
            if (ns.isRunning("blade.js", "home")) ns.kill("blade.js")
            for (let i = 0; i < 30; i++) {
                ns.clearLog()
                bonus = bonusTime(ns)
                ns.print(" Doing Field Analysis - ", (i + 1), "/30 " + (bonus == 5 ? "(Bonus)" : ""))
                bp.startAction("general", actions[1])
                await ns.sleep(bp.getActionTime("general", actions[1]) / bonus)
                ns.clearLog()
            }
            ns.exit()
        }
        for (let i = 0; i < 3; i++) {
            ns.clearLog()
            bonus = bonusTime(ns)
            ns.print(" Doing Field Analysis - " + (i + 1) + "/3 " + (bonus == 5 ? "(Bonus)" : ""))
            bp.startAction("general", actions[1])
            await ns.sleep(bp.getActionTime("general", actions[1]) / bonus)
            ns.clearLog()
        }
        //	train
        for (let m = 0; m < 10; m++) {
            ns.clearLog()
            bonus = bonusTime(ns)
            bp.startAction("general", actions[0])
            ns.print(" ", actions[0], " - "/**/, (m + 1), "/10 " + (bonus == 5 ? "(Bonus)" : ""))
            await ns.sleep(bp.getActionTime("general", actions[0]) / bonus)
        }
        ns.print(" Finished ", actions[0])

        //	contracts only if can't op
        //	get contract with chance 50-100% / 75% - check work count - increase (+ lower chaos) if needed - if next contract met req. switch
        while (contractPos < contracts.length - 1) {	//	continue to switch to next if good -> continue if restart
            s1 = successChance("contract", contracts[contractPos + 1])
            if (s1[0] + s1[1] >= 1.5 && contractPos < contracts.length - 1) contractPos++
            if (s1[0] + s1[1] < 1.5) break	//	stop if next bad
            await ns.sleep(10)
        }
        while (contractPos > 0) {	//	continue to switch back if bad, if lowest continue anyway -> continue if restart
            s2 = successChance("contract", contracts[contractPos])
            if (s2[0] + s2[1] < 1.5 && contractPos > 0) contractPos--
            if (s2[0] + s2[1] >= 1.5) break	//	stop if current good
            await ns.sleep(10)
        }
        s3 = successChance("contract", contracts[2])
        if (s3[0] + s3[1] >= 1.5) contractPos = 2

        if (actionCount("contract", contracts[contractPos]) == 0) {
            await increaseChaos(ns, actions)
            if (bp.getCityChaos(city) > chaosThreshold) await lowerChaos(ns, city, actions, chaosThreshold)
        }
        for (let i = 0; i < 10; i++) {
            bonus = bonusTime(ns)
            heal(ns)
            await stamina(ns)
            ns.clearLog()
            bp.startAction("contract", contracts[contractPos])
            ns.print(" Contract: ", contracts[contractPos], " - ", (i + 1), "/10 " + (bonus == 5 ? "(Bonus)" : ""))
            await ns.sleep(bp.getActionTime("contract", contracts[contractPos]) / (bp.getActionTime("contract", contracts[contractPos]) > 5e3 ? bonus : 1))
        }
        ns.clearLog()
        s1 = 0
        s2 = 0

        //	ops only if can op
        if (successChance("operation", ops[0])[0] + successChance("operation", ops[0])[1] >= 1.7 && opPos < 0) opPos = 0	//	if can op -> enable op
        else opPos = -1
        if (opPos > -1) {
            while (true) {
                await ns.sleep(10)
                s1 = successChance("operation", ops[opPos + 1])
                if (s1[0] + s1[1] >= 1.7 && opPos < ops.length - 1) opPos++	//	switch to next if good
                if (s1[0] + s1[1] < 1.7) break	//	stop if next bad
                if (opPos == ops.length - 1) break	//	stop if highest
            }
            while (true) {
                await ns.sleep(10)
                s2 = successChance("operation", ops[opPos])
                if (s2[0] + s2[1] < 1.7 && opPos > 0) opPos--	//	switch back if bad, if lowest continue anyway
                if (s2[0] + s2[1] >= 1.7) break	//	stop if current good
                if (opPos == 0) break	//	stop if lowest
            }

            if (actionCount("operation", ops[opPos]) == 0) {
                await increaseChaos(ns, actions)
                if (bp.getCityChaos(city) > chaosThreshold) await lowerChaos(ns, city, actions)
            }
            //if (bp.setTeamSize("operation", ops[opPos], teamSizeOpsMax) == teamSizeOpsMax) {
            for (let i = 0; i < 30; i++) {
                heal(ns)
                await stamina(ns)
                ns.clearLog()
                bonus = bonusTime(ns)
                bp.startAction("operation", ops[opPos])
                ns.print(" Operation: ", ops[opPos], " - ", (i + 1), "/30 " + (bonus == 5 ? "(Bonus)" : ""))
                await ns.sleep(bp.getActionTime("operation", ops[opPos]) / (bp.getActionTime("operation", ops[opPos]) > 5e3 ? bonus : 1))
            }
            //}
            ns.clearLog()
        }

        //	black ops only if rank is enough
        if (actionCount("black op", blackOps[blackOps.length - 1]) == 0) {	//	switch off if done all
            ns.alert(" (!) You have done all Black Ops for Bladeburner (!)")
            blackOpPos = -1
        }
        if (blackOpPos > -1) {
            while (true) {	//	move to next
                await ns.sleep(10)
                if (actionCount("black op", blackOps[blackOpPos]) == 0 && blackOpPos < blackOps.length - 1) blackOpPos++	//	move up if possible
                if (actionCount("black op", blackOps[blackOpPos]) == 1) break	//	stop if next is unfinished
                if (blackOpPos == blackOps.length - 1) break	//	stop moving when last
            }
            s1 = successChance("black op", blackOps[blackOpPos])
            if (s1[0] + s1[1] > 1 && rank >= bp.getBlackOpRank(blackOps[blackOpPos])) {
                if (actionCount("black op", blackOps[blackOpPos]) == 1) {
                    heal(ns)
                    await stamina(ns)
                    bonus = bonusTime(ns)
                    bp.startAction("black op", blackOps[blackOpPos])
                    ns.print(" Black Ops: ", blackOps[blackOpPos] + (bonus == 5 ? " (Bonus)" : ""))
                    await ns.sleep(bp.getActionTime("black op", blackOps[blackOpPos]) / (bp.getActionTime("black op", blackOps[blackOpPos]) > 5e3 ? bonus : 1))
                }
            }
        }
        ns.clearLog()
        /*
        */
        s1 = 0
        s2 = 0
        s3 = 0

        await ns.sleep(100)
    }
}

//	stamina
async function stamina(ns) {
    let [current, max] = ns.bladeburner.getStamina()
    if (current <= 0.5 * max) {
        ns.printf(' Low Stamina - Resting...')
        while (current != max) await ns.sleep(1000)
    }
    if (current == max) return
}
//	+ chaos, + work
async function increaseChaos(ns, actions) {
    for (let i = 0; i < 10; i++) {
        ns.clearLog()
        let bonus = bonusTime(ns)
        ns.print(" Getting more work - ", (i + 1), "/10 " + (bonus == 5 ? "(Bonus)" : ""))
        bp.startAction("general", actions[5])
        await ns.sleep(bp.getActionTime("general", actions[5]) / bonus)
    }
}
//	lower chaos
async function lowerChaos(ns, city, actions, chaosThreshold) {
    let bp = ns.bladeburner
    ns.clearLog()
    let k = 1
    while (bp.getCityChaos(city) >= 0.7 * chaosThreshold) {
        ns.clearLog()
        let bonus = bonusTime(ns)
        bp.startAction("general", actions[3])
        ns.print(" Lowering Chaos Level - ", k + (bonus == 5 ? " (Bonus)" : ""))
        await ns.sleep(bp.getActionTime("general", actions[3]) / bonus)
        k++
    }

}
//	heal
function heal(ns) {
    if (ns.getPlayer().hp < Math.round(0.2 * ns.getPlayer().max_hp)) ns.singularity.hospitalize()
}
//	determine bonus
function bonusTime(ns) {
    if (ns.bladeburner.getBonusTime() > 3000) return 5
    else return 1
}
//	skills	
//	sort skill req
function sortSkill(ns, skillAll) {
    for (let i in skillAll) {
        for (let j = 0; j < skillAll.length - i - 1; j++) {
            if (ns.bladeburner.getSkillUpgradeCost(skillAll[j]) >= ns.bladeburner.getSkillUpgradeCost(skillAll[j + 1])) {
                let tmp = skillAll[j]
                skillAll[j] = skillAll[j + 1]
                skillAll[j + 1] = tmp
            }
        }
    }
}
async function upSkill(ns, skillAll) {
    let bp = ns.bladeburner
    let skillPoint = bp.getSkillPoints()
    sortSkill(ns, skillAll)
    while (skillPoint >= bp.getSkillUpgradeCost(skillAll[0])) {
        ns.clearLog()
        if (bp.upgradeSkill(skillAll[0]) == true) {
            ns.print("Upgrading Skills")
            ns.print(" Upgraded: ", skillAll[0])
        }
        sortSkill(ns, skillAll)
        skillPoint = bp.getSkillPoints()
        await ns.sleep(100)
    }
}