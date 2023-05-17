/** @param {NS} ns */
export async function main(ns) {
	let options = ['Ram: ' + ns.nFormat(ns.singularity.getUpgradeHomeRamCost(), '$0.0a'), 'Core: ' + ns.nFormat(ns.singularity.getUpgradeHomeCoresCost(), '$0.0a')]
	let choice = await ns.prompt(`Choose an aspect of home server to upgrade:`, { 'type': 'select', 'choices': options })
	switch (choice) {
		case options[0]:
			if (ns.singularity.getUpgradeHomeRamCost() > ns.getServerMoneyAvailable("home")) ns.alert(`You don't have enough money to upgrade RAM\nCost: ` + ns.nFormat(ns.singularity.getUpgradeHomeRamCost(), '$0.0a'))
			else {
				ns.singularity.upgradeHomeRam()
				ns.toast('Upgraded RAM', 'success', 7e3)
			}
			break
		case options[1]:
			if (ns.singularity.getUpgradeHomeCoresCost() > ns.getServerMoneyAvailable("home")) ns.alert(`You don't have enough money to upgrade Core\nCost: ` + ns.nFormat(ns.singularity.getUpgradeHomeCoresCost(), '$0.0a'))
			else {
				ns.singularity.upgradeHomeCores()
				ns.toast('Upgraded Home Core', 'success', 7e3)
			}
			break
	}
}