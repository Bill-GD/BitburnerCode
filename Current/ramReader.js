/** Version 0.1 (WIP)
 * Can only detect explicitly written functions
 * - if interfaces are shortened: blade = ns.bladeburner
 * - use blade.getSkillLevel instead
 * -> not detected yet
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.tail();
  ns.disableLog('ALL');
  ns.clearLog();

  const script = (await ns.prompt('Choose a script: ', { type: "select", choices: ns.ls('home', '.js') }));
  let fullFile = '';
  try {
    fullFile = ns.read(script)
      .split(/[\t;\r\n ]/)
      .filter(line => line !== '')
      // filters out comments & docs
      .filter(line => !line.match(/^( *((\/\/)|(\/\*\*)|( \*\*? )|(\t*\*\/)|(\t*\/\*)))/))
      // filters out function declarations
      .filter(line => !line.match(/ *function/))
      // filters out closing brackets
      .filter(line => !line.match(/ *(( })|( \))|( \]))/))
      .join('\n');
  } catch {
    ns.alert('Not a valid script');
    ns.exit();
  }

  const data = [...new Set(fullFile
    .split(/[\n(){}\[\]!]/)
    .filter(line => !line.match(/enums/))
    .filter(t => t.match(/\bns\./) && t.charAt(0) !== '/'))
  ];

  let totalRam = 0;
  ns.print('Base -> 1.6GB');
  data.forEach(t => {
    if (t.match(/this./)) t = t.substring(5);
    try {
      t = t.substring(3);
      const cost = ns.getFunctionRamCost(t);
      if (cost === 0) return;
      totalRam += cost;
      ns.print(t, ' -> ', ns.formatRam(cost, 2));
    } catch {}
  });
  ns.print('Total:');
  ns.print(' All: ', ns.formatRam(totalRam + 1.6, 2));
  ns.print(' Actual: ', ns.formatRam(Math.min(1024, totalRam + 1.6), 2));
}