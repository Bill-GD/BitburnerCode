/** @param {NS} ns */
export async function main(ns) {
  ns.scriptKill('chargeStanek.js', 'home');
  await ns.sleep(100);
  ns.exec('stanekThread.js', 'home', { preventDuplicates: true });
  const thread = parseInt(ns.read('thread.txt'));
  ns.atExit(() => {
    if (thread >= 1)
      ns.exec('chargeStanek.js', 'home', { preventDuplicates: true, threads: thread });
  });
}
