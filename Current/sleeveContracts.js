/** Version 1.1.2
 * Improved contracts chance and count checks
 * Set all sleeves to Idle if not Infiltrating when script runs
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail(); ns.clearLog();
  const flagOptions = ns.flags([
    ['autoClose', false],
    ['avoidOverlap', false],
  ]);

  ns.run('bladeSkills.js', { preventDuplicates: true }, flagOptions.autoClose ? '--autoClose' : '', flagOptions.avoidOverlap ? '--avoidOverlap' : '');
  ns.atExit(() => {
    flagOptions.autoClose && ns.closeTail();
    for (let i = 0; i < 8; i++) if (ns.sleeve.getTask(i)?.type !== 'INFILTRATE') ns.sleeve.setToIdle(i);
    ns.kill('bladeSkills.js', 'home', flagOptions.autoClose ? '--autoClose' : '', flagOptions.avoidOverlap ? '--avoidOverlap' : '');
  });

  const [action, contracts] = ['Take on contracts', ['Bounty Hunter', 'Retirement', 'Tracking']];

  while (1) {
    let allSleeves = [];
    for (let i = 0; i < 8; i++) allSleeves.push({ id: i, info: ns.sleeve.getSleeve(i) });

    allSleeves = allSleeves.sort((a, b) => b.info.storedCycles - a.info.storedCycles);
    const conCopy = contracts.filter(con => ns.bladeburner.getActionCountRemaining('contract', con) > 0);

    // check for assigned contracts
    allSleeves.forEach(s => {
      const task = ns.sleeve.getTask(s.id);
      if (!task || conCopy.length <= 0) return;
      if (task.type === 'BLADEBURNER' && task.actionType === 'Contracts')
        conCopy.splice(conCopy.indexOf(task.actionName), 1);
    });
    // avoid failing contracts (builds up shock -> bad)
    if (allSleeves.filter(s => !(contracts.every(con => getActionChance('contract', con, s.id) >= 1))).length > 0 ||
      allSleeves.every(s => !ns.sleeve.getTask(s.id) && s.info.storedCycles < 50) ||
      contracts.every(con => ns.bladeburner.getActionCountRemaining('contract', con) <= 0)) {

      ns.write('blade-sleeve.txt', JSON.stringify({ runContract: false, runDiplomacy: false, runInfiltrate: true, }), 'w');
      ns.print(allSleeves.map(s => contracts.map(con => getActionChance('contract', con, s.id))));
      ns.exit();
    }

    for (const sleeve of allSleeves) {
      if (sleeve.info.shock > 0) {
        ns.sleeve.setToShockRecovery(sleeve.id);
        continue;
      }
      const task = ns.sleeve.getTask(sleeve.id);
      if (task) {
        if (task.type === 'BLADEBURNER' && task.actionType === 'Contracts') {
          // if contract chance is less than 100%, stop immediately
          if (getActionChance('contract', task.actionName, sleeve.id) < 1
            || sleeve.info.storedCycles < 5
            || task.cyclesNeeded - task.cyclesWorked > sleeve.info.storedCycles) {
            conCopy.push(task.actionName);
            ns.sleeve.setToIdle(sleeve.id);
          }
          else continue;
        }
        // if sleeve is doing anything else and stored cycles exhausted, stop immediately
        else if (sleeve.info.storedCycles < 5) ns.sleeve.setToIdle(sleeve.id);
      }
      if (!ns.sleeve.getTask(sleeve.id) && sleeve.info.storedCycles < 50) continue;
      if (conCopy.length <= 0) continue;
      // * conCopy could contain undefined value ?
      if (getActionChance('contract', conCopy[0], sleeve.id) < 1) continue;

      ns.sleeve.setToBladeburnerAction(sleeve.id, action, conCopy[0]);
      conCopy.splice(0, 1);
    }
    logTask();
    await ns.sleep(200);
  }

  function logTask() {
    ns.clearLog();
    contracts.forEach(con => ns.print(` ${con}: ${ns.formatNumber(ns.bladeburner.getActionCountRemaining('contract', con), 3)}`));
    for (let id = 0; id < 8; id++) {
      let task = ns.sleeve.getTask(id);
      if (!task) task = `Idle`;
      else switch (task.type.toLowerCase()) {
        case 'bladeburner':
          task = '\x1b[38;2;255;255;255m' + task.actionName + '\x1b[0m';
          break;
        case 'recovery':
          task = `Recovery (${ns.formatNumber(ns.sleeve.getSleeve(id).shock, 3)})`;
          break;
        case 'crime':
          task = task.crimeType;
          break;
        default:
          task = task.type[0] + task.type.substring(1).toLowerCase();
          break;
      }
      ns.print(` ${id}: ┌ int ${ns.formatNumber(ns.sleeve.getSleeve(id).skills.intelligence, 3, 1e6)}`);
      ns.print(`    ├ ${Object.keys(actions).map(con => `${con.charAt(0)}: ${ns.formatPercent(getActionChance('contract', con), 2)}`).join(', ')}`);
      ns.print(`    └ ${task} - ${ns.formatNumber(ns.sleeve.getSleeve(id).storedCycles, 3, 1e6)}`);
    }
    ns.resizeTail(500, 27 * 25 + 10);
  }

  function getActionChance(type, actionName, sleeveId = 0, city = ns.bladeburner.getCity()) {
    if (type.toLowerCase() !== 'contract' || !cities.includes(city)) return;

    const action = actions[actionName];

    let difficulty = action.baseDifficulty * Math.pow(action.difficultyFac, ns.bladeburner.getActionMaxLevel(type.toLowerCase(), actionName) - 1);
    let competence = 0;

    for (const stat of Object.keys(action.weights)) {
      if (Object.hasOwn(action.weights, stat)) {
        const playerStatLvl = queryStatFromString(stat); // sleeve.getSleeve(sleeveId).skills
        const key = 'eff' + stat.charAt(0).toUpperCase() + stat.slice(1);
        let effMultiplier = getSkillMults(key);
        if (effMultiplier === null) effMultiplier = 1;
        competence += action.weights[stat] * Math.pow(effMultiplier * playerStatLvl, action.decays[stat]);
      }
    }
    competence *= calculateIntelligenceBonus(ns.sleeve.getSleeve(sleeveId).skills.intelligence, 0.75);

    competence *= getChaosCompetencePenalty(city);
    difficulty *= getChaosDifficultyBonus(city);

    competence *= getSkillMults('successChanceAll');

    competence *= getSkillMults('successChanceContract');

    if (action.isStealth) competence *= getSkillMults('successChanceStealth');
    if (action.isKill) competence *= getSkillMults('successChanceKill');

    competence *= ns.sleeve.getSleeve(sleeveId).mults.bladeburner_success_chance;

    return competence / difficulty;
  }

  function queryStatFromString(str, sleeveId = 0) {
    const tempStr = str.toLowerCase();
    if (tempStr.includes('hack')) return ns.sleeve.getSleeve(sleeveId).skills.hacking;
    if (tempStr.includes('str')) return ns.sleeve.getSleeve(sleeveId).skills.strength;
    if (tempStr.includes('def')) return ns.sleeve.getSleeve(sleeveId).skills.defense;
    if (tempStr.includes('dex')) return ns.sleeve.getSleeve(sleeveId).skills.dexterity;
    if (tempStr.includes('agi')) return ns.sleeve.getSleeve(sleeveId).skills.agility;
    if (tempStr.includes('cha')) return ns.sleeve.getSleeve(sleeveId).skills.charisma;
    if (tempStr.includes('int')) return ns.sleeve.getSleeve(sleeveId).skills.intelligence;
  }

  function getSkillMults(str) {
    if (str.includes('Str') || str.includes('Def')) return 1 + ns.bladeburner.getSkillLevel('Reaper') * 0.02;
    if (str.includes('Dex') || str.includes('Agi')) return 1 + (ns.bladeburner.getSkillLevel('Reaper') * 0.02 * ns.bladeburner.getSkillLevel('Evasive System') * 0.04);
    if (str.includes('ChanceAll')) return 1 + ns.bladeburner.getSkillLevel(`Blade's Intuition`) * 0.03;
    if (str.includes('ChanceStealth')) return 1 + ns.bladeburner.getSkillLevel(`Cloak`) * 0.055;
    if (str.includes('ChanceKill')) return 1 + ns.bladeburner.getSkillLevel(`Short-Circuit`) * 0.055;
    if (str.includes('ChanceContract')) return 1 + ns.bladeburner.getSkillLevel(`Tracer`) * 0.04;
    return 1;
  }

  function calculateIntelligenceBonus(intelligence, weight = 1) {
    return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
  }

  function getChaosCompetencePenalty(city) {
    return Math.pow(ns.bladeburner.getCityEstimatedPopulation(city) / 1e9, 0.7);
  }

  function getChaosDifficultyBonus(city) {
    const chaos = ns.bladeburner.getCityChaos(city);
    if (chaos > 50) {
      const diff = 1 + (chaos - 50);
      const mult = Math.pow(diff, 0.5);
      return mult;
    }
    return 1;
  }
}
const cities = ['Aevum', 'Chongqing', 'Sector-12', 'New Tokyo', 'Ishima', 'Volhaven'];
const actions = {
  Tracking: {
    name: "Tracking",
    baseDifficulty: 125,
    difficultyFac: 1.02,
    weights: { hack: 0, str: 0.05, def: 0.05, dex: 0.35, agi: 0.35, cha: 0.1, int: 0.05, },
    decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.9, int: 1, },
    isStealth: true,
  },
  'Bounty Hunter': {
    name: "Bounty Hunter",
    baseDifficulty: 250,
    difficultyFac: 1.04,
    weights: { hack: 0, str: 0.15, def: 0.15, dex: 0.25, agi: 0.25, cha: 0.1, int: 0.1, },
    decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.8, int: 0.9, },
    isKill: true,
  },
  Retirement: {
    name: "Retirement",
    baseDifficulty: 200,
    difficultyFac: 1.03,
    weights: { hack: 0, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0.1, int: 0.1, },
    decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.8, int: 0.9, },
    isKill: true,
  }
};