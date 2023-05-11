import { format } from "universalFunc.js"
/** @param {NS} ns */
//	v2 (no territory warfare)
export async function main(ns) {
    ns.disableLog("ALL")
    ns.tail()
    ns.clearLog()

    let gp = ns.gang
    let money = (server) => ns.getServerMoneyAvailable(server)
    let karmaReq = ns.getPlayer().bitNodeN == 2 ? -9 : -54000
    if (!gp.inGang() && ns.heart.break() <= karmaReq) if (gp.createGang("Slum Snakes")) ns.tprintf(" (!) Created Gang with Slum Snakes")

    //	can change
    let skillCap = 100
    let skillCap_backup = skillCap
    let wantedCap = 0.99	//	0 < wantedCap <= 1
    let ascendCap = 2

    let memInfo = (name) => gp.getMemberInformation(name)
    let gangInfo = () => gp.getGangInformation()
    let ascendResult = (name) => gp.getAscensionResult(name)
    let equipCost = (equip) => gp.getEquipmentCost(equip)
    let tasks = gp.getTaskNames()
    tasks.shift()
    let trainingTasks = tasks.splice(-5, 5)
    trainingTasks.shift()
    trainingTasks.splice(-1, 1)
    tasks.splice(-1, 1)
    let task = tasks[Math.floor(Math.random() * tasks.length)]
    let cycle = 1
    //	list of equipment
    let upgrades = gp.getEquipmentNames()
    let augs = upgrades.splice(-11, 11)

    function checkEquip(member, equipment) {
        let memEquips = ns.gang.getMemberInformation(member).upgrades
        for (let equip of memEquips) {
            if (equip == equipment) return true
        }
        return false
    }
    function checkAug(member, augment) {
        let memAugs = ns.gang.getMemberInformation(member).augmentations
        for (let aug of memAugs) {
            if (aug == augment) return true
        }
        return false
    }
    function isTraining(member) {
        for (let train of trainingTasks)
            if (memInfo(member).task == train) return true
        return false
    }

    while (true) {
        ns.clearLog()
        ns.print("Cycle: ", cycle)
        let members = gp.getMemberNames()
        if (members.length < 9) {
            if (cycle == 10) {
                task = tasks[Math.floor(Math.random() * tasks.length)]
                cycle = 0
            }
        }
        else task = "Human Trafficking"
        /*
        */
        //	recruit
        let i = 0
        if (gp.canRecruitMember()) i = members.length + 1
        while (gp.canRecruitMember()) {
            if (gp.recruitMember('#' + i)) {
                ns.print("Recruited ", '#' + i)
                i++
            }
            else if (gp.recruitMember("#" + i + '+')) {
                ns.print("Recruited ", '#' + i + '+')
                i++
            }
            await ns.sleep(10)
        }
        members = gp.getMemberNames()
        //	ascend
        for (let mem of members) {
            if (ascendResult(mem) != null
                && ascendResult(mem).hack >= ascendCap
                //&& ascendResult(mem).agi >= 1.2 
                && ascendResult(mem).str >= ascendCap
                && ascendResult(mem).def >= ascendCap && ascendResult(mem).dex >= ascendCap) {
                gp.ascendMember(mem)
                ns.print("Ascended ", mem)
            }
        }
        //	train
        for (let mem of members) {
            if (memInfo(mem).agi <= skillCap || memInfo(mem).def <= skillCap
                || memInfo(mem).dex <= skillCap || memInfo(mem).str <= skillCap)
                gp.setMemberTask(mem, trainingTasks[0])
            else if (memInfo(mem).hack <= skillCap)
                gp.setMemberTask(mem, trainingTasks[1])
            else if (memInfo(mem).cha <= Math.floor(skillCap * 0.1))
                gp.setMemberTask(mem, trainingTasks[2])
            else gp.setMemberTask(mem, gp.getTaskNames()[0])
        }
        //	equipment
        let countE = 0
        let countA = 0
        for (let member of members) {
            for (let up of upgrades) {
                if (money("home") > 9 * equipCost(up) && !checkEquip(member, up)) {
                    if (gp.purchaseEquipment(member, up))
                        countE++
                }
            }
            for (let aug of augs) {
                if (money("home") > 9 * equipCost(aug) && !checkAug(member, aug)) {
                    if (gp.purchaseEquipment(member, aug))
                        countA++
                }
            }
        }
        if (countA != 0) ns.printf("Purchased Augs %d time(s)", countA)
        if (countE != 0) ns.printf("Purchased Equipment %d time(s)", countE)
        //	wanted level
        if (gangInfo().wantedPenalty < wantedCap) {
            for (let i = Math.ceil(members.length * 0.4); i < members.length; i++) {
                if (!isTraining(members[i])) gp.setMemberTask(members[i], "Vigilante Justice")
            }
        }
        //	work
        for (let mem of members) {
            if (!isTraining(mem) && memInfo(mem).task != "Vigilante Justice") gp.setMemberTask(mem, task)
        }

        for (let mem of members) {
            ns.print(mem + ': ' + memInfo(mem).task)
        }
        await ns.sleep(1500 / ((gp.getBonusTime() > 2) ? 24 : 1))
        ns.print("\nMember: ", members.length, "/12")
        ns.print("Money Gain: ", format(ns, gangInfo().moneyGainRate), "/s")
        ns.print("Respect: ", format(ns, gangInfo().respect))
        let pen = (1 - gangInfo().wantedPenalty) * 100
        ns.print("Wanted: ", format(ns, gangInfo().wantedLevel), " (", (pen < 0.0001 ? 0 : pen).toPrecision(3), "%) ")

        if (gp.getBonusTime() > 3e3) ns.print("Bonus: ", ns.tFormat(ns.gang.getBonusTime()))
        cycle++
        await ns.sleep(28500 / ((gp.getBonusTime() > 3e3) ? 24 : 1))
    }
}