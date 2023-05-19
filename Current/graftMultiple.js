/** Version 2.2
 * Revert prereqs sorting
 * Now removes prereq if:
 * - prereq is not owned and not chosen
 * - prereq is not owned, chosen but is placed after current aug
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();

    const graft = ns.grafting;
    const augGraftCost = aug => graft.getAugmentationGraftPrice(aug);
    const graftTime = aug => graft.getAugmentationGraftTime(aug);
    const getPrereq = aug => ns.singularity.getAugmentationPrereq(aug);
    const getOwned = () => ns.singularity.getOwnedAugmentations();

    const graftableAugs = graft.getGraftableAugmentations();
    graftableAugs.sort((a, b) => augGraftCost(a) - augGraftCost(b));

    const stringID = await ns.prompt(
        'Write list of IDs to graft (separated by spaces)\n' +
        'IDs from the list of augmentations',
        { 'type': 'text' }
    );
    if (stringID.length === 0) ns.exit();
    const chosenAugIDs = stringID.split(' ')
        .map(id => parseInt(id))
        .sort((a, b) => a - b);
    let chosenAugNames = chosenAugIDs.map((id) => graftableAugs[id]);
    chosenAugNames = chosenAugNames.filter(aug => checkPrereq(aug));

    switch (chosenAugNames.length) {
        case 0:
            ns.alert('NO Augmentations were chosen');
            break;
        case 1:
            ns.run('graft.js', 1, '--script', '--chosenAugName', chosenAugNames[0]);
            break;
        default:
            ns.tail();
            let lineCount = 1;
            let totalCost = 0;
            let totalTime = 0;
            let menuText = '';

            chosenAugNames.forEach(aug => totalCost += augGraftCost(aug));
            menuText += ` Augs to graft (total=${chosenAugNames.length}, cost=$${ns.formatNumber(totalCost, 1)}):\n`;

            // prints out all augs & calculates time
            Object.entries(chosenAugNames).forEach(([i, aug]) => {
                const cost = augGraftCost(aug);
                totalCost += cost;
                totalTime += graftTime(aug);
                menuText += `  > ${graftableAugs.findIndex(a => a === aug)}. ${aug} - $${ns.formatNumber(cost, 1)}\n`;
                lineCount++;
            });
            lineCount++;

            // process time info
            const timeStart = new Date();
            const timeEnd = new Date(timeStart.getTime() + totalTime);
            let timeNotification =
                ' Est. Total time:\n' +
                `  > Total: ${ns.tFormat(totalTime)}\n` +
                `  > Start: ${timeStart.getDate()}/${timeStart.getMonth() + 1} ${timeStart.getHours() < 10 ? '0' : ''}${timeStart.getHours()}:${timeStart.getMinutes() < 10 ? '0' : ''}${timeStart.getMinutes()}\n` +
                `  > End: ${timeEnd.getDate()}/${timeEnd.getMonth() + 1} ${timeEnd.getHours() < 10 ? '0' : ''}${timeEnd.getHours()}:${timeEnd.getMinutes() < 10 ? '0' : ''}${timeEnd.getMinutes()}`;

            lineCount += 4;

            ns.printf(menuText);

            if (!await ns.prompt('Start Grafting?\n' + timeNotification)) break;

            ns.resizeTail(600, 25 * (lineCount + 4) + 25);

            // starts grafting
            for (const aug of chosenAugNames) {
                ns.run('graft.js', 1, '--script', '--chosenAugName', aug, '--multiple');
                ns.clearLog();
                let timeToGraft = graftTime(aug);
                ns.printf(`${menuText}`);
                ns.printf(`\n Grafting-${chosenAugNames.findIndex(a => a === aug) + 1}:\n > ${aug}\n > ${ns.tFormat(timeToGraft)}`);
                ns.printf(`\n${timeNotification}`);
                await ns.sleep(timeToGraft);
                await ns.sleep(200);
            }

            ns.printf('INFO: FINISHED GRAFTING');
            break;
    }

    /** @return ```true``` if all prerequisites are grafted or chosen to be grafted in the right order, ```false``` otherwise. */
    function checkPrereq(augName) {
        const prereqs = getPrereq(augName);
        if (prereqs.length === 0) return true;

        const augIndex = chosenAugNames.findIndex(aug => aug === augName);
        prereqs.forEach((prereq) => {
            // if not owned
            if (!getOwned().includes(prereq)) {
                // if chosen
                // removes if prereq is after current aug
                if (chosenAugNames.includes(prereq))
                    return chosenAugNames.findIndex(aug => aug === prereq) < augIndex;
                // false if not chosen
                return false;
            }
        });
        return true;
    }
}