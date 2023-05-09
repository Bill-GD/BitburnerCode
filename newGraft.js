/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();
    ns.tail();

    const graft = ns.grafting;

    const player = () => ns.getPlayer();
    const checkMoney = cost => player().money >= cost;
    const augGraftCost = aug => graft.getAugmentationGraftPrice(aug);
    const getAugStats = aug => ns.singularity.getAugmentationStats(aug);

    const graftableAugs = graft.getGraftableAugmentations();
    graftableAugs.sort((a, b) => augGraftCost(a) - augGraftCost(b));

    const option = await ns.prompt(
        'Choose option:\nlist: list augmentations\ninfo: get info of augmentation\ngraft: start grafting',
        { 'type': 'select', 'choices': ['list', 'info', 'graft'] }
    );

    switch (option) {
        case 'list': {
            ns.resizeTail(600, 300);
            let sortOption = await ns.prompt(
                'Choose sorting option:',
                {
                    'type': 'select',
                    'choices': [
                        'none',
                        'hacking',
                        'strength', 'defense', 'dexterity', 'agility',
                        'charisma',
                        'blade',
                        'misc',
                        'special',
                    ]
                }
            );

            Object.entries(graftableAugs).forEach(([id, name]) => {
                const cost = augGraftCost(name);
                if (sortOption === 'none') {
                    ns.printf(` ${id}. ${name} - $${ns.formatNumber(cost, 1)} - ${checkMoney(cost).toString().toUpperCase()}`);
                    ns.tprintf(` ${id}. ${name} - $${ns.formatNumber(cost, 1)} - ${checkMoney(cost).toString().toUpperCase()}`);
                }
                else if (sortOption === 'special' &&
                    (name === 'Neuroreceptor Management Implant' ||
                        name === 'nickofolas Congruity Implant'))
                    ns.printf(` ${id}. ${name} - $${ns.formatNumber(cost, 1)} - ${checkMoney(cost).toString().toUpperCase()}`);
                else {
                    let done = false;
                    Object.entries(getAugStats(name)).forEach(([type, mult]) => {
                        if (done) return;
                        if (mult !== 1) {
                            if (sortOption === 'misc' && checkMisc(name)) {
                                ns.printf(` ${id}. ${name} - $${ns.formatNumber(cost, 1)} - ${checkMoney(cost).toString().toUpperCase()}`);
                                done = true;
                                return;
                            }
                            else if (type.includes(sortOption)) {
                                ns.printf(` ${id}. ${name} - $${ns.formatNumber(cost, 1)} - ${checkMoney(cost).toString().toUpperCase()}`);
                                done = true;
                                return;
                            }
                        }
                    });
                }
            });
            ns.exit();
        }
        case 'info': {
            let chosenAug = await ns.prompt(
                'Select an augmentation to view info:',
                { 'type': 'select', 'choices': graftableAugs }
            );
            let id = graftableAugs.findIndex((g) => g === chosenAug);
            if (id === -1) ns.exit();

            let lineCount = 4;

            ns.printf(` ID: ${id}`);
            ns.printf(` Name: ${chosenAug}`);
            ns.printf(` Cost: $${ns.formatNumber(augGraftCost(chosenAug), 1)} - ${checkMoney(augGraftCost(chosenAug)).toString().toUpperCase()}\n\n`);

            let prereq = ns.singularity.getAugmentationPrereq(chosenAug);
            if (prereq.length !== 0) {
                ns.printf(' Prerequisite:');
                prereq.forEach(aug => {
                    lineCount++;
                    ns.printf(`  > ${aug} - ${ns.singularity.getOwnedAugmentations(true).includes(aug).toString().toUpperCase()}`);
                });
                ns.printf('\n');
                lineCount += 2;
            }

            let stats = getAugStats(chosenAug);
            if (checkKey(stats) === false) ns.printf(`INFO: This aug doesn't have any specific stat`);
            else {
                ns.printf(' Stat:');
                Object.entries(stats).forEach(([type, mult]) => {
                    if (mult !== 1) {
                        ns.print(`  > ${type}: +${ns.formatPercent(mult - 1, 1)}`);
                        lineCount++;
                    }
                });
                lineCount++;
            }

            lineCount += 3;

            ns.resizeTail(600, 25 * lineCount + 25);

            ns.printf(`\n Time: ${ns.tFormat(graft.getAugmentationGraftTime(chosenAug))}`);
            ns.exit();
        }
        case 'graft': {
            let chosenAug = await ns.prompt(
                'Select an augmentation to view graft:',
                { 'type': 'select', 'choices': graftableAugs }
            );
            let id = graftableAugs.findIndex((g) => g === chosenAug);
            if (id === -1) ns.exit();

            let focus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant");

            if (checkMoney(augGraftCost(chosenAug) + 2e5) === false) {
                ns.alert(` (!) You don't have enough money to graft: ${chosenAug}`);
                ns.printf(`INFO: Missing: $${ns.formatNumber(augGraftCost(chosenAug) - player().money, 1)}`);
                ns.exit();
            }

            if (player().city !== "New Tokyo");
            if (player().money - augGraftCost(chosenAug) > 2e5) ns.singularity.travelToCity("New Tokyo");
            else {
                ns.printf(`ERROR: You don't have enough money to travel to New Tokyo`);
                ns.exit();
            }
            if (graft.graftAugmentation(chosenAug, focus) == true) {
                if (await ns.prompt('Show time?')) {
                    ns.printf(` Time to graft\n ${chosenAug} (ID: ${id}):`);
                    ns.printf(`  > ${ns.tFormat(graft.getAugmentationGraftTime(chosenAug))}`,);
                    ns.printf(` Cost: $${ns.formatNumber(augGraftCost(chosenAug), 1)}`);
                }
            }
            else
                ns.printf(`ERROR: Hasn't grafted prerequisites of ${chosenAug}`);
            ns.exit();
        }
    }

    function checkKey(obj) {
        for (let k in obj) {
            if (obj.hasOwnProperty(k)) return true;
        }
        return false;
    }

    function checkMisc(augName) {
        let isMisc = true;
        Object.entries(getAugStats(augName)).forEach(([type, mult]) => {
            if (!isMisc) return;
            if (mult !== 1) {
                isMisc = !(type.includes('hacking') ||
                    type.includes('strength') ||
                    type.includes('defense') ||
                    type.includes('dexterity') ||
                    type.includes('agility') ||
                    type.includes('charisma') ||
                    type.includes('blade'));
            }
        });
        return isMisc;
    }
}