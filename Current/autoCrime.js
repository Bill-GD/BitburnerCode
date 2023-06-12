/** Version 2.0.2
 * Updated the progress bar
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

  ns.atExit(() => {
    if (ns.singularity.getCurrentWork()?.type === 'CRIME') ns.singularity.stopAction();
  });

  if (ns.singularity.getCurrentWork()?.type === 'GRAFTING') {
    ns.print(`Currently grafting. Can't start crime. Exiting...`);
    ns.exit();
  }

  const crimes = Object.values(ns.enums.CrimeType);

  const crimeName = await ns.prompt('Choose crime', { 'type': 'select', 'choices': crimes });
  if (crimeName === '') ns.exit();

  ns.clearLog();

  const totalTime = ns.singularity.commitCrime(
    crimeName,
    !ns.singularity.getOwnedAugmentations().includes('Neuroreceptor Management Implant')
  );

  try {
    while (true) {
      ns.resizeTail(300, 155);
      ns.clearLog();
      ns.print(` Crime: ${crimeName}`);
      ns.print(` Time: ${ns.tFormat(totalTime)}`);
      ns.print(` Progress: ${progressBar((ns.singularity.getCurrentWork().cyclesWorked * 200) % totalTime, totalTime, 17)}`);
      ns.print(` Chance: ${ns.formatPercent(ns.formulas.work.crimeSuccessChance(ns.getPlayer(), crimeName), 2)}`);
      ns.print(` Karma: ${ns.formatNumber(ns.heart.break(), 3)}`);
      await ns.asleep(50);
    }
  } catch (error) {
    ns.print('Crime task was forcibly stopped.');
  }

  function progressBar(currentProgress, fullProgress, maxChar = 10) {
    const progress = Math.trunc(currentProgress / (fullProgress / maxChar));
    return `\u251c${'\u2588'.repeat(progress)}${'\u2500'.repeat(maxChar - progress)}\u2524`;
  }
}