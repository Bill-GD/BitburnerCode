/** @param {NS} ns */
export async function main(ns) {
  ns.kill(ns.args[0], "home");
  ns.exec(ns.args[0], 'home');
}