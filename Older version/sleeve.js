/** @param {NS} ns */
export async function main(ns) {
    ns.clearLog();
    ns.disableLog("ALL");
    ns.tail();
    const slp = ns.sleeve;

    // let playerMoney = () => ns.getServerMoneyAvailable("home")
    let sleeveStat = id => slp.getSleeve(id);
    let numSleeve = () => slp.getNumSleeves();
    // let augReady = id => slp.getSleevePurchasableAugs(id)
    let recover = id => slp.setToShockRecovery(id);
    let sync = id => slp.setToSynchronize(id);
    //let toGym = (id, stat) => slp.setToGymWorkout(id, "powerhouse gym", stat)
    let setCrime = id => slp.setToCommitCrime(id, "homicide");

    while (true) {
        ns.clearLog()
        for (let i = 0; i < numSleeve(); i++) {
            if (sleeveStat(i).sync < 100) {
                if (sync(i)) ns.printf(' #%d: Syncing - %.2f', i, sleeveStat(i).sync);
            }
            else if (sleeveStat(i).shock > 30) {
                if (recover(i)) ns.printf(' #%d: Recovering - %.2f', i, sleeveStat(i).shock);
            }
            /*
            if (sleeveStat(i).shock == 0) {
                let count = 0
                for (let aug of augReady(i)) {	//	aug includes name AND cost
                    let a = ns.singularity.getAugmentationStats(aug.name)	// a: all stats of aug
                    for (let b in a) {	//	b: individual stat of aug
                        if (checkInclude(b) && playerMoney() >= numSleeve() * 5 * aug.cost)
                            if (slp.purchaseSleeveAug(i, aug.name)) count++
                    }
                }
                if (count != 0) ns.printf(' #%d: Bought %d Augs', i, count)
            }
            */
            if (sleeveStat(i).shock < 30) {
                let stats = {
                    strength: sleeveStat(i).strength,
                    defense: sleeveStat(i).defense,
                    dexterity: sleeveStat(i).dexterity,
                    agility: sleeveStat(i).agility
                };
                let arr = [];
                for (let i in stats) {
                    arr.push([i, stats[i]]);
                }
                sort(arr);
				//if (arr[0][1] < 70) {
					/*
				if (crimeChance(ns, i, 'homicide') < 0.35) {
					if (toGym(i, arr[0][0]))
						ns.printf(' #%d: Gym: %s - %d', i, arr[0][0], arr[0][1])
				}
				else */if (setCrime(i))
                    ns.printf(` #${i}: Homicide (${ns.formatPercent(ns.formulas.work.crimeSuccessChance(ns.getPlayer(), 'homicide'), 1)}%)`);
            }
        }
        let today = new Date();
        ns.printf('  ---------------------');
        ns.printf(' Sleeve: %d', numSleeve());
        //ns.printf(' Money gained: %s', ns.nFormat(moneyGain(ns), '$0.0a'))
        ns.printf(' Time: %s:%s', today.getHours(), today.getMinutes());

        await ns.sleep(18e4);
    }
}
function sort(arr) {
    for (let i in arr) {
        for (let j = 0; j < arr.length - i - 1; j++) {
            if (arr[j][1] >= arr[j + 1][1]) {
                let tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }
}
/*
function moneyGain(ns) {
    let c = 0
    for (let i = 0; i < ns.sleeve.getNumSleeves(); i++) {
        c += ns.sleeve.getInformation(i).earningsForPlayer.workMoneyGain
    }
    return c
}
*/
function checkInclude(i) {
    return i.includes('dex') || i.includes('strength') || i.includes('agi') || i.includes('def') || i.includes('crime')
}