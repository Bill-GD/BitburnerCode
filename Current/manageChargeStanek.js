/** @param {NS} ns */
export async function main(ns) {
  ns.scriptKill('chargeStanek.js', 'home');
  await ns.sleep(50);
  ns.exec('stanekThread.js', 'home', { preventDuplicates: true });
  await ns.sleep(50);
  const thread = parseInt(ns.read('thread.txt'));
  ns.atExit(() => {
    if (thread >= 1)
      ns.exec('chargeStanek.js', 'home', { preventDuplicates: true, threads: thread });
  });
}
