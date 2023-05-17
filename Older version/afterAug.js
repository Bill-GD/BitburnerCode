/** @param {NS} ns */
export async function main(ns) {
	const option = ns.flags([
		['noGym', false]
	])
	let homeMoney = () => ns.getServerMoneyAvailable("home")
	let playerHack = () => ns.getHackingLevel()
	let check = file => ns.fileExists(file, "home")
	async function wait(money) {
		let home = homeMoney()
		while (home <= money) {
			await ns.sleep(5000)
			home = homeMoney()
		}
	}
	async function a() {
		ns.run("hq.js", 1, 3)
		await ns.sleep(500)
		ns.run("new_spread.js")
	}
	const programs = ["BruteSSH.exe", "FTPCrack.exe", "relaySMTP.exe", "HTTPWorm.exe", "SQLInject.exe"]
	ns.run("new_hack1.js")
	await wait(2e5)
	if (homeMoney() > 2e5) ns.singularity.purchaseTor()
	await a()
	await wait(5e5)
	if (homeMoney() > 5e5 && !check(programs[0]) && playerHack() >= 55) {
		ns.singularity.purchaseProgram(programs[0])
		await a()
	}
	await wait(15e5)
	if (homeMoney() > 15e5 && !check(programs[1]) && playerHack() >= 110) {
		ns.singularity.purchaseProgram(programs[1])
		await a()
	}
	await wait(5e6)
	if (homeMoney() > 5e6 && !check(programs[2]) && playerHack() >= 320) {
		ns.singularity.purchaseProgram(programs[2])
		await a()
	}
	await wait(3e7)
	if (homeMoney() > 3e7 && !check(programs[3]) && playerHack() >= 430) {
		ns.singularity.purchaseProgram(programs[3])
		await a()
	}
	await wait(25e7)
	if (homeMoney() > 25e7 && !check(programs[4]) && playerHack() >= 745) {
		ns.singularity.purchaseProgram(programs[4])
		await a()
	}
	//ns.run("hq.js", 1, 6)
	let gym = false
	if (option.noGym == false) gym = await ns.prompt("Gym?")
	if (gym == false) option.noGym = true
	if (option.noGym == false) ns.run("gymCtrl.js")
	if (gym == true) ns.run("gymCtrl.js")
}