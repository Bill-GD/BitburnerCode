/** Version 2.0.2
 * Added support for Hacknet servers
 */
/** @param {NS} ns */
export async function main(ns) {
    const serverLimit = Math.round(25 * ns.getBitNodeMultipliers().PurchasedServerLimit);
    if (serverLimit === 0) {
        ns.alert('Purchased servers are not available in this BitNode');
        ns.exit();
    }

    const playerMoney = () => ns.getServerMoneyAvailable('home');
    const maxRamOf = server => ns.getServerMaxRam(server);
    const serverCost = ram => ns.getPurchasedServerCost(ram);
    const purchase = (name, ram) => ns.purchaseServer(name, ram);
    const upgradeCost = (server, ram) => ns.getPurchasedServerUpgradeCost(server, ram);
    const upgrade = (server, ram) => ns.upgradePurchasedServer(server, ram);

    let boughtServers = ns.getPurchasedServers();
    const serverName = 'extraServer-';

    const option = await ns.prompt(
        `Choose:\n` +
        ` 'cost' -> cost for 1 server with specified RAM\n` +
        ` 'purchase' -> buy servers\n` +
        ` 'upgrade' -> upgrade RAM of existing servers\n`,
        { 'type': 'select', 'choices': ['cost', 'purchase', 'upgrade'] }
    );

    // gets max ram corresponding to the current BN
    const maxRam = 1 << (31 - Math.clz32(Math.round(ns.getBitNodeMultipliers().PurchasedServerMaxRam * Math.pow(2, 20))));
    // gets all possible ram corresponding to the current BN
    const ramChoices = Array(Math.log2(maxRam)).fill().map((v, i) => i + 1).map(r => Math.pow(2, r));

    if (option === '') ns.exit();

    if (option === 'cost') {
        const ramFormatted = ramChoices.map(r => ns.formatRam(r, 2));

        let ram = ramChoices[
            ramFormatted.indexOf(await ns.prompt(
                'Specify RAM for server:',
                { 'type': 'select', 'choices': ramFormatted }
            ))
        ];
        if (ram === '' || !ram) ns.exit();
        ns.alert(`(!) $${ns.formatNumber(serverCost(ram), 3)} for 1 server with ${ns.formatRam(ram, 2)} RAM`);
        ns.exit();
    }

    if (option === 'upgrade') {
        if (boughtServers.length == 0) {
            ns.alert(`(!) You own 0 server (!)`);
            ns.exit();
        }

        const upperRamChoices = ramChoices.filter(r => r > Math.min(...(boughtServers.map(server => maxRamOf(server)))));

        if (upperRamChoices.length == 0) {
            ns.alert('(!) All servers are at max RAM (!)');
            ns.exit();
        }

        const ram = await ns.prompt('Specify RAM to upgrade all servers to:', { 'type': 'select', 'choices': upperRamChoices });
        let costToUpgrade = 0, count = 0;
        boughtServers.forEach(server => {
            if (ram > maxRamOf(server)) {
                costToUpgrade += upgradeCost(server, ram);
                count++;
            }
        });

        if (costToUpgrade > playerMoney()) {
            ns.alert(`(!) You don't have enough money to upgrade (!)\n Requires $${ns.formatNumber(costToUpgrade, 1)}`);
            ns.exit();
        }

        if (!(await ns.prompt(`Proceed to upgrade ${count} server to ${ns.formatRam(ram, 2)}?`))) ns.exit();
        boughtServers.forEach(server => {
            if (ram > maxRamOf(server))
                upgrade(server, ram) && ns.toast(`Upgraded ${server} to ${ns.formatRam(ram)}`, 'success', 5e3);
        });
    }

    if (option === 'purchase') {
        if (boughtServers.length >= serverLimit) {
            ns.alert(`(!) Already bought all ${serverLimit} servers (!)`);
            ns.exit();
        }

        const option = ['Buy One', 'Buy n', 'Buy Max'];
        const choice = await ns.prompt(`Amount allowed in this BitNode: ${serverLimit}\nChoose purchase quantity:`, { 'type': 'select', 'choices': option });
        const ramChoice = await ns.prompt('Choose RAM for server:', { 'type': 'select', 'choices': ramChoices });

        switch (choice) {
            case option[0]:
                if (playerMoney() > serverCost(ramChoice))
                    purchase(serverName + boughtServers.length, ramChoice);
                else {
                    ns.alert(`(!) You don't have enough money to purchase (!)\nRequires $${ns.formatNumber(serverCost(ramChoice), 3)}`);
                    ns.exit();
                }
                break;
            case option[1]:
                const number = parseInt(await ns.prompt(
                    `Specify the number of server:\n(Available: ${serverLimit - boughtServers.length})`,
                    { 'type': 'text' }
                ));

                if (isNaN(number)) {
                    ns.alert(`Invalid input`);
                    ns.exit();
                }

                if (number > serverLimit - boughtServers.length) {
                    ns.alert(`(!) ERROR: Exceeded Server Limit of ${serverLimit} (!)`);
                    ns.exit();
                }

                if (serverCost(ramChoice) * number > playerMoney()) {
                    ns.alert(`(!) You don't have enough money to purchase (!)\nCost: $${ns.formatNumber(serverCost(ramChoice) * number, 3)}`);
                    ns.exit();
                }

                if (await ns.prompt(`Proceed to buy ${number} server(s)?\nCost: $${ns.formatNumber(serverCost(ramChoice) * number, 3)}`))
                    for (let i = boughtServers.length; i < boughtServers.length + number; i++)
                        purchase(serverName + i, ramChoice);
                else ns.exit();
                break;
            case option[2]:
                const cost = serverCost(ramChoice) * (serverLimit - boughtServers.length);
                if (await ns.prompt(`Proceed to buy ${serverLimit - boughtServers.length} server(s)?\nCost: $${ns.formatNumber(cost, 3)}`)) {
                    if (cost > playerMoney()) {
                        ns.alert(`(!) You don't have enough money to purchase (!)`);
                        ns.exit();
                    }
                    for (let i = boughtServers.length; i < serverLimit; i++)
                        purchase(serverName + i, ramChoice);
                }
                else ns.exit();
                break;
        }
    }

    const before = boughtServers.length;
    boughtServers = ns.getPurchasedServers();
    let count = boughtServers.length - before;

    ns.toast(`Bought ${count} server(s)`, 'info', 10e3);

    const files = ['hackScript.js', 'weaken.js', 'grow.js', 'hack.js'];
    for (const server of boughtServers) await handleServer(server);
    // for (let i = 0; i < eval('ns.hacknet').numNodes(); i++) await handleServer('hacknet-server-' + i);
    
    async function handleServer(server) {
        ns.killall(server, true);
        ns.scp(files, server, 'home');
        ns.toast(`Copied to ${server}`, 'success', 10e3);
        await ns.sleep(Math.round(Math.random() * 1e3));
        ns.exec('hackScript.js', server, 1, 'hackFromPurchased');
    }
}