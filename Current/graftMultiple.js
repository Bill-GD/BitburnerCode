/** Version 2.3.1
 * Added check (for currently grafting aug) and delay in the main grafting loop
 * If queue has augs, asks if user wants to create a new queue instead
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();

    const fileName = 'augs_to_graft.txt';

    const graft = ns.grafting;
    const augGraftCost = aug => graft.getAugmentationGraftPrice(aug);
    const graftTime = aug => graft.getAugmentationGraftTime(aug);
    const getPrereq = aug => ns.singularity.getAugmentationPrereq(aug);
    const getOwned = () => ns.singularity.getOwnedAugmentations();

    const graftableAugs = graft.getGraftableAugmentations();
    graftableAugs.sort((a, b) => augGraftCost(a) - augGraftCost(b));


    let chosenAugNames = ns.read(fileName).split('\n');

    let reset = false;
    if (chosenAugNames[0] !== '')
        reset = await ns.prompt(`Current queue has ${chosenAugNames.length} augs. Do you want create a new queue instead?`);
    
    if (chosenAugNames[0] === '' || reset) {
        const stringID = await ns.prompt(
            'Write list of IDs to graft (separated by spaces)\n' +
            'IDs from the list of augmentations',
            { 'type': 'text' }
        );
        if (stringID.length === 0) ns.exit();
        const chosenAugIDs = stringID.split(' ')
            .map(id => parseInt(id))
            .sort((a, b) => a - b);
        chosenAugNames = chosenAugIDs.map((id) => graftableAugs[id]);
        chosenAugNames = chosenAugNames.filter(aug => checkPrereq(aug));
    }

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

            ns.write(fileName, chosenAugNames.join('\n'), 'w');

            chosenAugNames.forEach(aug => totalCost += augGraftCost(aug));
            menuText += ` Augs to graft (Total: ${chosenAugNames.length}, Cost: $${ns.formatNumber(totalCost, 1)}):\n`;

            // prints out all augs & calculates time
            Object.entries(chosenAugNames).forEach(([i, aug]) => {
                const cost = augGraftCost(aug);
                totalCost += cost;
                totalTime += graftTime(aug);
                menuText += `  > ${graftableAugs.findIndex(a => a === aug)}. ${aug} - $${ns.formatNumber(cost, 1)}\n`;
                lineCount++;
            });
            lineCount++;

            const currentWork = ns.singularity.getCurrentWork();
            if (currentWork !== null && currentWork.type === 'GRAFTING')
                totalTime += (graftTime(currentWork.augmentation) - (currentWork.cyclesWorked * 200));

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
            ns.resizeTail(600, 25 * (lineCount + 4) + 25);

            if (!await ns.prompt('Start Grafting?\n' + timeNotification)) break;

            // waits for current aug to finish
            while (ns.singularity.getCurrentWork() !== null && ns.singularity.getCurrentWork().type === 'GRAFTING') {
                ns.clearLog();
                ns.printf(menuText);
                ns.printf(`\n Waiting for ${currentWork.augmentation} to finish`);
                ns.printf(` Time remaining: ${ns.tFormat(graftTime(ns.singularity.getCurrentWork().augmentation) - (ns.singularity.getCurrentWork().cyclesWorked * 200))}`);
                ns.printf(`\n${timeNotification}`);
                await ns.sleep(1e3);
            }
            await ns.sleep(3e3);


            // starts grafting
            let augProgress = chosenAugNames.slice();
            for (const aug of chosenAugNames) {
                while (ns.singularity.getCurrentWork() !== null && ns.singularity.getCurrentWork().type === 'GRAFTING')
                    await ns.sleep(1e3);
                ns.run('graft.js', 1, '--script', '--chosenAugName', aug, '--multiple');

                augProgress.shift();
                ns.write(fileName, augProgress.join('\n'), 'w');

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

        let checked = false;
        let result = true;
        const augIndex = chosenAugNames.findIndex(aug => aug === augName);
        prereqs.forEach((prereq) => {
            if (checked) return;
            // if not owned
            if (!getOwned().includes(prereq)) {
                // if chosen, removes if prereq is after current aug
                if (chosenAugNames.includes(prereq))
                    result = chosenAugNames.findIndex(aug => aug === prereq) < augIndex;
                // false if not chosen
                else result = false;
                checked = true;
            }
        });
        return result;
    }
}