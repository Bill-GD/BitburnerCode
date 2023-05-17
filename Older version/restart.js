/** @param {NS} ns */
export async function main(ns) {
	const flag = ns.flags([
		['repeat', 1],
	]);
	for (let i = 0; i < flag.repeat; i++) {
		ns.kill(ns.args[0], "home");
		//ns.tprint("Restarting '", ns.args[0], "'...");
		ns.run(ns.args[0]);
		await ns.sleep(100)
	}
}