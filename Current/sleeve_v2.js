/** Version 2.3.2
 * Fixed bug with Crime time limit
 * Can now choose specific CrimeType when not using preset
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();

  const colors = {
    section: getTextANSI_RGB(ns.ui.getTheme().money),
    header: getTextANSI_RGB(ns.ui.getTheme().hp),
    value: getTextANSI_RGB(ns.ui.getTheme().white),
  };

  const listHeaders = {
    topChild: `${getTextANSI_RGB(ns.ui.getTheme().hp)}\u252C`,
    middleChild: `${getTextANSI_RGB(ns.ui.getTheme().hp)}\u251C`,
    lastChild: `${getTextANSI_RGB(ns.ui.getTheme().hp)}\u2514`,
  }

  const sl = ns.sleeve;

  // shorten function
  const playerMoney = () => ns.getServerMoneyAvailable('home');

  const numSleeve = () => sl.getNumSleeves();
  const getSleeve = id => sl.getSleeve(id);

  const getAugs = id => sl.getSleevePurchasableAugs(id);
  const installAug = (id, aug) => sl.purchaseSleeveAug(id, aug);

  const setIdle = id => sl.setToIdle(id);
  const setRecover = id => sl.setToShockRecovery(id);
  const setCrimeTask = (id, crime) => sl.setToCommitCrime(id, crime);
  const crimeChance = (id, crime) => ns.formulas.work.crimeSuccessChance(getSleeve(id), crime);
  const crimeStats = crime => ns.singularity.getCrimeStats(crime);
  const setBladeWork = (id, task) => sl.setToBladeburnerAction(id, task);

  // sort the ratio between time and exp gain of crimes, best 1st
  let crimes = Object.keys(ns.enums.CrimeType).map(c => ns.enums.CrimeType[c])
    .sort((a, b) => compareCrimeStats(b, a));

  const bladeActions = [
    'Field analysis',
    'Recruitment',
    'Diplomacy',
    'Hyperbolic Regeneration Chamber',
    'Infiltrate synthoids',
    'Support main sleeve',
    'Take on contracts'
  ];

  let preset = await ns.prompt(
    'Use preset?\nThese apply to all sleeves.\n\n' +
    'Ignore to skip',
    {
      'type': 'select',
      'choices': [
        'Idle',
        'Recover',
        'Combat',
        'Karma',
        'Infiltrate',
        'Diplomacy',
        'None'
      ]
    }
  );
  let sleeves = [];
  let chanceLimit = true;

  switch (preset) {
    case 'Idle':
      sleeves = Array(numSleeve()).fill().map(() => ['Idle', null]);
      break;
    case 'Combat':
    case 'Karma':
      if (await ns.prompt('Limit Crime time to 30 sec?'))
        crimes = crimes.filter(a => crimeStats(a).time <= 30e3);
      chanceLimit = await ns.prompt('Only select Crimes with chance of 80% or more?');
      sleeves = Array(numSleeve()).fill().map(() => ['Crime', preset.toLowerCase()]);
      break;
    case 'Infiltrate':
      sleeves = Array(numSleeve()).fill().map(() => ['Blade', 'Infiltrate synthoids']);
      break;
    case 'Diplomacy':
      sleeves = Array(numSleeve()).fill().map(() => ['Blade', 'Diplomacy']);
      break;
    case 'Recover':
      sleeves = Array(numSleeve()).fill().map(() => ['Recovery', null]);
      break;
  }

  if (preset === 'None') {
    sleeves = Array(numSleeve()).fill().map(() => [null, null]);

    let notification = '';
    selectID: while (!sleeves.every(([t, a]) => t !== null)) {
      let sleeveIDs = [];
      for (let i = 0; i < numSleeve(); i++)
        sleeveIDs.push(i);
      let selectedSleeve = await ns.prompt(
        `${notification}` +
        `Choose sleeve:\n` +
        ` Confirm -> Confirm task assignments\n` +
        ` Exit/Ignore -> Exit program\n\n` +
        ` 'null' -> no change will be made\n` +
        `${getSleevesString()}`,
        { 'type': 'select', 'choices': [...sleeveIDs, 'Confirm', 'Exit'] }
      );
      if (selectedSleeve === 'Exit' || selectedSleeve === '') ns.exit();
      if (selectedSleeve === 'Confirm') break;

      notification = '';
      let chosenOption = '';
      let chosenAction = '';
      while (chosenAction === '') {
        chosenOption = await ns.prompt(
          `${notification}Chosen sleeve:\n` +
          `${selectedSleeve}: ${sleeves[selectedSleeve][0]} - ${sleeves[selectedSleeve][1]}\n\n` +
          `Choose action type for sleeve:`,
          { 'type': 'select', 'choices': ['Idle', 'Recovery', 'Crime', 'Blade', 'Go Back'] });
        if (chosenOption === '') {
          chosenAction = '';
          notification = '(!) No action type selected\n\n';
          continue;
        }
        if (chosenOption === 'Go Back') {
          notification = '';
          continue selectID;
        }
        if (chosenOption === 'Recovery' && getSleeve(selectedSleeve).shock <= 0) {
          notification = `(!) Sleeve ${selectedSleeve} shock is 0\n\n`;
          continue;
        }
        sleeves[selectedSleeve][0] = chosenOption;
        if (chosenOption === 'Recovery' || chosenOption === 'Idle') break;
        if (chosenOption === 'Crime') {
          chosenAction = await ns.prompt('Choose a crime',
            { 'type': 'select', 'choices': Object.keys(ns.enums.CrimeType).map(c => ns.enums.CrimeType[c]) }
          );
          if (chosenAction !== '') sleeves[selectedSleeve][1] = chosenAction;
        }
        if (chosenOption === 'Blade') {
          chosenAction = await ns.prompt(
            'Choose Bladeburner action',
            { 'type': 'select', 'choices': bladeActions }
          );
          if (chosenAction !== '') sleeves[selectedSleeve][1] = chosenAction;
        }
        await ns.sleep(10);
      }
      await ns.sleep(10);
    }
  }

  sleeves.forEach(([type, action], id) => {
    if (!type) return;

    switch (type) {
      case 'Recovery':
        setRecover(id);
        break;
      case 'Idle':
        setIdle(id);
        break;
      case 'Crime':
        if (preset !== 'None') {
          let crimeTask = chanceLimit ? crimes.find(a => crimeChance(id, a) >= 0.8) : null;
          if (action === 'combat')
            setCrimeTask(id, crimeTask ? crimeTask : crimes[0]);
          if (action === 'karma') {
            crimes.sort((a, b) => compareCrimeKarma(b, a));
            setCrimeTask(id, crimeTask ? crimeTask : crimes[0]);
          }
        }
        if (action) setCrimeTask(id, action);
        break;
      case 'Blade':
        if (action) setBladeWork(id, action);
        break;
    }
  });

  while (true) {
    sleeves.forEach(([t, a], id) => {
      const augs = getAugs(id);
      augs.sort((a, b) => a.cost - b.cost)
        .filter(a => a.cost < playerMoney() / (augs.length * numSleeve()))
        .forEach(aug => {
          if (getSleeve(id).shock <= 0) installAug(id, aug.name);
        });
    });

    logTask();
    await ns.sleep(10e3);
  }

  function logTask() {
    let maxWidth = 0;
    let lineCount = 0;
    ns.clearLog();
    for (let id = 0; id < numSleeve(); id++) {
      let task = sl.getTask(id);
      if (!task) task = `Idle`;
      else
        switch (task.type.toLowerCase()) {
          case 'bladeburner':
            task = task.actionName;
            break;
          case 'recovery':
            task = 'Recovery (' + ns.formatNumber(getSleeve(id).shock, 3) + ')';
            break;
          case 'crime':
            task = task.crimeType + ' (' + ns.formatPercent(crimeChance(id, task.crimeType), 2) + ')';
            break;
          default:
            task = task.type[0] + task.type.substring(1).toLowerCase();
            break;
        }
      let nameStr = ` Sleeve-${id} f Task:      ${task}`;
      let cycles = `          f Cycles:    ${ns.formatNumber(getSleeve(id).storedCycles, 3)}`;
      let augStr = `          f Aug.Count: ${sl.getSleeveAugmentations(id).length} `;

      maxWidth = Math.max(maxWidth, nameStr.length, augStr.length, cycles.length);

      nameStr = ` ${colors.section}Sleeve-${id} ${colors.header}${listHeaders.topChild} Task:      ${colors.value}${task}`;
      cycles = `          ${colors.header}${listHeaders.middleChild} Cycles:    ${colors.value}${ns.formatNumber(getSleeve(id).storedCycles, 3)}`;
      augStr = `          ${colors.header}${listHeaders.lastChild} Aug.Count: ${colors.value}${sl.getSleeveAugmentations(id).length} `;
      ns.print(`${nameStr} \n${cycles} \n${augStr} `);
      lineCount += 3;
    }

    const time = new Date();
    ns.printf(
      `\n At: ` +
      `${time.getDate()}/${time.getMonth() + 1}` +
      ` ${time.getHours() < 10 ? '0' : ''}${time.getHours()}:${time.getMinutes() < 10 ? '0' : ''}${time.getMinutes()}`
    );
    ns.resizeTail(Math.max(250, maxWidth * 10), (lineCount + 1) * 25 + 35);
  }

  /** @return
   * ```number```
   * * ```positive``` if ```crime1``` is better than ```crime2```
   * * ```negative``` if ```crime1``` is worse than ```crime2```
   * * ```0``` if they are equal
   */
  function compareCrimeStats(crime1, crime2) {
    const stats1 = crimeStats(crime1),
      stats2 = crimeStats(crime2);
    let score1 = 0, score2 = 0;
    try {
      Object.entries(stats1).forEach(([key, value]) => {
        if (key.includes('_exp')) {
          score1 += value;
          score2 += stats2[key];
        }
      });
      score1 /= stats1.time;
      score2 /= stats2.time;
      return score1 - score2;
    } catch (error) { }
  }

  function compareCrimeKarma(crime1, crime2) {
    const stats1 = crimeStats(crime1),
      stats2 = crimeStats(crime2);
    let score1 = 0, score2 = 0;
    try {
      score1 = stats1.karma / stats1.time;
      score2 = stats2.karma / stats2.time;
      return score1 - score2;
    } catch (error) { }
  }

  function getSleevesString() {
    let string = '';
    sleeves.forEach(([type, action], id) => string += `${id}: ${type} - ${action}\n`);
    return string;
  }

  function getTextANSI_RGB(colorHex = '#ffffff') {
    if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
    var r = parseInt(colorHex.substring(1, 3), 16);
    var g = parseInt(colorHex.substring(3, 5), 16);
    var b = parseInt(colorHex.substring(5, 7), 16);
    return `\u001b[38;2;${r};${g};${b}m`;
  }
}