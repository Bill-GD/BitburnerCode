/** Version 1.0.2
 * Added flag for automation: autoClose (close tail when exit)
 * Refactored main sleeve loop
 * Partially connects to 'blade-sleeve.js'
 * Shows current contract counts
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail(); ns.clearLog();
  const flagOptions = ns.flags([
    ['autoClose', false],
  ]);

  ns.run('bladeSkills.js', { preventDuplicates: true }, flagOptions.autoClose ? '--autoClose' : '');
  ns.atExit(() => {
    flagOptions.autoClose && ns.closeTail()
    for (let i = 0; i < 8; i++) {
      const task = ns.sleeve.getTask(i);
      if (task && task.type === 'BLADEBURNER' && task.actionType === 'Contracts')
        ns.sleeve.setToIdle(i);
    }
    ns.kill('bladeSkills.js', 'home', flagOptions.autoClose ? '--autoClose' : '');
  });

  const [action, contracts] = ['Take on contracts', ['Bounty Hunter', 'Retirement', 'Tracking']];

  while (1) {
    let allSleeves = [];
    for (let i = 0; i < 8; i++) allSleeves.push({ id: i, info: ns.sleeve.getSleeve(i) });

    allSleeves = allSleeves.sort((a, b) => b.info.storedCycles - a.info.storedCycles);
    const conCopy = contracts.filter(con => ns.bladeburner.getActionCountRemaining('contract', con) > 0);

    // check for assigned contracts
    allSleeves.forEach(s => {
      const task = ns.sleeve.getTask(s.id);
      if (!task || conCopy.length <= 0) return;
      if (task.type === 'BLADEBURNER' && task.actionType === 'Contracts')
        conCopy.splice(conCopy.indexOf(task.actionName), 1);
    });

    for (const sleeve of allSleeves) {
      if (sleeve.info.shock > 0) continue;
      const task = ns.sleeve.getTask(sleeve.id);
      if (task) {
        if (task.type === 'BLADEBURNER' && task.actionType === 'Contracts') {
          // if contract chance is less than 100%, stop immediately
          if (ns.bladeburner.getActionEstimatedSuccessChance('contract', task.actionName)[0] < 1
            || sleeve.info.storedCycles < 5
            || task.cyclesNeeded - task.cyclesWorked > sleeve.info.storedCycles) {
            conCopy.push(task.actionName);
            ns.sleeve.setToIdle(sleeve.id);
          }
        }
        // if sleeve is doing anything else and stored cycles exhausted, stop immediately
        else if (sleeve.info.storedCycles < 5) ns.sleeve.setToIdle(sleeve.id);
      }
      if (!ns.sleeve.getTask(sleeve.id) && sleeve.info.storedCycles < 50) continue;
      if (conCopy.length <= 0) continue;
      // * conCopy could contain undefined value ?
      if (ns.bladeburner.getActionEstimatedSuccessChance('contract', conCopy[0])[0] < 1) continue;

      ns.sleeve.setToBladeburnerAction(sleeve.id, action, conCopy[0]);
      conCopy.splice(0, 1);
    }
    logTask();
    if (allSleeves.every(s => !ns.sleeve.getTask(s.id)) || contracts.every(con => ns.bladeburner.getActionCountRemaining('contract', con) <= 0))
      ns.write('blade-sleeve.txt', JSON.stringify({ runContract: false, runDiplomacy: false, runInfiltrate: true, }), 'w');
    await ns.sleep(200);
  }

  function logTask() {
    ns.clearLog();
    contracts.forEach(con => ns.print(` ${con}: ${ns.formatNumber(ns.bladeburner.getActionCountRemaining('contract', con), 3)} - ${ns.formatPercent(ns.bladeburner.getActionEstimatedSuccessChance('contract', con)[0], 2)}`));
    for (let id = 0; id < 8; id++) {
      let task = ns.sleeve.getTask(id);
      task = task ? task.actionName : `Idle`;
      ns.print(` ${id}: ${task} - ${ns.formatNumber(ns.sleeve.getSleeve(id).storedCycles, 3, 1e6)} - int ${ns.formatNumber(ns.sleeve.getSleeve(id).skills.intelligence, 3, 1e6)}`);
    }
    ns.resizeTail(400, 11 * 25 + 25);
  }
}