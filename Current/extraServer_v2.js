/** Version 2.1.1
 * Replaced all shortened functions with their full versions
 * Now logs what happens
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  const serverLimit = Math.round(25 * ns.getBitNodeMultipliers().PurchasedServerLimit);
  if (serverLimit === 0) {
    ns.alert('Purchased servers are not available in this BitNode');
    ns.exit();
  }

  const flagOptions = ns.flags([
    ['script', false],
  ]);

  let boughtServers = ns.getPurchasedServers();
  const serverName = 'extraServer-';

  const option = flagOptions.script ? 'purchase' : (await ns.prompt(
    `Owned: ${boughtServers.length}/${serverLimit}\n\n` +
    `Choose:\n` +
    ` 'cost' -> cost for 1 server with specified RAM\n` +
    ` 'purchase' -> buy servers\n` +
    ` 'upgrade' -> upgrade RAM of existing servers\n`,
    { 'type': 'select', 'choices': ['cost', 'purchase', 'upgrade'] }
  ));

  // gets max ram corresponding to the current BN
  const maxRam = 1 << (31 - Math.clz32(Math.round(ns.getBitNodeMultipliers().PurchasedServerMaxRam * Math.pow(2, 20))));
  // gets all possible ram corresponding to the current BN
  const ramChoices = Array(Math.log2(maxRam)).fill().map((v, i) => i + 1).map(r => Math.pow(2, r));

  if (option === '') ns.exit();

  if (option === 'cost') {
    const ramFormatted = ramChoices.map(r => ns.formatRam(r, 2));
    let costReport = '';
    while (1) {
      let ram = ramChoices[
        ramFormatted.indexOf(await ns.prompt(
          costReport + 'Specify RAM for server:',
          { 'type': 'select', 'choices': ramFormatted }
        ))
      ];
      if (ram === '' || !ram) ns.exit();
      costReport = `${ns.formatRam(ram, 2)} RAM -> $${ns.formatNumber(ns.getPurchasedServerCost(ram), 3)}\n\n`;
    }
  }

  if (option === 'upgrade') {
    ns.print('Chosen to upgrade servers');
    if (boughtServers.length === 0) {
      ns.alert(`(!) You own 0 server (!)`);
      ns.exit();
    }

    const upperRamChoices = ramChoices.filter(r => r > Math.min(...(boughtServers.map(server => ns.getServerMaxRam(server)))));

    if (upperRamChoices.length == 0) {
      ns.alert('(!) All servers are at max RAM (!)');
      ns.exit();
    }

    const ramFormatted = upperRamChoices.map(r => ns.formatRam(r, 2));

    const ram = upperRamChoices[ramFormatted.indexOf(await ns.prompt('Specify RAM to upgrade all servers to:', { 'type': 'select', 'choices': ramFormatted }))];
    ns.print('Chosen RAM: ', ns.formatRam(ram, 2));

    let [costToUpgrade, count] = [0, 0];
    boughtServers.forEach(server => {
      if (ram > ns.getServerMaxRam(server)) {
        costToUpgrade += ns.getPurchasedServerUpgradeCost(server, ram);
        count++;
      }
    });

    if (costToUpgrade > ns.getServerMoneyAvailable('home')) {
      ns.alert(`(!) You don't have enough money to upgrade (!)\n Requires $${ns.formatNumber(costToUpgrade, 1)}`);
      ns.exit();
    }

    if (!(await ns.prompt(`Proceed to upgrade ${count} server${count > 1 ? 's' : ''} to ${ns.formatRam(ram, 2)}?`))) ns.exit();
    boughtServers.forEach(server => {
      if (ram > ns.getServerMaxRam(server))
        ns.upgradePurchasedServer(server, ram) && ns.toast(`Upgraded ${server} to ${ns.formatRam(ram, 2)}`, 'success', 3e3);
      ns.print(`Upgraded ${count} server${count > 1 ? 's' : ''} to ${ns.formatRam(ram, 2)}`);
    });
  }

  if (option === 'purchase') {
    ns.print('Chosen to purchase servers');
    if (boughtServers.length >= serverLimit) {
      ns.alert(`(!) Already bought all ${serverLimit} servers (!)`);
      ns.exit();
    }

    const option = ['Buy One', 'Buy n', 'Buy Max'];
    const choice = flagOptions.script ? 'Buy Max' : (await ns.prompt(`Owned: ${boughtServers.length}/${serverLimit}\nChoose purchase quantity:`, { 'type': 'select', 'choices': option }));
    if (!choice) ns.exit();
    ns.print(`Choice: '${choice}'`);

    const ramFormatted = ramChoices.map(r => ns.formatRam(r, 2));
    const ramChoice = flagOptions.script ? ramChoices.slice(-1)[0] : ramChoices[ramFormatted.indexOf(await ns.prompt('Choose RAM for server:', { 'type': 'select', 'choices': ramFormatted }))];
    if (!ramChoice) ns.exit();
    ns.print(`Chosen RAM: ${ns.formatRam(ramChoice, 2)}`);

    switch (choice) {
      case option[0]:
        if (ns.getServerMoneyAvailable('home') > ns.getPurchasedServerCost(ramChoice)) {
          ns.purchaseServer(serverName + boughtServers.length, ramChoice);
          ns.print(`Bought 1 server with ${ns.formatRam(ramChoice, 2)} RAM`);
        }
        else {
          ns.alert(`(!) You don't have enough money to purchase (!)\nRequires $${ns.formatNumber(ns.getPurchasedServerCost(ramChoice), 3)}`);
          ns.exit();
        }
        break;
      case option[1]:
        let number = 'a';
        let inErr = '';
        do {
          number = await ns.prompt(inErr +
            `Specify the number of server:\n(Available: ${serverCount})`,
            { 'type': 'text' }
          );

          if (!number) ns.exit();
          if (isNaN(parseInt(number))) inErr = `Invalid input\n\n`;
        } while (isNaN(parseInt(number)));

        number = parseInt(number);

        if (number > serverCount) {
          ns.alert(`(!) ERROR: Exceeded Server Limit of ${serverLimit} (!)`);
          ns.exit();
        }

        if (ns.getPurchasedServerCost(ramChoice) * number > ns.getServerMoneyAvailable('home')) {
          ns.alert(`(!) You don't have enough money to purchase (!)\nCost: $${ns.formatNumber(ns.getPurchasedServerCost(ramChoice) * number, 3)}`);
          ns.exit();
        }

        if (await ns.prompt(`Proceed to buy ${number} server${number > 1 ? 's' : ''}?\nCost: $${ns.formatNumber(ns.getPurchasedServerCost(ramChoice) * number, 3)}`)) {
          for (let i = boughtServers.length; i < boughtServers.length + number; i++)
            ns.purchaseServer(serverName + i, ramChoice);
          ns.print(`Bought ${number} server${number > 1 ? 's' : ''} with ${ns.formatRam(ramChoice, 2)} RAM`);
        }
        else ns.exit();
        break;
      case option[2]:
        const serverCount = serverLimit - boughtServers.length;
        const cost = ns.getPurchasedServerCost(ramChoice) * (serverCount);
        if (flagOptions.script) {
          let count = 0;
          for (let i = boughtServers.length; i < serverLimit; i++)
            if (ns.purchaseServer(serverName + i, ramChoice) !== '') ++count;
          ns.print(`Bought ${count} server${count > 1 ? 's' : ''} with ${ns.formatRam(ramChoice, 2)} RAM`);
        }
        else {
          if ((await ns.prompt(`Proceed to buy ${serverCount} server${serverCount > 1 ? 's' : ''}?\nCost: $${ns.formatNumber(cost, 3)}`))) {
            if (cost > ns.getServerMoneyAvailable('home')) {
              ns.alert(`(!) You don't have enough money to purchase (!)`);
              ns.exit();
            }
            for (let i = boughtServers.length; i < serverLimit; i++)
              ns.purchaseServer(serverName + i, ramChoice);
            ns.print(`Bought ${serverCount} server${serverCount > 1 ? 's' : ''} with ${ns.formatRam(ramChoice, 2)} RAM`);
          }
          else ns.exit();
        }
        break;
    }
  }

  const before = boughtServers.length;
  boughtServers = ns.getPurchasedServers();
  let count = boughtServers.length - before;

  ns.toast(`Bought ${count} server${count > 1 ? 's' : ''}`, 'info', 10e3);
}