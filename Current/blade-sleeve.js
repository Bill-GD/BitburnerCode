/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail();
  while (1) {
    const toggles = JSON.parse(ns.read('blade-sleeve.txt'));
    let [script, args] = ['', []];
    if (toggles.runContract) [script, args] = ['sleeveContracts.js', ['--autoClose']];
    if (toggles.runDiplomacy) [script, args] = ['sleevePresets.js', ['--autoClose', '--script', '--preset', 'Diplomacy']];
    if (toggles.runInfiltrate) [script, args] = ['sleevePresets.js', ['--autoClose', '--script', '--preset', 'Infiltrate']];

    if (!ns.scriptRunning(script, 'home')) ns.run(script, { preventDuplicates: true }, ...args);
    else ns.kill(script, 'home', ...args);

    ns.clearLog();
    Object.entries(toggles).forEach(([k, v]) => ns.print(k, ': ', v));
    await ns.sleep(1e3);
  }
}