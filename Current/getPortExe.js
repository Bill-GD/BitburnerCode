/** @param {NS} ns */
export async function main(ns) {
  const portExe = ['BruteSSH.exe', 'FTPCrack.exe', 'RelaySMTP.exe', 'HTTPWorm.exe', 'SQLInject.exe'];

  if (ns.singularity.purchaseTor()) {
    portExe.forEach(program => {
      const cost = ns.singularity.getDarkwebProgramCost(program);
      if (cost > 0 && cost < ns.getServerMoneyAvailable('home'))
        ns.singularity.purchaseProgram(program) ? ns.tprintf(` > ${program} - Purchased`) : 0;
    });
  }
}