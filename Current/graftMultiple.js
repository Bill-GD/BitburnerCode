/** Version 2.6.3
 * Limits the RAM usage of 'graft.js' to minimal
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.clearLog();
  ns.tail();

  const colors = {
    section: getColor(ns.ui.getTheme().money),
    header: getColor(ns.ui.getTheme().hp),
    value: getColor(ns.ui.getTheme().white),
  };

  const listHeaders = {
    middleChild: `${colors.header}\u251C`,
    lastChild: `${colors.header}\u2514`,
  }

  const fileName = 'augs_to_graft.txt';

  const graft = ns.grafting;
  const augGraftCost = aug => graft.getAugmentationGraftPrice(aug);
  const graftTime = aug => graft.getAugmentationGraftTime(aug);
  const getOwned = () => ns.singularity.getOwnedAugmentations();
  const getGraftableAugs = () => graft.getGraftableAugmentations().sort((a, b) => augGraftCost(a) - augGraftCost(b));

  // sort available augs (cheap -> expensive)
  const graftableAugs = getGraftableAugs();

  let chosenAugNames = ns.read(fileName).split('\n');
  chosenAugNames = chosenAugNames.filter(aug => graftableAugs.includes(aug)); // filters grafted/invalid augs

  let option, chosenAugIDs;
  if (chosenAugNames.length > 0) {
    ns.print(` ${colors.section}Current queue:`);
    chosenAugNames.forEach((aug, index) => {
      ns.print((index === chosenAugNames.length - 1 ? `  ${listHeaders.lastChild}` : `  ${listHeaders.middleChild}`)
        + ` ${graftableAugs.indexOf(aug)}. ${colors.value}${aug} - ${colors.section}$${ns.formatNumber(augGraftCost(aug), 2)}`
      );
    });

    option = await ns.prompt(
      `There's a queue with ${chosenAugNames.length} aug(s).\n\nIgnore to use the current queue\nor\nChoose one of the options below.`,
      { 'type': 'select', 'choices': ['Reset', 'Add', 'Remove'] }
    );
    if (option !== 'Reset') {
      chosenAugIDs = chosenAugNames.map(aug => graftableAugs.findIndex(a => a === aug));
      if (option === 'Add') {
        const stringID = (await ns.prompt(
          'Current list of IDs -> check tail\n\n' +
          'IDs to add (separated by spaces):',
          { 'type': 'text' }
        ))
          .split(' ')
          .filter(id => !isNaN(parseInt(id)) && id < graftableAugs.length)
          .map(id => parseInt(id))
          .filter(id => augGraftCost(graftableAugs[id]) < ns.getServerMoneyAvailable('home'));
        chosenAugIDs = [...new Set(
          [...chosenAugIDs, ...stringID]
            .map(id => parseInt(id))
            .sort((a, b) => b - a)
        )];
      }

      if (option === 'Remove') {
        // filters duplicates from user input
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
    }
  }

  if (chosenAugNames.length <= 0 || option === 'Reset') {
    const stringID = (await ns.prompt(
      'Write list of IDs to graft (separated by spaces)\n' +
      'IDs from the list of augmentations',
      { 'type': 'text' }
    ))
      .split(' ')
      .filter(id => !isNaN(parseInt(id)));

    if (stringID.length === 0) ns.exit();

    // filters duplicates from user input
    chosenAugIDs = [...new Set(
      stringID
        .map(id => parseInt(id))
        .filter(id => id < graftableAugs.length)
        .sort((a, b) => b - a)
    )];
  }

  chosenAugNames = chosenAugIDs.map(id => graftableAugs[id]);
  chosenAugNames = chosenAugNames.sort((a, b) => graftableAugs.indexOf(b) - graftableAugs.indexOf(a));
  organizeAugs();

  let maxWidth = 0;
  switch (chosenAugNames.length) {
    case 0:
      ns.alert('NO Augmentations were chosen');
      break;
    case 1:
      ns.write(fileName, '', 'w');
      if (!(await ns.prompt(`Confirm Grafting: ${chosenAugNames[0]}`)))
        break;
      ns.run('graft.js', 1, '--script', '--chosenAugName', chosenAugNames[0]);
      break;
    default:
      ns.clearLog();
      let totalCost = 0;
      let totalTime = 0;
      let list = '';

      ns.write(fileName, chosenAugNames.join('\n'), 'w');

      // calculates time & cost
      chosenAugNames.forEach((aug, index) => {
        totalCost += augGraftCost(aug);
        totalTime += graftTime(aug);
        const augLine = `  > ${graftableAugs.indexOf(aug)}. ${aug} - s$${ns.formatNumber(augGraftCost(aug), 2)}`;
        maxWidth = Math.max(maxWidth, augLine.length);
        const listHeader = index === chosenAugNames.length - 1 ? `${listHeaders.lastChild}` : `${listHeaders.middleChild}`;
        list += augLine
          .replace('. ', `. ${colors.value}`)
          .replace(' >', ` ${listHeader}`)
          .replace(' s', ` ${colors.section}`) + '\n';
      });

      const currentWork = ns.singularity.getCurrentWork();
      if (currentWork !== null && currentWork.type === 'GRAFTING')
        totalTime += (graftTime(currentWork.augmentation) - (currentWork.cyclesWorked * 200));

      // process time info
      const timeStart = new Date();
      const timeEnd = new Date(timeStart.getTime() + totalTime);
      let generalInfo =
        ` ${colors.section}Info\n` +
        `  ${listHeaders.middleChild} Count: ${colors.value}${chosenAugNames.length}\n` +
        `  ${listHeaders.middleChild} Cost:  ${colors.value}$${ns.formatNumber(totalCost, 3)}\n` +
        `  ${listHeaders.middleChild} Time:  ${colors.value}${ns.tFormat(totalTime)}\n` +
        `  ${listHeaders.middleChild} Start: ${colors.value}${timeStart.getDate()}/${timeStart.getMonth() + 1} ${timeStart.getHours() < 10 ? '0' : ''}${timeStart.getHours()}:${timeStart.getMinutes() < 10 ? '0' : ''}${timeStart.getMinutes()}\n` +
        `  ${listHeaders.lastChild} End:   ${colors.value}${timeEnd.getDate()}/${timeEnd.getMonth() + 1} ${timeEnd.getHours() < 10 ? '0' : ''}${timeEnd.getHours()}:${timeEnd.getMinutes() < 10 ? '0' : ''}${timeEnd.getMinutes()}`;

      ns.print(` ${colors.section}Augmentations\n` + `${list}\n${generalInfo}`);

      maxWidth = Math.max(ns.tFormat(totalTime).length + 10, maxWidth);

      if (!await ns.prompt('Start Grafting?')) break;

      // waits for current aug to finish
      let waitName = '';
      while (ns.singularity.getCurrentWork() !== null && ns.singularity.getCurrentWork().type === 'GRAFTING') {
        const work = ns.singularity.getCurrentWork();
        if (waitName === '') waitName = work.augmentation;
        ns.clearLog();
        log(list, generalInfo, work.augmentation, work.cyclesWorked * 200, graftTime(work.augmentation));
        await ns.sleep(1e3);
      }

      if (waitName !== '' && !getOwned().includes(waitName)) {
        ns.alert('Grafting work for leftover aug was forcibly stopped');
        ns.exit();
      }

      // starts grafting
      let augProgress = chosenAugNames.slice();
      for (const aug of chosenAugNames) {
        if (!getGraftableAugs().includes(aug)) {
          updateSave(augProgress, aug);
          continue;
        }
        // avoid skipping aug -> lose money
        while (ns.singularity.getCurrentWork() !== null && ns.singularity.getCurrentWork().type === 'GRAFTING')
          await ns.sleep(1e3);

        let augList = '';
        chosenAugNames.forEach((aug, index) => {
          const i = getGraftableAugs().indexOf(aug);
          const augLine = i >= 0
            ? `  > ${i}. ${aug} - s$${ns.formatNumber(augGraftCost(aug), 2)}`
            : `  >. ${aug}`;
          maxWidth = Math.max(maxWidth, augLine.length);
          const listHeader = index === chosenAugNames.length - 1 ? `${listHeaders.lastChild}` : `${listHeaders.middleChild}`;
          augList += augLine
            .replace('. ', i >= 0 ? `. ${colors.value}` : ` ${getColor('#00ff00')}\u2705 `)
            .replace(' >', ` ${listHeader}`)
            .replace(' s', ` ${colors.section}`)
            + '\n';
        });

        ns.run('graft.js', { ramOverride: 29.1, preventDuplicates: true }, '--script', '--chosenAugName', aug, '--multiple');
        await ns.sleep(200);

        // while (currentTime < timeToGraft) {
        while (ns.singularity.getCurrentWork() !== null && ns.singularity.getCurrentWork().type === 'GRAFTING') {
          if (!ns.singularity.getCurrentWork()) break;
          log(augList, generalInfo, aug, ns.singularity.getCurrentWork().cyclesWorked * 200, graftTime(aug));
          await ns.sleep(1e3);
        }

        if (!getOwned().includes(aug)) {
          ns.alert('Grafting work was forcibly stopped');
          ns.exit();
        }

        updateSave(augProgress, aug);
        await ns.sleep(200);
      }

      ns.print(`\n${getColor('#0099ff')} FINISHED GRAFTING`);
      break;
  }

  /** Removes the recently grafted ```aug``` from save file.
   * @param {string[]} augProgress Current saved progress.
   * @param {string} aug The recently grafted augmentation.
   */
  function updateSave(augProgress, aug) {
    const index = augProgress.indexOf(aug);
    if (index < 0) return;
    augProgress.splice(index, 1);
    ns.write(fileName, augProgress.join('\n'), 'w');
  }

  /** Log the current progress to the log box.
   * @param {string} augList A string contains lines of aug to be printed to log.
   * @param {string} generalInfo Info of this grafting session.
   * @param {string} aug The augmentation currently grafting.
   * @param {number} currentTime The time used to graft ```aug```.
   * @param {number} timeToGraft The time needed to graft ```aug```.
   */
  function log(augList, generalInfo, aug, currentTime, timeToGraft) {
    ns.clearLog();
    let lineCount = 2 + augList.split('\n').length;

    ns.print(` ${colors.section}Augmentations\n`);
    ns.print(augList);

    ns.print(
      `\n ${colors.section}Grafting\n` +
      `  ${listHeaders.middleChild} Name: ${colors.value}${aug}\n` +
      `  ${listHeaders.lastChild} Progress: ${colors.value}${progressBar(currentTime, timeToGraft)}`
    );

    ns.print('\n' + generalInfo);

    ns.resizeTail(Math.max(250, maxWidth * 10), 25 * (lineCount + 9) + 15);
  }

  /** Re-organize the list of aug names. */
  function organizeAugs() {
    const specialAugs = [
      `The Blade's Simulacrum`,
      'Neuroreceptor Management Implant',
      'nickofolas Congruity Implant',
    ];
    const standAlone = [], lastUpgrades = [], prereqs = [], others = [];

    // split into 3 types
    chosenAugNames.forEach(aug => {
      if (findLastUpgradeAug(aug) === null) {
        if (ns.singularity.getAugmentationPrereq(aug).length > 0) lastUpgrades.push(aug);
        else standAlone.push(aug);
      }
      else others.push(aug);
    });

    // separate prereqs from 'others'
    lastUpgrades.forEach(lastAug => {
      for (const pre of ns.singularity.getAugmentationPrereq(lastAug).reverse())
        if (!getOwned().includes(pre))
          if (others.includes(pre)) {
            prereqs.push(pre);
            others.splice(others.indexOf(pre), 1);
          }
    });

    let reorderedAugs = [];
    // prioritize special augs
    specialAugs.forEach(s => {
      if (chosenAugNames.includes(s)) {
        reorderedAugs.push(s);
        chosenAugNames.splice(chosenAugNames.indexOf(s), 1);
      }
    });

    chosenAugNames.forEach(aug => {
      if (standAlone.includes(aug)) reorderedAugs.push(aug);
      else if (lastUpgrades.includes(aug))
        reorderedAugs = [...new Set([...reorderedAugs, ...getUpgradeTree(aug).reverse().filter(aug => !getOwned().includes(aug))])];
      else if (others.includes(aug)) reorderedAugs.push(aug);
    });

    chosenAugNames = reorderedAugs;
  }

  function getUpgradeTree(lastUpgrade) {
    let tree = [lastUpgrade];
    const firstPre = ns.singularity.getAugmentationPrereq(lastUpgrade)[0];
    if (firstPre) tree = [...new Set([...tree, ...getUpgradeTree(firstPre)])];
    return tree;
  }

  /** Find the last aug of ```prereq``` upgrade tree.
   * @param {string} prereq Name of the augmentation.
   * @return {string} Name of the last upgrade of ```prereq```.
   */
  function findLastUpgradeAug(prereq) {
    const upgrades = getGraftableAugs().filter(aug => ns.singularity.getAugmentationPrereq(aug).includes(prereq));
    if (upgrades.length === 0) return null;
    return upgrades.sort((a, b) => ns.singularity.getAugmentationPrereq(b).length - ns.singularity.getAugmentationPrereq(a).length)[0];
  }

  function getColor(colorHex = '#ffffff') {
    if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    return `\u001b[38;2;${r};${g};${b}m`;
  }

  function progressBar(currentProgress, fullProgress, maxChar = 10) {
    const progress = Math.trunc(currentProgress / (fullProgress / maxChar));
    return `\u251c${'\u2588'.repeat(Math.min(maxChar, progress))}${'\u2500'.repeat(Math.max(0, maxChar - progress))}\u2524 ${ns.formatPercent(currentProgress / fullProgress, 2)}`;
  }
}