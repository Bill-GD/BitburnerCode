/** Version 1.0
 * Sleeve Rotation for Contracts in Blade
 * For Sleeve Int grinding
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail(); ns.clearLog();

  const [action, contracts] = ['Take on contracts', ['Bounty Hunter', 'Retirement', 'Tracking']];
  for (let i = 0; i < 8; i++) ns.sleeve.setToIdle(i);

  while (1) {
    let allSleeves = [];
    for (let i = 0; i < 8; i++) allSleeves.push({ id: i, info: ns.sleeve.getSleeve(i) });

    allSleeves = allSleeves.sort((a, b) => b.info.storedCycles - a.info.storedCycles);
    const conCopy = contracts.filter(con => ns.bladeburner.getActionCountRemaining('contract', con) > 0);

    allSleeves.forEach(s => {
      const task = ns.sleeve.getTask(s.id);
      if (!task || conCopy.length <= 0) return;
      if (task.type.includes('BLADE') && task.actionType === 'Contracts')
        conCopy.splice(conCopy.indexOf(task.actionName), 1);
    });

    for (const sleeve of allSleeves) {
      if (ns.sleeve.getSleeve(sleeve.id).shock > 0) continue;
      const task = ns.sleeve.getTask(sleeve.id);
      if (task && task.type.includes('BLADE') && task.actionType === 'Contracts') {
        if (sleeve.info.storedCycles < 5 || task.cyclesNeeded - task.cyclesWorked > sleeve.info.storedCycles) {
          ns.sleeve.setToIdle(sleeve.id);
          conCopy.push(task.actionName);
        }
        continue;
      }
      if (conCopy.length <= 0) continue;
      if (ns.bladeburner.getActionEstimatedSuccessChance('contract', conCopy[0])[0] < 0.9) continue;

      ns.sleeve.setToBladeburnerAction(sleeve.id, action, conCopy[0]);
      conCopy.splice(0, 1);
    }
    logTask();
    await ns.sleep(100);
  }

  function logTask() {
    ns.clearLog();
    for (let id = 0; id < 8; id++) {
      let task = ns.sleeve.getTask(id);
      task = task ? task.actionName : `Idle`;
      ns.print(` ${id}: ${task} - ${ns.formatNumber(ns.sleeve.getSleeve(id).storedCycles, 3, 1e6)} - int ${ns.formatNumber(ns.sleeve.getSleeve(id).skills.intelligence, 3)}`);
    }
    ns.resizeTail(350, 8 * 25 + 35);
  }
}