//	v2: revamped + added more
/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog("ALL")
	const hook0 = document.getElementById('overview-extra-hook-0')
	const hook1 = document.getElementById('overview-extra-hook-1')
	const hook2 = document.getElementById('overview-extra-hook-2')
	const hookHP = document.getElementById('overview-hp-hook')
	const hookC = document.getElementById('overview-money-hook')
	const hookH = document.getElementById('overview-hack-hook')
	const hookStr = document.getElementById('overview-str-hook')
	const hookDef = document.getElementById('overview-def-hook')
	const hookDex = document.getElementById('overview-dex-hook')
	const hookAgi = document.getElementById('overview-agi-hook')
	const hookCha = document.getElementById('overview-cha-hook')
	const hookInt = document.getElementById('overview-int-hook');

	ns.atExit(() => {
		hook0.innerHTML = " ";
		hook1.innerHTML = " ";
		hook2.innerHTML = " ";
		hookHP.innerHTML = " ";
		hookC.innerHTML = " ";
		hookH.innerHTML = " ";
		hookStr.innerHTML = " ";
		hookDef.innerHTML = " ";
		hookDex.innerHTML = " ";
		hookAgi.innerHTML = " ";
		hookCha.innerHTML = " ";
		hookInt.innerHTML = " ";
	})

	let theme = ns.ui.getTheme()
	let buttonTextColor = theme.warning
	let buttonBG = theme.backgroundsecondary

	let buttonExit = document.createElement("button")
	let end = false
	buttonExit.innerHTML = "Delete HUD"
	buttonExit.style.color = buttonTextColor
	buttonExit.style.backgroundColor = buttonBG
	buttonExit.onclick = function () { end = true }

	let buttonRestart = document.createElement("button");
	let restart = false
	buttonRestart.innerHTML = "Restart HUD"
	buttonRestart.style.color = buttonTextColor
	buttonRestart.style.backgroundColor = buttonBG
	buttonRestart.onclick = function () { restart = true }

	let buttonUpRam = document.createElement("button")
	let homeUp = false
	buttonUpRam.innerHTML = "Upgrade"
	buttonUpRam.style.color = theme.int
	buttonUpRam.style.backgroundColor = buttonBG
	buttonUpRam.onclick = function () { homeUp = true }

	let buttonCrime = document.createElement("button")
	let doCrime = false;
	buttonCrime.innerHTML = "Crime";
	buttonCrime.style.color = theme.hp;
	buttonCrime.style.backgroundColor = buttonBG;
	buttonCrime.onclick = function () { doCrime = true }

	let buttonServer = document.createElement("button");
	buttonServer.innerHTML = "Manage";
	buttonServer.style.color = theme.combat;
	buttonServer.style.backgroundColor = buttonBG;
	// buttonServer.onclick = async function () {
	// 	ns.printf(' > Manage: Purchased Servers Management');
	// 	let choices = ['help', 'cost', 'purchase', 'upgrade'];
	// 	let choice = await ns.prompt('Choose managing option:', { 'type': 'select', 'choices': choices });
	// 	ns.exec('extra_sv.js', 'home', 1, '--' + choice);
	// };

	let buttonTravel = document.createElement("button");
	let travelB = false;
	buttonTravel.innerHTML = "Travel";
	buttonTravel.style.color = theme.combat;
	buttonTravel.style.backgroundColor = buttonBG;
	buttonTravel.onclick = function () { travelB = true }

	let buttonStock = document.createElement("button")
	let stockB = false
	buttonStock.innerHTML = "Stock"
	buttonStock.style.color = theme.combat
	buttonStock.style.backgroundColor = buttonBG
	buttonStock.onclick = function () { stockB = true }

	let hackDif = document.createElement("input"); hackDif.type = "checkbox"
	let entropy = document.createElement("input"); entropy.type = "checkbox"
	let player = document.createElement("input"); player.type = "checkbox"
	let gang = document.createElement("input"); gang.type = "checkbox"
	let income = document.createElement("input"); income.type = "checkbox"
	let boughtSV = document.createElement("input"); boughtSV.type = "checkbox"
	let usedRam = document.createElement("input"); usedRam.type = "checkbox"
	let bladeSP = document.createElement("input"); bladeSP.type = "checkbox"
	let blade = document.createElement("input"); blade.type = "checkbox"

	hookHP.append("\xa0Gang", gang)
	hookC.append("\xa0Gain", income, "\xa0Blade", blade)
	hookStr.append('\xa0Player', player, '\xa0', buttonStock)
	hookDef.append(buttonTravel/*, '\xa0', buttonRun*/);
	hookDex.append("\xa0Entropy", entropy)
	hookAgi.append("\xa0Server", boughtSV, '\xa0', buttonServer)
	hookCha.append("\xa0worldDaemon", hackDif)
	hookInt.append("\xa0Ram", usedRam)
	//hookInt.append("\xa0SPoints", bladeSP)

	hookHP.append('\xa0', buttonCrime)
	hook2.append(buttonRestart)
	hook2.append(buttonExit)
	hookInt.append('\xa0', buttonUpRam)

	while (true) {
		try {
			let header = []
			let value = []

			header.push('BitNode')
			value.push(ns.getPlayer().bitNodeN)
			//	gang
			if (gang.checked) {
				//ns.printf(' > Toggled Gang: On')
				if (ns.gang.inGang()) {
					let g = ns.gang
					header.push('Member')
					value.push(g.getMemberNames().length + ' / 12')
					header.push('Territory')
					value.push(ns.formatPercent(g.getGangInformation().territory, 2))
					header.push('Power')
					value.push(ns.formatPercent(g.getGangInformation().power, 2))
					header.push('Low Chance')
					value.push(gangWinChance(ns))
					header.push("Income")
					value.push(ns.formatNumber(ns.gang.getGangInformation().moneyGainRate, 2) + '/s')
					header.push("Bonus")
					if (g.getBonusTime() > 2e3) value.push(ns.tFormat(g.getBonusTime()))
					else value.push("OFF")
				}
				else {
					header.push("Own Gang")
					value.push("false")
				}
			}
			//	All income
			//header.push("Income")
			if (income.checked) {
				let hacknet_a = 0
				for (let i = 0; i < ns.hacknet.numNodes(); i++) {
					hacknet_a += ns.hacknet.getNodeStats(i).production;
				}
				header.push("Hacknet")
				value.push(`$${ns.formatNumber(hacknet_a / 4 * 1e6, 2)}/s`);
				header.push("Script")
				value.push(`$${ns.formatNumber(ns.getTotalScriptIncome()[1], 2)}/s`)
				//header.push("Work")
				//value.push(ns.nFormat(ns.singularity.getCurrentWork(). - ns.singularity.getCurrentWork()., '$0[.]0a') + '/s')
				header.push("Hack")
				value.push(ns.formatNumber(ns.getTotalScriptExpGain(), 2) + 'XP/s')
			}
			if (blade.checked) {
				if (ns.bladeburner.inBladeburner()) {
					header.push("Skill")
					value.push(ns.formatNumber(ns.bladeburner.getSkillPoints(), 1))
					header.push('Rank')
					value.push(ns.formatNumber(ns.bladeburner.getRank(), 1))
					header.push("Bonus")
					if (ns.bladeburner.getBonusTime() > 3e3) value.push(ns.tFormat(ns.bladeburner.getBonusTime()))
					else value.push("OFF")
				}
				else {
					header.push("In Blade")
					value.push("false")
				}
			}
			if (player.checked) {
				header.push('Aug')
				value.push(ns.singularity.getOwnedAugmentations().length)
				header.push("Karma")
				value.push(ns.formatNumber(ns.heart.break(), 1));
				header.push("Kills")
				value.push(ns.formatNumber(ns.getPlayer().numPeopleKilled, 0));
				header.push("4S Tix")
				value.push(ns.stock.has4SDataTIXAPI())
				header.push("4S Data")
				value.push(ns.stock.has4SData())

			}
			//	Entropy
			if (entropy.checked) {
				header.push("Entropy")
				value.push(ns.getPlayer().entropy)
				header.push("Mults")
				value.push(ns.formatPercent(0.98 ** ns.getPlayer().entropy, 2))
			}
			/*
			*/
			//	Server
			if (boughtSV.checked) {
				header.push("Server")
				value.push(ns.getPurchasedServers().length + ' / ' + 25 * ns.getBitNodeMultipliers().PurchasedServerLimit)
			}
			//	BitNode
			if (hackDif.checked) {
				header.push("Need: " + ns.formatNumber(ns.getBitNodeMultipliers().WorldDaemonDifficulty * 3e3, 1))
				let a = ns.getHackingLevel() / (ns.getBitNodeMultipliers().WorldDaemonDifficulty * 3e3)
				a = a > 1 ? 1 : a
				value.push(ns.formatPercent(a, 2))
			}
			//	Ram
			if (usedRam.checked) {
				header.push('Total')
				value.push(ns.formatRam(ns.getServerUsedRam('home'), 1) + '/' + ns.formatRam(ns.getServerMaxRam('home'), 1))
				let str = 'Used'
				header.push(str)
				value.push(ns.formatPercent(ns.getServerUsedRam("home") / ns.getServerMaxRam("home"), 1))
			}
			hook0.innerText = header.join("\t\n")
			hook1.innerText = value.join("\n")

			if (end) ns.exit()
			if (restart) {
				ns.run("restart.js", 1, "hud_extra.js")
			}
			if (homeUp) {
				ns.printf(' > Upgrade: Home Server Upgrades')
				ns.exec('homeUpgrade.js', 'home')
				homeUp = false
			}
			if (doCrime) {
				ns.printf(' > Crime: Automatically Commit Homicide')
				ns.exec('autoCrime.js', 'home', 1, 'homi')
				// ns.exec('crime.js', 'home')
				doCrime = false
			}
			if (travelB) {
				ns.printf(' > Travel: Travel without Map')
				let cities = ["Sector-12", "Aevum", "Volhaven", "Chongqing", "New Tokyo", "Ishima"]
				ns.exec('travel.js', 'home', 1, await ns.prompt(`You're currently at: ${ns.getPlayer().city}\nChoose a destination:\n`, { 'type': "select", 'choices': cities }))
				travelB = false
			}
			if (stockB) {
				ns.printf(' > Stock: Start/Upgrade Stock Trading')
				ns.exec('stockControl.js', 'home')
				stockB = false
			}

		} catch (err) {
			ns.print("Encounter Error: " + String(err))
		}
		//	interval / responsiveness
		await ns.sleep(100);
	}
}
function gangWinChance(ns) {
	let g = ns.gang
	let o = g.getOtherGangInformation()
	let c = []
	for (let i in o) {
		if (o[i].territory > 0 && i != 'Slum Snakes')
			c.push(g.getGangInformation().power / (g.getGangInformation().power + o[i].power))
	}
	if (c.length == 0) return 'OFF'
	for (let i in c) {
		for (let j = 0; j < c.length - i - 1; j++) {
			if (c[j] > c[j + 1]) {
				let t = c[j]
				c[j] = c[j + 1]
				c[j + 1] = t
			}
		}
	}
	return ns.formatPercent(c[0], 1)
}