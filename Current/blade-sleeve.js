/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail();
  while (1) {
    const toggles = JSON.parse(ns.read('blade-sleeve.txt'));
    checkToggle(toggles.runContract, 'sleeveContracts.js', ['--autoClose', '--avoidOverlap']);
    checkToggle(toggles.runDiplomacy, 'sleevePresets.js', ['--autoClose', '--script', '--preset', 'Diplomacy']);
    checkToggle(toggles.runInfiltrate, 'sleevePresets.js', ['--autoClose', '--script', '--preset', 'Infiltrate']);

    ns.clearLog();
    Object.entries(toggles).forEach(([k, v]) => ns.print(k, ': ', v));
    await ns.sleep(1e3);
  }

  function checkToggle(toggle, script, args) {
    if (toggle && !ns.scriptRunning(script, 'home')) ns.run(script, { preventDuplicates: true }, ...args);
    if (!toggle) ns.kill(script, 'home', ...args);
  }
}