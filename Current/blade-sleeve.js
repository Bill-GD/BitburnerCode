/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail();

  const logNote = {
    scriptNote: [],
    toggles: {},
  }

  while (1) {
    logNote.scriptNote = [];
    const toggles = JSON.parse(ns.read('blade-sleeve.txt'));
    checkToggle(toggles.runContract, 'sleeveContracts.js', ['--autoClose', '--avoidOverlap']);
    checkToggle(toggles.runDiplomacy, 'sleevePresets.js', ['--autoClose', '--script', '--preset', 'Diplomacy']);
    checkToggle(toggles.runInfiltrate, 'sleevePresets.js', ['--autoClose', '--script', '--preset', 'Infiltrate']);

    ns.clearLog();
    logNote.scriptNote = [...(new Set(logNote.scriptNote))];
    logNote.toggles = toggles;
    log();
    await ns.sleep(1e3);
  }

  function log() {
    logNote.scriptNote.forEach(line => ns.print(line + '\n'));
    logNote.scriptNote.length > 0 && ns.print('--------------\n');
    Object.entries(logNote.toggles).forEach(([k, v]) => ns.print(k, ': ', v));
    ns.resizeTail(230, (logNote.scriptNote.length + 5) * 25);
  }

  function checkToggle(toggle, script, scriptArgs) {
    if (ns.scriptRunning(script, 'home')) logNote.scriptNote.push(`${script.split('.')[0].substring(6)} is running`);
    if (toggle && !ns.scriptRunning(script, 'home')) ns.run(script, { preventDuplicates: true }, ...scriptArgs);
    if (!toggle) ns.kill(script, 'home', ...scriptArgs);
  }
}