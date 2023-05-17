/** @param {NS} ns */
export async function main(ns) {
	let g = ns.gang
	if (g.getGangInformation().territory == 1) {
		ns.alert(`Territory is already at 100%`)
		ns.exit()
	}
	let cf = await ns.prompt(`(!) Please make sure that you WON'T lose territory after running this (!)\n\t\tIf you're sure, press YES, if not, press NO`)
	if (!cf) ns.exit()
	ns.kill('gang.js', 'home')

	for (let mem of g.getMemberNames()) {
		g.setMemberTask(mem, 'Territory Warfare')
	}
	while (gangWinChance(ns) < 0.97) await ns.sleep(1e4)
	g.setTerritoryWarfare(true)

	while (g.getGangInformation().territory < 0.998) await ns.sleep(1e4)
	g.setTerritoryWarfare(false)
	ns.run('gang.js')
}
function gangWinChance(ns) {
	let g = ns.gang
	let o = g.getOtherGangInformation()
	let c = []
	for (let i in o) {
		if (o[i].territory > 0 && i != 'Slum Snakes')
			c.push(g.getGangInformation().power / (g.getGangInformation().power + o[i].power))
	}
	for (let i in c)
		for (let j = 0; j < c.length - i - 1; j++)
			if (c[j] > c[j + 1]) {
				let t = c[j]
				c[j] = c[j + 1]
				c[j + 1] = t
			}
	return c[0]
}