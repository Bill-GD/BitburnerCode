/** @param {NS} ns **/

export async function main(ns) {
	class server {
		constructor(name, parent) {
			this.name = name;
			this.parent = parent;
		}
	}
	let list = {}
	let sv = []

	function scanList(current, parent) {
		let obj = new server(current, parent);
		list[current] = obj;

		let svScan = ns.scan(current);

		for (let i in svScan) {
			if (svScan[i] != parent)
				sv.push(svScan[i]);
		}
		for (let i in svScan) {
			if (svScan[i] != parent) {
				let host = svScan[i];
				scanList(host, current);
			}
		}
	}

	scanList("home", "home");
	ns.tprintf("[%s]", sv);
	ns.tprintf("%d servers", sv.length);
}