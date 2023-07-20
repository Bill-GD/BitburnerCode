/** Version 1.0.1
 * Avoid overriding tasks other than Contracts
 * Uses 'bladeSkills.js' for upgrading skills
 * Avoid contracts with less than 100% success chance
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail(); ns.clearLog();
  ns.run('bladeSkills.js', { preventDuplicates: true });
  ns.atExit(() => {
    for (let i = 0; i < 8; i++) {
      const task = ns.sleeve.getTask(i);
      if (task && task.type === 'BLADEBURNER' && task.actionType === 'Contracts')
        ns.sleeve.setToIdle(i);
    }
    ns.scriptKill('bladeSkills.js', 'home');
  });

  const [action, contracts] = ['Take on contracts', ['Bounty Hunter', 'Retirement', 'Tracking']];

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
      if (task && !(task.type === 'BLADEBURNER' && task.actionType === 'Contracts')) continue;
      if (sleeve.info.storedCycles < 50) {
        if (task && (sleeve.info.storedCycles < 5 || task.cyclesNeeded - task.cyclesWorked > sleeve.info.storedCycles)) {
          conCopy.push(task.actionName);
          ns.sleeve.setToIdle(sleeve.id);
        }
        continue;
      }
      if (task && task.type.includes('BLADE') && task.actionType === 'Contracts') continue;
      if (conCopy.length <= 0) continue;
      if (ns.bladeburner.getActionEstimatedSuccessChance('contract', conCopy[0])[0] < 1) continue;

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