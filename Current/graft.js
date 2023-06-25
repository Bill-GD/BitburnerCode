/** Version 2.2.3
 * Removed some shortened functions
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.clearLog();

  const flagOptions = ns.flags([
    ['script', false],
    ['chosenAugName', ''],
    ['multiple', false]
  ]);

  const colors = {
    section: getColor(ns.ui.getTheme().money),
    header: getColor(ns.ui.getTheme().hp),
    value: getColor(ns.ui.getTheme().white),
  };
  const listHeaders = {
    middleChild: `${colors.header}\u251C`,
    lastChild: `${colors.header}\u2514`,
  }

  const graft = ns.grafting;

  const checkMoney = cost => ns.getPlayer().money >= cost;

  const graftableAugs = graft.getGraftableAugmentations();
  graftableAugs.sort((a, b) => graft.getAugmentationGraftPrice(a) - graft.getAugmentationGraftPrice(b));

  let option = '';
  if (flagOptions.script)
    option = 'graft';
  else {
    ns.tail();
    ns.moveTail(150, 250);
    option = await ns.prompt(
      'Choose option:\nlist: list augmentations\ninfo: get info of augmentation\ngraft: start grafting',
      { 'type': 'select', 'choices': ['list', 'info', 'graft'] }
    );
  }

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
            'hacknet',
            'misc',
            'special',
          ]
        }
      );

      Object.entries(graftableAugs).forEach(([id, name]) => {
        const cost = graft.getAugmentationGraftPrice(name);
        const hasEnoughMoney = checkMoney(cost);
        const checkColor = hasEnoughMoney ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`;
        const info = `${checkColor} ${id}. ${colors.value}${name} - ${getColor(ns.ui.getTheme().money)}$${ns.formatNumber(cost, 3)}${colors.value} - ${checkColor}${hasEnoughMoney.toString().toUpperCase()}\n`;
        if (sortOption === 'none') {
          ns.print(info);
          // ns.tprintf(info);
        }
        else if (sortOption === 'special' &&
          (name.includes('Neuroreceptor') || name.includes('nickofolas') || name.includes(`The Blade`)))
          ns.print(info);
        else {
          let done = false;
          Object.entries(ns.singularity.getAugmentationStats(name)).forEach(([type, mult]) => {
            if (done) return;
            if (mult !== 1) {
              if (sortOption === 'misc' && checkMisc(name)) {
                ns.print(info);
                done = true;
                return;
              }
              else if (type.includes(sortOption)) {
                ns.print(info);
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
      let maxWidth = ` Name: ${chosenAug}`.length;

      ns.printf(`${colors.section} ID:${colors.value} ${id}`);
      const nameLine = ` Name: ${chosenAug}`;
      maxWidth = Math.max(maxWidth, nameLine.length);
      ns.printf(`${colors.section}` + nameLine.replace(': ', `: ${colors.value}`));
      const money = checkMoney(graft.getAugmentationGraftPrice(chosenAug));
      ns.printf(`${colors.section} Cost:` +
        (money ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`) + ` $${ns.formatNumber(graft.getAugmentationGraftPrice(chosenAug), 3)}\n\n`);

      let prereq = ns.singularity.getAugmentationPrereq(chosenAug);
      if (prereq.length !== 0) {
        ns.printf(`${colors.section} Prerequisites`);
        prereq.forEach((aug, index) => {
          lineCount++;
          const header = index === prereq.length - 1 ? `${listHeaders.lastChild}` : `${listHeaders.middleChild}`;
          const owned = ns.singularity.getOwnedAugmentations().includes(aug);
          const preLine = `  > ${aug}`;
          ns.printf(preLine
            .replace('>', header + (owned ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`))
          );
          maxWidth = Math.max(maxWidth, preLine.length);
        });
        ns.printf('\n');
        lineCount += 2;
      }

      let stats = Object.entries(ns.singularity.getAugmentationStats(chosenAug)).filter(([type, mult]) => mult !== 1);
      if (stats.length === 0) {
        maxWidth = Math.max(maxWidth, ` INFO: This aug doesn't have any specific stat`.length);
        ns.printf(`${getColor('#0099ff')} This aug doesn't have any specific stat`);
      }
      else {
        ns.printf(`${colors.section} Stats`);
        stats.forEach(([type, mult], index) => {
          const multLine = `  > ${type}: ${ns.formatPercent(mult - 1, 2)}`;
          const header = index === stats.length - 1 ? `${listHeaders.lastChild}` : `${listHeaders.middleChild}`;
          maxWidth = Math.max(maxWidth, multLine.length);
          ns.print(multLine.replace('>', header).replace(': ', `: ${colors.value}`));
          lineCount++;
        });
      }

      lineCount += 4;

      const timeLine = ` Time: ${ns.tFormat(graft.getAugmentationGraftTime(chosenAug))}`;
      maxWidth = Math.max(maxWidth, timeLine.length);
      ns.printf(`\n${colors.section}${timeLine.replace(': ', `: ${colors.value}`)}`);

      ns.resizeTail(Math.max(250, maxWidth * 10), 25 * lineCount + 30);
      ns.exit();
    }
    case 'graft': {
      let chosenAug = !flagOptions.script
        ? await ns.prompt(
          'Select an augmentation to view graft:',
          { 'type': 'select', 'choices': graftableAugs }
        )
        : flagOptions.chosenAugName;

      let id = graftableAugs.findIndex((g) => g === chosenAug);
      if (id === -1) ns.exit();

      let focus = !ns.singularity.getOwnedAugmentations().includes("Neuroreceptor Management Implant");

      if (!checkMoney(graft.getAugmentationGraftPrice(chosenAug))) {
        ns.alert(` (!) You don't have enough money to graft: ${chosenAug}`);
        ns.printf(`${getColor('#0099ff')} Missing: $${ns.formatNumber(graft.getAugmentationGraftPrice(chosenAug) - ns.getPlayer().money, 1)}`);
        ns.exit();
      }

      if (ns.getPlayer().city !== "New Tokyo")
        if (ns.getPlayer().money - graft.getAugmentationGraftPrice(chosenAug) > 2e5) ns.singularity.travelToCity("New Tokyo");
        else {
          ns.printf(`${getColor('#ff0000')} You don't have enough money to travel to New Tokyo`);
          ns.exit();
        }
      if (graft.graftAugmentation(chosenAug, focus) === true) {
        if (!flagOptions.multiple) {
          ns.resizeTail(600, 130);
          const showTime = await ns.prompt('Show time?');
          if (showTime) {
            ns.printf(` Time to graft\n ${chosenAug} (ID=${id}, cost=$${ns.formatNumber(graft.getAugmentationGraftPrice(chosenAug), 1)}):`);
            ns.printf(`  > ${ns.tFormat(graft.getAugmentationGraftTime(chosenAug))}`);
          }
          else
            ns.printf(` Currently grafting: ${chosenAug}`);
        }
        else ns.closeTail();
        ns.toast(`Started grafting ${chosenAug}`, 'info', 10e3);
      }
      else
        ns.printf(`ERROR: Hasn't grafted prerequisites of ${chosenAug}`);
      ns.exit();
    }
  }

  function checkMisc(augName) {
    let isMisc = true;
    Object.entries(ns.singularity.getAugmentationStats(augName)).forEach(([type, mult]) => {
      if (!isMisc) return;
      if (mult !== 1) {
        isMisc = !(type.includes('hacking') ||
          type.includes('strength') ||
          type.includes('defense') ||
          type.includes('dexterity') ||
          type.includes('agility') ||
          type.includes('charisma') ||
          type.includes('hacknet') ||
          type.includes('blade'));
      }
    });
    return isMisc;
  }

  function getColor(colorHex = '#ffffff') {
    if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    return `\u001b[38;2;${r};${g};${b}m`;
  }
}