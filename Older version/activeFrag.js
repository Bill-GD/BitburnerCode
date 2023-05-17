/** @param {NS} ns */
export async function main(ns) {
	try {
		for (let i of ns.stanek.activeFragments()) ns.tprintf(`${i}`);
	} catch (e) {
		ns.alert("Stanek not installed");
	}
}