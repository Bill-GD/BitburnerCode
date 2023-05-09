/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL")
    const flag = ns.flags([
        ['list', false],
        ['sort', false],
        ['type', ''],
        ['graft', false],
        ['id', -1],
        ['info', false],
        ['time', false],
        ['noFocus', false]
    ]);
    const graft = ns.grafting;
    const player = ns.getPlayer();
    const checkMoney = cost => player.money >= cost;
    const augCost = aug => graft.getAugmentationGraftPrice(aug);
    const graftList = graft.getGraftableAugmentations();

    graftList.sort((a, b) => augCost(a) - augCost(b));

    if (flag.list) {
        if (flag.sort) {
            flag.type = await ns.prompt('Choose sorting option:', { 'type': 'select', 'choices': ['combat', 'hack', 'misc', 'special'] });
        }
        else flag.type = null;

        ns.tail();
        ns.clearLog();
        ns.disableLog('ALL');
        for (let id in graftList) {
            let cost = augCost(graftList[id])
            let stats = ns.singularity.getAugmentationStats(graftList[id])
            switch (flag.type) {
                case 'combat':
                    if (checkInclude(stats, flag.type)) {
                        ns.printf(' %d. %s - %s - %s', id, graftList[id], ns.formatNumber(cost, 1), checkMoney(cost).toString().toUpperCase())
                        break
                    }
                    break
                case 'hack':
                    if (checkInclude(stats, flag.type)) {
                        ns.printf(' %d. %s - %s - %s', id, graftList[id], ns.formatNumber(cost, 1), checkMoney(cost).toString().toUpperCase())
                        break
                    }
                    break
                case 'misc':
                    if (checkInclude(stats, 'combat') || checkInclude(stats, 'hack')) break
                    else {
                        ns.printf(' %d. %s - %s - %s', id, graftList[id], ns.formatNumber(cost, 1), checkMoney(cost).toString().toUpperCase())
                        break
                    }
                case 'special':
                    if (graftList[id] == 'Neuroreceptor Management Implant' || graftList[id] == 'nickofolas Congruity Implant')
                        ns.printf(' %d. %s - %s - %s', id, graftList[id], ns.formatNumber(cost, 1), checkMoney(cost).toString().toUpperCase())
                    break
                default:
                    ns.tprintf(' %d. %s - %s - %s', id, graftList[id], ns.formatNumber(cost, 1), checkMoney(cost).toString().toUpperCase())
                    break
            }
        }

        ns.printf('\n')
        ns.exit()
    }
    if (flag.info) {
        let id = flag.id
        if (id < 0 || id > graftList.length - 1) {
            ns.tprintf(`  (!) Use flag: --id [Aug's ID from list] to select a specific aug`)
            ns.exit()
        }
        ns.tail();
        ns.clearLog();
        ns.disableLog('ALL');
        let stats = ns.singularity.getAugmentationStats(graftList[id])
        ns.printf(' ID: %d', id)
        ns.printf(' Name: %s', graftList[id])
        ns.printf(' Cost: %s\n\n', ns.formatNumber(augCost(graftList[id]), 1))
        let prereq = ns.singularity.getAugmentationPrereq(graftList[id])
        if (prereq.length != 0) {
            ns.printf(' Prerequisite:')
            for (let i of prereq) ns.printf('   > %s - %s', i, checkAug(ns, i).toString().toUpperCase())
            ns.printf('\n')
        }
        if (checkKey(stats) == false) ns.printf(`INFO: '%s' doesn't have any specific stat`, graftList[id])
        else {
            ns.printf(' Stat:')
            Object.entries(stats).forEach(([type, mult], id) => {
                mult !== 1 ? ns.printf(`   > ${type}: ${mult}`) : 0;
            });
        }
        ns.printf('\n Time: %s', ns.tFormat(graft.getAugmentationGraftTime(graftList[id])))
        ns.exit()
    }
    if (flag.graft) {
        let id = flag.id
        let focus = !flag.noFocus
        if (id < 0 || id > graftList.length - 1) {
            ns.tprintf(`  (!) Use flag: --id [Aug's ID from list] to graft a specific aug`)
            ns.exit()
        }
        if (checkMoney(augCost(graftList[id]) + 2e5) == false) {
            ns.alert(` (!) You don't have enough money to graft: ${graftList[id]}`);
            ns.tprintf('INFO: Missing: %s', ns.formatNumber(augCost(graftList[id]) - player.money, 1))
            ns.exit()
        }
        if (player.city != "New Tokyo")
            if (player.money - augCost(graftList[id]) > 2e5) ns.singularity.travelToCity("New Tokyo")
            else {
                ns.tprintf(`ERROR: You don't have enough money to travel to New Tokyo`)
                ns.exit()
            }
        if (graft.graftAugmentation(graftList[id], focus) == true) {
            if (flag.time) {
                ns.tail()
                ns.printf(' Time to graft\n %s (ID: %d):', graftList[id], id)
                ns.printf('   > %s', ns.tFormat(graft.getAugmentationGraftTime(graftList[id])))
                ns.printf(' Cost: %s', ns.formatNumber(augCost(graftList[id]), 1))
            }
        }
        else {
            ns.tprintf(`ERROR: Hasn't grafted prerequisites of %s`, graftList[id])
        }
        ns.exit()
    }
}
function checkKey(obj) {
    for (let k in obj) {
        if (obj.hasOwnProperty(k)) return true
    }
    return false
}
function checkInclude(i, type) {
    if (type == 'combat') {
        for (let b in i) {
            if (b.slice(0, 3) == 'dex' || b.slice(0, 3) == 'str' || b.slice(0, 3) == 'agi' || b.slice(0, 3) == 'def')
                if (i[b] > 1) return true
        }
        return false
        //return i.includes('dex') || i.includes('str') || i.includes('agi') || i.includes('def')
    }
    if (type == 'hack') {
        for (let b in i)
            if (b.includes('hacking') && i[b] > 1) return true
        return false
        //return i.includes('hacking')
    }
}

function checkAug(ns, aug) {
    if (aug == null) return true
    for (let a of ns.singularity.getOwnedAugmentations(true)) {
        if (a == aug) return true
    }
    return false
}