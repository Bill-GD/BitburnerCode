/** @param {NS} ns */
export async function main(ns) {
  ns.scriptKill('sleevePresets.js', 'home');
  let preset = await ns.prompt(
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
  );

  ns.run('sleevePresets.js', { preventDuplicates: true, threads: 1 }, '--script', '--preset', preset);
}