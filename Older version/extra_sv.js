/** @param {NS} ns */
export async function main(ns) {
	let options = ns.flags([
		['help', false],
		['cost', false],
		['purchase', false],
		['upgrade', false]
	])
	const playerMoney = () => ns.getServerMoneyAvailable('home')
	const svCost = r => ns.getPurchasedServerCost(r)
	const svRam = sv => ns.getServerMaxRam(sv)
	let boughtList = ns.getPurchasedServers()
	let boughtCount = boughtList.length;
	let ram = 0

	if (options.help) {
		let help = `Choose:
 > help: view this help menu
 > cost: view cost for 1 server with specified RAM
 > purchase: buy server
 > upgrade: upgrade RAM of existing servers`
		ns.tprintf(`Hacknet Server Help Menu:\n` + help)
		ns.alert(help)
		ns.exit()
	}
	if (options.cost) {
		let ramChoices = []
		for (let i = 1; i <= 20 + Math.log2(ns.getBitNodeMultipliers().PurchasedServerMaxRam); i++) {
			ramChoices.push(2 ** i)
		}
		let ram = await ns.prompt('Specify RAM for server (GB):', { 'type': 'select', 'choices': ramChoices })
		if (ram != '') {
			let costPer = svCost(ram)
			ns.tprintf(`(!) $${ns.formatNumber(costPer, 1)} for 1 server with ${ns.formatRam(ram, 1)} RAM`);
			ns.alert(`(!) $${ns.formatNumber(costPer, 1)} for 1 server with ${ns.formatRam(ram, 1)} RAM`);
		}
		ns.exit();
	}
	if (options.upgrade) {
		if (boughtCount == 0) {
			ns.alert(`(!) You own 0 server (!)`)
			ns.exit()
		}
		let ramChoices = []
		for (let i = 1; i <= 20 + Math.log2(ns.getBitNodeMultipliers().PurchasedServerMaxRam); i++) {
			if (2 ** i > svRam(boughtList[0])) ramChoices.push(2 ** i)
		}
		if (ramChoices.length == 0) {
			ns.alert('(!) All servers are at max RAM (!)')
			ns.exit()
		}
		else {
			ram = await ns.prompt('Specify RAM to upgrade (GB):', { 'type': 'select', 'choices': ramChoices })
			let costToUp = svCost(ram) * boughtCount
			if (costToUp > playerMoney()) {
				ns.alert(`(!) You don't have enough money to upgrade (!)\n    Requires $${ns.formatNumber(costToUp, 1)}`)
				ns.exit()
			}
			let count = 0
			for (let sv of boughtList) {
				if (svRam(sv) < ram) count++
			}
			if (await ns.prompt(`Proceed to upgrade ${count} server to ${ns.formatRam(ram, 1)}?`)) {
				for (let sv of boughtList) {
					if (svRam(sv) < ram) ns.deleteServer(sv)
				}
				options.purchase = true
			}
			else ns.exit()
		}
	}
	if (options.purchase) {
		let svLimit = 25 * ns.getBitNodeMultipliers().PurchasedServerLimit
		if (options.upgrade) {
			for (let i = 0; i < boughtCount - 1; i++) {
				if (!ns.serverExists('extra_' + i)) ns.purchaseServer('extra_' + i, ram)
			}
		}
		else {
			if (boughtCount == svLimit) {
				ns.alert(`(!) Already bought all ${svLimit} servers (!)`)
				ns.exit()
			}
			let option = []
			for (let i = 1; i <= 20 + Math.log2(ns.getBitNodeMultipliers().PurchasedServerMaxRam); i++) {
				option.push(2 ** i)
			}
			let ramChoice = await ns.prompt('Choose RAM for server:', { 'type': 'select', 'choices': option })
			option = ['Buy One', 'Buy n', 'Buy Max']
			let choice = await ns.prompt('Choose purchase quantity:', { 'type': 'select', 'choices': option })
			switch (choice) {
				case option[0]:
					if (playerMoney() > svCost(ramChoice))
						ns.purchaseServer('extra_' + boughtCount, ramChoice)
					else {
						ns.alert(`(!) You don't have enough money to purchase (!)`)
						ns.exit()
					}
					break
				case option[1]:
					let n = await ns.prompt(`Specify number of server:\n(Available: ${svLimit - boughtCount})`, { 'type': 'text' })
					n = parseInt(n)
					if (n > svLimit - boughtCount) {
						ns.alert(`(!) ERROR: Exceeded Server Limit of ${svLimit} (!)`)
						ns.exit()
					}
					if (svCost(ramChoice) * n > playerMoney()) {
						ns.alert(`(!) You don't have enough money to purchase (!)\nCost: $${ns.formatNumber(svCost(ramChoice) * n, 1)}`)
						ns.exit()
					}
					if (await ns.prompt(`Buying ${n} server(s) with the cost of $${ns.formatNumber(svCost(ramChoice) * n, 1)}\nContinue?`))
						for (let i = boughtCount; i < boughtCount + n; i++) {
							ns.purchaseServer('extra_' + i, ramChoice)
							//ns.tprint(i)
						}
					else ns.exit()
					break
				case option[2]:
					let cost = svCost(ramChoice) * (svLimit - boughtCount)
					if (await ns.prompt(`Buying ${svLimit - boughtCount} server(s) with the cost of $${ns.formatNumber(cost, 1)}\n\t\tContinue?`)) {
						if (cost > playerMoney()) {
							ns.alert(`(!) You don't have enough money to purchase (!)`)
							ns.exit()
						}
						for (let i = boughtCount; i < svLimit; i++) {
							ns.purchaseServer('extra_' + i, ramChoice)
						}
					}
					else ns.exit()
					break
			}
		}
	}

	boughtList = ns.getPurchasedServers()
	let count = boughtList.length - boughtCount
	if (count > 0) ns.tprintf("\n (!) Bought %d server(s)", count)
	else ns.exit()

	for (let sv of boughtList) {
		if (ns.getServerUsedRam(sv) == 0) {
			let fileList = ["new_hack1.js", "new_hack2.js", "new_hack3.js", "n_hack.js", "n_weak.js", "n_grow.js"]
			ns.scp(fileList, sv, 'home')
			await ns.sleep(Math.random() * 500 + 750)
			ns.exec("new_hack.js", sv);
		}
	}
}