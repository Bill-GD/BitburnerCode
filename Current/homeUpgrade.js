/** @param {NS} ns */
export async function main(ns) {
	const sg = ns.singularity;
	let options = [
		`Ram: ${ns.formatNumber(sg.getUpgradeHomeRamCost(), 1)} | ${ns.formatRam(ns.getServer('home').maxRam, 2)} -> ${ns.formatRam(ns.getServer('home').maxRam * 2, 2)}`,
		`Core: ${ns.formatNumber(sg.getUpgradeHomeCoresCost(), 1)} | ${ns.getServer('home').cpuCores} -> ${ns.getServer('home').cpuCores * 2}`
	];
	let choice = await ns.prompt(`Choose an aspect of home server to upgrade:`, { 'type': 'select', 'choices': options });
	switch (choice) {
		case options[0]:
			if (sg.getUpgradeHomeRamCost() > ns.getServerMoneyAvailable("home"))
				ns.alert(`Insufficient money to upgrade RAM\nCost: ${ns.formatNumber(sg.getUpgradeHomeRamCost(), 1)}`);
			else {
				sg.upgradeHomeRam();
				ns.toast('Upgraded RAM', 'success', 7e3);
			}
			break;
		case options[1]:
			if (sg.getUpgradeHomeCoresCost() > ns.getServerMoneyAvailable("home"))
				ns.alert(`Insufficient money to upgrade Core\nCost: ${ns.formatNumber(sg.getUpgradeHomeCoresCost(), 1)}`);
			else {
				sg.upgradeHomeCores();
				ns.toast('Upgraded Home Core', 'success', 7e3);
			}
			break;
	}
}