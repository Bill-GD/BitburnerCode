/** Version 1.2.1
 * Auto set to shock recovery if shock > 0
 * Refactored sleeves data
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

  const flagOptions = ns.flags([
    ['script', false],
    ['autoClose', false],
    ['preset', ''],
  ]);

  ns.atExit(() => flagOptions.autoClose && ns.closeTail());

  let preset = flagOptions.script ? flagOptions.preset : (await ns.prompt(
    'Use preset?\nThese apply to all sleeves.\n\nIgnore to skip',
    {
      'type': 'select',
      'choices': [
        'Recover',
        'Combat',
        'Karma',
        'Infiltrate',
        'Diplomacy',
        'Analysis',
      ]
    }
  ));

  let crimes = Object.keys(ns.enums.CrimeType).map(c => ns.enums.CrimeType[c])
    .filter(a => ns.singularity.getCrimeStats(a).time <= 30e3)
    .sort((crime1, crime2) => {
      const [stats1, stats2] = [ns.singularity.getCrimeStats(crime1), ns.singularity.getCrimeStats(crime2)];
      let [score1, score2] = [0, 0];
      try {
        Object.entries(stats1).forEach(([key, value]) => {
          if (key.includes('_exp')) {
            score1 += value;
            score2 += stats2[key];
          }
        });
        return (score2 / stats2.time) - (score1 / stats1.time);
      } catch { }
    });

  let [type, action] = ['', ''];

  switch (preset) {
    case 'Recover':
      [type, action] = ['Recovery', null];
      break;
    case 'Combat':
    case 'Karma':
      [type, action] = ['Crime', preset];
      break;
    case 'Infiltrate':
      [type, action] = ['Blade', 'Infiltrate synthoids'];
      break;
    case 'Diplomacy':
      [type, action] = ['Blade', 'Diplomacy'];
      break;
    case 'Analysis':
      [type, action] = ['Blade', 'Field Analysis'];
      break;
  }

  if (preset && type === 'Crime') {
    if (action === 'Karma')
      crimes.sort((crime1, crime2) => {
        try {
          const [stats1, stats2] = [ns.singularity.getCrimeStats(crime1), ns.singularity.getCrimeStats(crime2)];
          return (stats2.karma / stats2.time) - (stats1.karma / stats1.time);
        } catch (error) { }
      });
    action = crimes[0];
  }

  let cycleLimit = 1;
  if (type === 'Crime') cycleLimit = ns.singularity.getCrimeStats(action).time / 200;
  else if (type === 'Blade') cycleLimit = action.includes('Infil') ? 300 : 150;

  if (type !== 'Recovery') for (let i = 0; i < 8; i++) ns.sleeve.setToIdle(i);

  while (1) {
    let allSleeves = [];
    for (let i = 0; i < 8; i++) {
      const task = ns.sleeve.getTask(i);
      allSleeves.push({ id: i, info: ns.sleeve.getSleeve(i), assigned: task ? true : false, action: action });
    }
    let assigned = action?.includes('Infil') ? allSleeves.filter(s => ns.sleeve.getTask(s.id)).length > 0 : false;
    allSleeves = allSleeves.sort((a, b) => b.info.storedCycles - a.info.storedCycles);

    for (const sleeve of allSleeves) {
      if (sleeve.info.shock > 0) {
        ns.sleeve.setToShockRecovery(sleeve.id);
        continue;
      }
      if (type === 'Recovery' && sleeve.info.shock <= 0) continue;
      
      const task = ns.sleeve.getTask(sleeve.id);
      if (task && task.type === 'BLADEBURNER' && task.actionType === 'Contracts') continue;
      if (sleeve.info.storedCycles < cycleLimit * 10) {
        if (task && task.cyclesNeeded - task.cyclesWorked > sleeve.info.storedCycles) {
          ns.sleeve.setToIdle(sleeve.id);
          sleeve.assigned = false;
          sleeve.action = 'Idle';
          if (action.includes('Infil')) assigned = false;
        }
        continue;
      }

      if (assigned && action.includes('Infil')) continue;

      if (!sleeve.assigned) {
        switch (type) {
          case 'Recovery':
            ns.sleeve.setToShockRecovery(sleeve.id);
            break;
          case 'Crime':
            ns.sleeve.setToCommitCrime(sleeve.id, action);
            break;
          case 'Blade':
            ns.sleeve.setToBladeburnerAction(sleeve.id, action);
            if (action.includes('Infil')) assigned = true;
            break;
        }
        sleeve.assigned = true;
      }
    }
    logTask();
    await ns.sleep(200);
  }

  function logTask() {
    ns.clearLog();
    ns.print(' Preset: ', preset ? preset : 'None');
    for (let id = 0; id < 8; id++) {
      let task = ns.sleeve.getTask(id);
      if (!task) task = `Idle`;
      else
        switch (task.type.toLowerCase()) {
          case 'bladeburner':
            task = task.actionName;
            break;
          case 'recovery':
            task = `Recovery (${ns.formatNumber(ns.sleeve.getSleeve(id).shock, 3)})`;
            break;
          case 'crime':
            task = task.crimeType;
            break;
          default:
            task = task.type[0] + task.type.substring(1).toLowerCase();
            break;
        }
      ns.print(` ${id}: ${task} - ${ns.formatNumber(ns.sleeve.getSleeve(id).storedCycles, 3, 1e6)}`);
    }
    ns.resizeTail(300, 9 * 25 + 30);
  }
}