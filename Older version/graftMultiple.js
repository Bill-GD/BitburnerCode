/** @param {NS} ns */
export async function main(ns) {
    const augCost = aug => ns.grafting.getAugmentationGraftPrice(aug);
    const graftList = ns.grafting.getGraftableAugmentations();
    const graftTime = aug => ns.grafting.getAugmentationGraftTime(aug);

    graftList.sort((a, b) => augCost(a) - augCost(b));

    let id = ns.args;
    switch (id.length) {
        case 0:
            ns.tprintf('ERROR: Enter Augmentation IDs');
            ns.exit();
        case 1:
            ns.run("graft.js", 1, '--graft', '--id', id[0], '--time', (checkAug(ns, "Neuroreceptor Management Implant") ? '--noFocus' : ''));
            break;
        default:
            id.sort((a, b) => a - b);
            let cost = [];
            id.forEach(i => cost.push(augCost(graftList[i])));
            ns.disableLog("ALL");
            ns.clearLog();
            ns.tail();
            ns.printf(' Augs to graft (%d):', id.length);
            let i = 0;
            id.forEach(n => ns.printf(`   > ${i++}. ${graftList[n]} (${ns.formatNumber(augCost(graftList[n]), 1)})`));
            let time = 1
            let costAll = 1
            for (let i of id) time += graftTime(graftList[i])
            for (let i of id) costAll += augCost(graftList[i])
            ns.printf(' Total Cost:\n   > %s', ns.formatNumber(costAll, 1))
            let today = new Date()
            let timeStart = today.getDate() + '/' + (today.getMonth() + 1) + ' ' + today.getHours() + ':' + today.getMinutes()
            let end = new Date(today.getTime() + time)
            let timeEnd = end.getDate() + '/' + (end.getMonth() + 1) + ' ' + end.getHours() + ':' + end.getMinutes()
            ns.printf(' Est. Total Time:\n   > %s\n   > Start: %s\n   > End: %s', ns.tFormat(time), timeStart, timeEnd)

            let show = await ns.prompt('Show Time requirements?') ? '--time' : ''
            let focus = checkAug(ns, "Neuroreceptor Management Implant") ? '--noFocus' : ''

            //let showProgress = await ns.prompt('Show Grafting progress?\n(May make grafting list disappear)')

            let lenBegin = ns.grafting.getGraftableAugmentations().length
            let length = ns.grafting.getGraftableAugmentations().length
            /*
            if (showProgress)
                ns.printf('\n Progress:')
            */
            for (let i = 0; i < id.length; i++) {
                let index = id[i] - (lenBegin - length)
                ns.run("graft.js", 1, '--graft', '--id', index/**/, show, focus)	//	other graftList: update every loop
                //ns.tprint(ns.tFormat(graftTime(graftList[id[i]])))
                /*
                if (showProgress) {
                    ns.printf('  > %s (%s)', graftList[id[i]], ns.formatNumber(augCost(graftList[id[i]]), 1))
                    ns.printf('  > %s', ns.tFormat(graftTime(graftList[id[i]])))
                }
                */
                await ns.sleep(graftTime(graftList[id[i]]))	//	this file's graftList: constant
                while (ns.singularity.isBusy()) await ns.sleep(1000)	//	prevent executing next loop when not finished (unfocused...)
                length = ns.grafting.getGraftableAugmentations().length
                /*
                if (showProgress) {
                    let d = new Date()
                    ns.printf('WARN: FINISHED!')
                    ns.printf(`INFO: %s`, d.getDate() + '/' + (d.getMonth() + 1) + ' ' + ns.formatNumber(d.getHours()) + ':' + ns.formatNumber(d.getMinutes()))
                }
                */
            }
            ns.printf('')
            ns.printf('INFO: FINISHED GRAFTING')
            break
    }
}
function checkAug(ns, aug) {
    if (aug == null) return true
    for (let a of ns.singularity.getOwnedAugmentations()) {
        if (a == aug) return true
    }
    return false
}