/** Version 2.4
 * Now has dynamic log width
 * Added options for adding and removing augs in the queue with invalid ID filtering
 * Improved ID check for new queue
 * Order of grafting is now reversed (graft most useful first)
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

    if (chosenAugNames.length > 1) {
        ns.tail();
        ns.print(' Current queue:');
        printAugs();
    }

    let option;
    if (chosenAugNames[0] !== '') {
        option = await ns.prompt(
            `There's a queue with ${chosenAugNames.length} aug(s).\n\nIgnore to use the current queue\nor\nChoose one of the options below.`,
            { 'type': 'select', 'choices': ['Reset', 'Add', 'Remove'] }
        );

        let chosenAugIDs = chosenAugNames.map(aug => graftableAugs.findIndex(a => a === aug));
        if (option === 'Add') {
            const stringID = (await ns.prompt(
                'Current list of IDs -> check tail\n\n' +
                'IDs to add (separated by spaces):',
                { 'type': 'text' }
            ))
                .split(' ')
                .filter(id => !isNaN(parseInt(id)) && id < graftableAugs.length)
                .map(id => parseInt(id));
            chosenAugIDs = [...new Set(
                [...chosenAugIDs, ...stringID]
                    .map(id => parseInt(id))
                    .sort((a, b) => b - a)
            )];
        }

        if (option === 'Remove') {
            [... new Set(
                (await ns.prompt(
                    'Current list of IDs -> check tail\n\n' +
                    'IDs to remove:',
                    { 'type': 'text' }
                ))
                    .split(' ')
                    .filter(id => id !== '')
            )]
                .forEach(id => {
                    if (chosenAugIDs.includes(parseInt(id)))
                        chosenAugIDs.splice(chosenAugIDs.indexOf(parseInt(id)), 1);
                });
            if ([0, 1].includes(chosenAugIDs.length))
                ns.write(fileName, '', 'w');
            chosenAugIDs = chosenAugIDs
                .map(id => parseInt(id))
                .sort((a, b) => b - a);
        }

        chosenAugNames = chosenAugIDs.map((id) => graftableAugs[id]);
        chosenAugNames = chosenAugNames.filter(aug => checkPrereq(aug));
    }

    if (chosenAugNames[0] === '' || option === 'Reset') {
        const stringID = (await ns.prompt(
            'Write list of IDs to graft (separated by spaces)\n' +
            'IDs from the list of augmentations',
            { 'type': 'text' }
        ))
            .split(' ')
            .filter(id => !isNaN(parseInt(id)));

        if (stringID.length === 0) ns.exit();
        const chosenAugIDs = [...new Set(
            stringID
                .map(id => parseInt(id))
                .filter(id => id < graftableAugs.length)
                .sort((a, b) => b - a)
        )];
        chosenAugNames = chosenAugIDs.map((id) => graftableAugs[id]);
        chosenAugNames = chosenAugNames.filter(aug => checkPrereq(aug));
    }

    switch (chosenAugNames.length) {
        case 0:
            ns.alert('NO Augmentations were chosen');
            break;
        case 1:
            if (!(await ns.prompt(`Grafting confirmation for: ${chosenAugNames[0]}`)))
                break;
            ns.run('graft.js', 1, '--script', '--chosenAugName', chosenAugNames[0]);
            break;
        default:
            ns.tail();
            ns.clearLog();
            let lineCount = 1;
            let totalCost = 0;
            let totalTime = 0;
            let menuText = '';

            ns.write(fileName, chosenAugNames.join('\n'), 'w');

            chosenAugNames.forEach(aug => totalCost += augGraftCost(aug));
            const topTitle = ` Augs to graft (Total: ${chosenAugNames.length}, Cost: $${ns.formatNumber(totalCost, 1)}):`;
            let maxWidth = topTitle.length;
            menuText += topTitle + '\n';

            // prints out all augs & calculates time
            Object.entries(chosenAugNames).forEach(([i, aug]) => {
                const cost = augGraftCost(aug);
                totalCost += cost;
                totalTime += graftTime(aug);
                const augLine = `  > ${graftableAugs.indexOf(aug)}. ${aug} - $${ns.formatNumber(cost, 1)}`;
                maxWidth = Math.max(maxWidth, augLine.length);
                menuText += augLine + '\n';
                lineCount++;
            });
            lineCount++;

            const currentWork = ns.singularity.getCurrentWork();
            if (currentWork !== null && currentWork.type === 'GRAFTING')
                totalTime += (graftTime(currentWork.augmentation) - (currentWork.cyclesWorked * 200));

            maxWidth = Math.max(maxWidth, `  > Total: ${ns.tFormat(totalTime)}`.length);
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
            ns.resizeTail(Math.max(250, maxWidth * 10), 25 * (lineCount + 4) + 25);

            if (!await ns.prompt('Start Grafting?\n' + timeNotification)) break;

            // waits for current aug to finish
            while (ns.singularity.getCurrentWork() !== null && ns.singularity.getCurrentWork().type === 'GRAFTING') {
                ns.clearLog();
                ns.printf(menuText);
                ns.printf(`\n Waiting: ${currentWork.augmentation}`);
                ns.printf(` Time remaining:\n  > ${ns.tFormat(graftTime(ns.singularity.getCurrentWork().augmentation) - (ns.singularity.getCurrentWork().cyclesWorked * 200))}`);
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
                ns.printf(topTitle);
                printAugs();
                ns.printf(`\n Grafting-${chosenAugNames.findIndex(a => a === aug) + 1}:\n  > ${aug}\n  > ${ns.tFormat(timeToGraft)}`);
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
        const augIndex = chosenAugNames.indexOf(augName);
        prereqs.forEach((prereq) => {
            if (checked) return;
            // if not owned
            if (!getOwned().includes(prereq)) {
                // if chosen, removes if prereq is after current aug
                if (chosenAugNames.includes(prereq))
                    result = chosenAugNames.indexOf(prereq) < augIndex;
                // false if not chosen
                else result = false;
                checked = true;
            }
        });
        return result;
    }

    function printAugs() {
        chosenAugNames.forEach(aug => ns.print(`  > ${graftableAugs.indexOf(aug)}. ${aug} - $${ns.formatNumber(augGraftCost(aug), 1)}`));
    }
}