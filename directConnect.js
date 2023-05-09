export function autocomplete(data) {
    return [...data.servers];
}

/** @param {NS} ns **/
export async function main(ns) {
    class Server {
        constructor(name, parent) {
            this.name = name;
            this.parent = parent;
        }
    }

    let list = {};
    let path = [];
    function search(current = "home", parent = "home", target = null) {
        if (target === null) return;

        let obj = new Server(current, parent);
        list[current] = obj;

        let directServers = ns.scan(current);

        for (let s of directServers) {
            if (s === parent)
                continue;
            let childServer = s;

            if (childServer.toLowerCase() == target.toLowerCase()) {
                let svParent = obj;

                while (svParent.name != "home") {
                    path.unshift(svParent.name);
                    svParent = list[svParent.parent];
                }
                path.push(target);
            }
            search(childServer, current, target);
        }
    }

    let target = ns.args[0];
    if (ns.getServer(target).backdoorInstalled)
        ns.singularity.connect(target);

    search('home', 'home', target);

    path.forEach((server) => { ns.singularity.connect(server); });
}