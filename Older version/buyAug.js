/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL")
	ns.enableLog("singularity.purchaseAugmentation")
	ns.clearLog()
	ns.tail()
	const sp = ns.singularity

	while (true) {
		let augList = sp.getAugmentationsFromFaction("Slum Snakes")
		let i = 0
		while (i < augList.length) {
			if (checkAug(ns, augList[i]) == true) {
				augList.splice(i, 1)
			}
			else i++
		}
		if (checkFaction(ns, "Sector-12")) augList.push(sp.getAugmentationsFromFaction("Sector-12")[0])
		let a = sp.getAugmentationsFromFaction("Netburners")
		if (checkFaction(ns, "Netburners")) augList.concat(a.splice(1, a.length - 1))
		for (let i = 0; i < augList.length; i++)
			for (let j = 0; j < augList.length - i - 1; j++)
				if (sp.getAugmentationPrice(augList[j]) <= sp.getAugmentationPrice(augList[j + 1])) {
					let tmp = augList[j]
					augList[j] = augList[j + 1]
					augList[j + 1] = tmp
				}
		//ns.tprint(augList)

		while (ns.getServerMoneyAvailable("home") < sp.getAugmentationPrice(augList[augList.length - 1])
			|| sp.getFactionRep("Slum Snakes") < sp.getAugmentationRepReq(augList[augList.length - 1]))
			await ns.sleep(60000)

		for (let aug of augList) {
			if (aug != "NeuroFlux Governor") {
				if (ns.getServerMoneyAvailable("home") > sp.getAugmentationPrice(aug)
					&& sp.getFactionRep("Slum Snakes") > sp.getAugmentationRepReq(aug)
					&& checkAug(ns, sp.getAugmentationPrereq(aug)[0])) {
					let cost = format(ns, sp.getAugmentationPrice(aug))
					if (sp.purchaseAugmentation("Slum Snakes", aug)) {
						ns.print(cost)
						let today = new Date()
						ns.print(today.getHours(), ":", today.getMinutes());
						break
					}
				}
			}
			else if (ns.getServerMoneyAvailable("home") > sp.getAugmentationPrice(aug)
				&& sp.getFactionRep("Sector-12") > sp.getAugmentationRepReq(aug)
				&& checkAug(ns, sp.getAugmentationPrereq(aug)[0])) {
				let cost = format(ns, sp.getAugmentationPrice(aug))
				if (sp.purchaseAugmentation("Sector-12", aug) == true) {
					ns.print(cost)
					let today = new Date()
					ns.print(ns.nFormat(today.getHours(), "00"), ":", ns.nFormat(today.getMinutes(), "00"))
					break
				}
			}
		}
		await ns.sleep(5000)
	}
}
export function checkAug(ns, aug) {
	if (aug == null) return true
	for (let a of ns.singularity.getOwnedAugmentations(true)) {
		if (a == aug) return true
	}
	return false
}
function checkFaction(ns, target) {
	let joined = ns.getPlayer().factions
	for (let f of joined)
		if (f == target) return true
	return false
}