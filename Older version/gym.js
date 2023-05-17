/** @param {NS} ns */
export async function main(ns) {
	const sp = ns.singularity
	let player = ns.getPlayer()
	if (ns.isRunning("blade.js", "home")) ns.kill("blade.js", "home")

	let stats = {
		strength: player.strength,
		defense: player.defense,
		dexterity: player.dexterity,
		agility: player.agility
	}
	let arr = []
	for (let i in stats) {
		arr.push([i, stats[i]])
	}
	for (let i in arr) {
		for (let j = 0; j < arr.length - i - 1; j++) {
			if (arr[j][1] >= arr[j + 1][1]) {
				let tmp = arr[j];
				arr[j] = arr[j + 1];
				arr[j + 1] = tmp;
			}
		}
	}
	let focus = true
	let city = player.city
	if (city != "Sector-12") sp.travelToCity("Sector-12")
	if (checkAug(ns, "Neuroreceptor Management Implant")) focus = false
	sp.gymWorkout("powerhouse gym", ns.args[0] == null ? arr[0][0] : ns.args[0], focus)
	sp.travelToCity(city)
}
function checkAug(ns, aug) {
	if (aug == null) return true
	for (let a of ns.singularity.getOwnedAugmentations()) {
		if (a == aug) return true
	}
	return false
}