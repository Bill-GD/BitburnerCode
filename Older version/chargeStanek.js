/** @param {NS} ns */
export async function main(ns) {
	try {
		while (true) {
			let active = ns.stanek.activeFragments()
			if (active.length == 0) ns.exit()
			for (let i of active) if (i.type != 18) await ns.stanek.chargeFragment(i.x, i.y)
			await ns.sleep(10)
		}
	} catch (e) {
		ns.alert("Stanek not installed");
	}
}