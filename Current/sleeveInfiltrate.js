/** Version 1.0
 * Farm stored cycles (overclock) of sleeves to infiltrate for Bladeburner work
 * May extend to combat & karma
 */
/** @param {NS} ns */
export async function main(ns) {
  if (!JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bladeburner) {
    ns.alert('Not in Bladeburner');
    ns.exit();
  }

  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

  let assigned = Array(8).fill().map((e, i) => ns.sleeve.getSleeve(i)).filter((s, i) => ns.sleeve.getTask(i)).length > 0;
  while (1) {
    let allSleeves = [];
    for (let i = 0; i < 8; i++) allSleeves.push([i, ns.sleeve.getSleeve(i)]);
    allSleeves = allSleeves.sort((a, b) => b[1].storedCycles - a[1].storedCycles);

    for (const sleeve of allSleeves) {
      const task = ns.sleeve.getTask(sleeve[0]);
      if (sleeve[1].storedCycles < 300) {
        if (task && task.cyclesNeeded - task.cyclesWorked > sleeve[1].storedCycles) {
          ns.sleeve.setToIdle(sleeve[0]);
          assigned = false;
        }
        continue;
      }

      if (assigned) continue;

      ns.sleeve.setToBladeburnerAction(sleeve[0], 'Infiltrate synthoids');
      assigned = true;
    }
    logTask();
    await ns.sleep(200);
  }

  function logTask() {
    ns.clearLog();
    for (let id = 0; id < 8; id++) {
      let task = !ns.sleeve.getTask(id) ? `Idle` : `Infiltrate`;

      ns.print(` ${id}: ${task} - ${ns.formatNumber(ns.sleeve.getSleeve(id).storedCycles, 3)}`);
    }

    ns.resizeTail(275, 8 * 25 + 35);
  }
}