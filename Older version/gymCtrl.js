/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL")
	ns.clearLog()
	ns.tail()
	let num = ns.args[0] == null ? 4 : ns.args[0]
	for (let i = 0; i < num; i++) {
		ns.run("gym.js")
		ns.printf(' Cycle: %d / %d', Math.trunc(i / 4) + 1, Math.ceil(num / 4))
		ns.printf(' Turn: %d / %d', (i % 4) + 1, num > 4 ? 4 : num)
		await ns.sleep(180e3)
		ns.clearLog()
	}
	ns.kill("gym.js", "home")
	ns.singularity.stopAction()
	await ns.sleep(500)
	ns.run("blade.js")
}