/** Version 3.0.1
 * Rebalance the territory log conditions, warfare requirements
 * Some code cleanup
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

  // use this continuously is extremely laggy
  // should only be used outside of loops (setups...)
  // this is also really limited
  // https://github.com/bitburner-official/bitburner-src/blob/dev/src/SaveObject.ts#L89
  const getSave = () => JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data;
  const playerData = () => JSON.parse(getSave().PlayerSave).data;

  const pData = playerData();

  // const karmaReq = ns.getResetInfo().currentNode == 2 ? -9 : -54000;
  const karmaReq = pData.bitNodeN == 2 ? -9 : -54000;
  if (ns.heart.break() > karmaReq) {
    ns.print(`Karma is not low enough. Waiting until karma reaches ${karmaReq}`);
    ns.setTitle('Waiting for karma');
    ns.resizeTail(320, 85);
  }
  while (ns.heart.break() > karmaReq) await ns.sleep(10e3);
  ns.setTitle('gang_v3.js');

  const colors = {
    section: getColor(ns.ui.getTheme().money),
    header: getColor(ns.ui.getTheme().hp),
    value: getColor(ns.ui.getTheme().white),
  };

  if (!pData.gang) {
    ns.singularity.joinFaction('Slum Snakes');
    if (ns.gang.createGang('Slum Snakes'))
      ns.alert('Created a new gang with Slum Snakes');
    else {
      ns.alert('Failed to create a new gang');
      ns.exit();
    }
  }

  /** The amount of money allowed to spend on gang equipment.
   ** Higher -> profit faster (& slower in general if use stock as well)
   */
  const getMoney = () => ns.getServerMoneyAvailable('home') * 0.25;

  let headlines = [];
  const tasks = {
    Unassigned: 'Unassigned',
    Combat: {
      Mug: 'Mug People', Drug: 'Deal Drugs', Strongarm: 'Strongarm Civilians', Con: 'Run a Con', Robbery: 'Armed Robbery', TraffickArms: 'Traffick Illegal Arms', Blackmail: 'Threaten & Blackmail', HumanTrafficking: 'Human Trafficking', Terrorism: 'Terrorism',
    },
    Train: { Combat: 'Train Combat', Hacking: 'Train Hacking', Charisma: 'Train Charisma' },
    Vigilante: 'Vigilante Justice', Territory: 'Territory Warfare'
  };
  const upgrades = ns.gang.getEquipmentNames();
  const augs = upgrades.splice(-11, 11);

  let cycle = 0;
  while (true) {
    // check recruit
    const nextMemberName = 'Member-' + (ns.gang.getMemberNames().length > 0 ? (parseInt(ns.gang.getMemberNames().pop().split('-')[1]) + 1) : '0');
    if (ns.gang.recruitMember(nextMemberName)) headlines.push('Recruited ' + nextMemberName);

    const saveData = getSave();

    const gangInfo = JSON.parse(saveData.PlayerSave).data.gang.data;
    const membersData = gangInfo.members;
    const allMembers = ns.gang.getMemberNames();

    // check task
    const allGangData = JSON.parse(saveData.AllGangsSave);

    const task = tasks.Combat.HumanTrafficking;
    const taskStats = ns.gang.getTaskStats(task);
    const gangDataPart = {
      respect: gangInfo.respect,
      territory: allGangData['Slum Snakes'].territory,
      wantedLevel: gangInfo.wanted
    };

    allMembers.forEach((member, index) => {
      if (
        ns.formulas.gang.respectGain(gangDataPart, membersData[index].data, taskStats) > 0
      ) ns.gang.setMemberTask(member, task);
      else ns.gang.setMemberTask(member, tasks.Train.Combat);
    });

    // check equipment
    let count = 0;
    upgrades.forEach(up => {
      const cost = ns.gang.getEquipmentCost(up);
      allMembers.forEach((member, index) => {
        if (cost < getMoney() / allMembers.length &&
          !membersData[index].data.upgrades.includes(up) &&
          ns.gang.purchaseEquipment(member, up))
          count++;
      });
    });
    if (count !== 0) headlines.push(`Purchased ${count} equipment`);

    // check aug
    count = 0;
    augs.forEach(aug => {
      const cost = ns.gang.getEquipmentCost(aug);
      allMembers.forEach((member, index) => {
        if (cost < getMoney() / allMembers.length &&
          !membersData[index].data.augmentations.includes(aug) &&
          ns.gang.purchaseEquipment(member, aug))
          count++;
      });
    });
    if (count !== 0) headlines.push(`Purchased ${count} aug(s)`);

    // check ascend
    count = 0;
    allMembers.forEach((member, index) => {
      if (getAscendResults(membersData[index].data) >= 1.75 && ns.gang.ascendMember(member))
        count++;
    });
    if (count !== 0) headlines.push(`Ascended ${count} member(s)`);

    // check wanted level
    if (gangInfo.respect / (gangInfo.respect + gangInfo.wanted) < 0.5)
      allMembers.slice(0, Math.ceil(allMembers.length * 0.4))
        .forEach(member => ns.gang.setMemberTask(member, tasks.Vigilante));

    // territory warfare
    if (allGangData['Slum Snakes'].territory < 1) {
      if (allMembers.length >= 12) {
        const lowestWinChance = Object.keys(allGangData)
          .filter(g => g !== 'Slum Snakes')
          .filter(g => allGangData[g].territory > 0)
          .map(gang => allGangData[gang].power)
          .map(power => allGangData['Slum Snakes'].power / (allGangData['Slum Snakes'].power + power))
          .sort((a, b) => a - b)[0];

        if (lowestWinChance < 0.8)
          allMembers.forEach(member => ns.gang.setMemberTask(member, tasks.Territory));

        if (lowestWinChance >= 0.5) ns.gang.setTerritoryWarfare(true);
        else ns.gang.setTerritoryWarfare(false);
      }
    }
    else ns.gang.setTerritoryWarfare(false);

    // log
    log(allGangData['Slum Snakes'], gangInfo, membersData);
    if (cycle % 10 === 0) {
      headlines = [];
      cycle = 0;
    }
    cycle++;

    await ns.sleep(2e3 / (ns.gang.getBonusTime() > 2e3 ? 10 : 1));
  }

  /** Calculates the average ascension result of the specified member.
   * @param {GangMember} memberData Info of a member.
   * @return {number} The result of combat stats after ascension.
   * @see https://github.com/bitburner-official/bitburner-src/blob/dev/src/NetscriptFunctions/Gang.ts#L249
   */
  function getAscendResults(memberData) {
    // asc_points & exp
    const stats = ['hack', 'cha', 'agi', 'def', 'dex', 'str'];

    const results = stats.map(stat => {
      const current = calculateAscensionMult(memberData[stat + '_asc_points']);
      const gain = calculateAscensionMult(
        Math.max(memberData[stat + '_exp'] - 1000, 0) + // ascension points gain
        memberData[stat + '_asc_points']
      );
      return gain / current;
    });
    return results.reduce((acc, cur) => acc + cur, 0) / 6;
  }

  function calculateAscensionMult(points) {
    return Math.max(Math.pow(points / 2000, 0.5), 1);
  }

  function log(gangData, gangInfo, membersData) {
    ns.clearLog();
    const width = ' ------------------------------------------';
    const lines = [];

    headlines = [...new Set(headlines)];

    lines.push(' h------------==={ sHEADLINE h}===------------');
    if (headlines.length > 0)
      headlines.forEach(headline => {
        lines.push(`${fill((width.length / 2) - (headline.length / 2))} v${headline}`);
      });
    else lines.push(`${fill((width.length / 2) - 12)} vThere's nothing new yet.`);

    lines.push(' h--------------==={ sINFO h}===--------------');
    lines.push(`${fill(9)} hRespect: v${ns.formatNumber(gangInfo.respect, 3)}`);
    lines.push(`${fill(10)} hWanted: v${ns.formatNumber(gangInfo.wanted, 3)} (${ns.formatPercent(gangInfo.respect / (gangInfo.respect + gangInfo.wanted), 2)})`);
    lines.push(`${fill(10)} hIncome: v$${ns.formatNumber(gangInfo.moneyGainRate * 10, 3)} / cycle`);

    lines.push(' h-------------==={ sMEMBER h}===-------------');
    ns.gang.getMemberNames().forEach((member, index) => {
      const memInfo = membersData[index].data;
      lines.push(`${fill(16 - memInfo.name.length)} h${memInfo.name}: v${memInfo.task}`);
    });

    lines.push(' h-----------==={ sTERRITORY h}===------------');
    lines.push(`${fill(9)} hWarfare: v${gangInfo.territoryWarfareEngaged ? `${getColor('#00FF00')}ON` : `${getColor('#FF0000')}OFF`}`);
    lines.push(`${fill(7)} hTerritory: v${ns.formatPercent(gangData.territory, 3)}`);
    if (gangData.territory < 1) {
      const powerIncrease = calculatePower(membersData, gangData.territory);
      lines.push(`${fill(11)} hPower: v${ns.formatNumber(gangData.power, 3)} ${powerIncrease > 0 ? `(+${ns.formatNumber(powerIncrease, 3)})` : ''}`);
    }
    gangInfo.territoryClashChance > 0 && lines.push(`${fill(4)} hClash Chance: v${ns.formatPercent(gangInfo.territoryClashChance, 2)}`);

    ns.print(lines
      .join('\n')
      .replaceAll(' s', ` ${colors.section}`)
      .replaceAll(' h', ` ${colors.header}`)
      .replaceAll(' v', ` ${colors.value}`)
    );
    ns.resizeTail((width.length - 1) * 10, lines.length * 25 + 20);
  }

  function calculatePower(membersData, territory) {
    let memberTotal = 0;
    for (let i = 0; i < membersData.length; ++i) {
      if (membersData[i].data.task !== "Territory Warfare") continue;
      memberTotal += (membersData[i].data.hack + membersData[i].data.str + membersData[i].data.def + membersData[i].data.dex + membersData[i].data.agi + membersData[i].data.cha) / 95;
    }
    return 0.015 * Math.max(0.002, territory) * memberTotal;
  }

  function fill(count = 0) {
    return ' '.repeat(count);
  }

  function getColor(colorHex = '#ffffff') {
    if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    return `\u001b[38;2;${r};${g};${b}m`;
  }
}