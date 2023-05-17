/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0]
	switch (target) {
		case '':
			ns.exit()
		case ns.getPlayer().city:
			ns.alert(`(!) You're already at ${target} (!)`)
			ns.exit()
	}
	if (ns.singularity.travelToCity(target)) ns.alert(`(!) You've traveled to ${target} (!)`)
}