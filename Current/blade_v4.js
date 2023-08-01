/** Version 4.14
 * Reworked logging
 * - Only update changed data, keep unchanged data intact
 * - Changed data -> Log data object -> Print to tail
 * Updated progress bar
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

  const nodeSkillCost = currentBN !== 12 ? bnSkillCost[currentBN] : 1.02 ** parseInt(ns.read('BN_Level.txt'));

  const colors = {
    section: getColor(ns.ui.getTheme().money),
    header: getColor(ns.ui.getTheme().hp),
    value: getColor(),
  };

  try {
    ns.bladeburner.getSkillLevel(`Cloak`);
  } catch (error) {
    ns.alert(`Haven't joined Bladeburner yet\n`);
    ns.exit();
  }

  // shortened function
  const successChance = (type = '', name = '') => ns.bladeburner.getActionEstimatedSuccessChance(type, name);
  const actionCount = (type = '', name = '') => ns.bladeburner.getActionCountRemaining(type, name);

  let postBlade = false;
  let currentBlackOp = getCurrentBlackOp();
  postBlade = !currentBlackOp ? true : false;

  let currentOp = getBestOp();

  let rankGain = [Infinity, 0];

  log = {
    ...log,
    City: { Name: ns.bladeburner.getCity(), Population: ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()), Chaos: ns.bladeburner.getCityChaos(ns.bladeburner.getCity()), },
  };
  if (currentBlackOp) log['Black Op'] = { Name: currentBlackOp, Chance: successChance('blackop', currentBlackOp)[0], 'Required Rank': blackOpRanks[currentBlackOp], };

  const leftoverAction = ns.bladeburner.getCurrentAction();
  if (leftoverAction.type === 'BlackOp') {
    log = {
      ...log,
      Action: { Name: leftoverAction.name, Type: 'blackop', Chance: successChance('blackop', leftoverAction.name)[0], Count: 1, Time: ns.bladeburner.getActionTime('blackop', leftoverAction.name), },
      Rank: ns.bladeburner.getRank(), 'Skill Points': ns.bladeburner.getSkillPoints(),
    };
  }
  while (ns.bladeburner.getCurrentAction().type === 'BlackOp') {
    logAction();
    await ns.sleep(500);
  }

  // main loop
  while (1) {
    if (contracts.slice().map(con => actionCount('contract', con)).filter(count => count >= 5e3).length > 0)
      toggleSleeveContract(true);
    else toggleSleeveInfiltrate(true);
    // general
    checkCity();
    if (!postBlade) {
      await checkAccuracy('contract', 'Tracking');
      if (successChance('contract', 'Tracking')[0] < chanceLimits.contract) {
        await checkChaos();
        await performAction('gen', 'Training');
        await performAction('gen', 'Field Analysis');
      }

      // contracts
      await checkAccuracy('contract', 'Tracking');
      if (successChance('contract', 'Tracking')[0] >= chanceLimits.contract && currentOp === '')
        for (const con of contracts) {
          await checkAccuracy('contract', con);
          if (successChance('contract', con)[0] < chanceLimits.contract || !checkWorkCount('contract', con)) continue;
          await performAction('contract', con, Math.min(actionCount('contract', con), 10));
        }
    }
    if (ns.bladeburner.getBonusTime() <= 1e3) {
      currentOp = getBestOp();
      if (currentOp !== '') {
        await checkAccuracy('op', currentOp);
        const count = postBlade
          ? actionCount('op', currentOp)
          : Math.min(actionCount('op', currentOp), Math.trunc(Math.random() * 7 + 13)); // 13-20
        if (checkWorkCount('op', currentOp)) await performAction('op', currentOp, count);
      }
    }

    await ns.sleep(1);
    if (postBlade) {
      if (actionCount('op', 'Assassination') <= 0 || ns.bladeburner.getBonusTime() > 1e3) {
        const maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
        const opToGenerate = Math.min(100, Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - ns.bladeburner.getActionSuccesses('op', 'Assassination'));
        while (actionCount('op', 'Assassination') < opToGenerate || ns.bladeburner.getBonusTime() > 1e3) {
          // if all contracts are exhausted here, set sleeves to infiltrate
          // else contracts handler sets them to infiltrate after stored cycles are exhausted
          if (contracts.every(con => actionCount('contract', con) <= 0)) toggleSleeveInfiltrate(true);
          await ns.sleep(10);
          await performAction('gen', 'Incite Violence', 1, false, false);
        }
      }
      await checkChaos();
    }
    await ns.sleep(1);
  }

  function logAction() {
    const divider = ' -----------------------------------------------';
    ns.clearLog();

    const lines = [];
    const skillToPrint = getAllSkills();

    let maxSkillWidth = 12;
    skillToPrint.forEach(skill => {
      if (ns.bladeburner.getSkillLevel(skill.name) > 0)
        maxSkillWidth = Math.max(maxSkillWidth, skill.name.length);
    });

    lines.push(' h---------------==={ sCURRENT h}===---------------');
    lines.push(` s${fillWhitespaces((divider.length / 2) - (log.Action.Name.length / 2))}v${log.Action.Name}`);
    log.Action.Type !== 'gen' && lines.push(`${fillWhitespaces(divider.length / 4)} hChance: v${ns.formatPercent(log.Action.Chance, 2)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hTime: v${Math.round(ns.bladeburner.getActionCurrentTime() / 1e3)} / ${Math.round(log.Action.Time / 1e3)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 - 2)} hProgress: v${progressBar(ns.bladeburner.getActionCurrentTime() / log.Action.Time, 8)}`);
    (log.Action.Count !== Infinity && log.Action.Count !== 1) && lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hCount: v${log.Action.Count}`);

    lines.push(' h---------------==={ sSKILLS h}===----------------');
    const rankGainAvg = (rankGain[0] + rankGain[1]) / 2;
    const spGainAvg = Math.trunc(rankGainAvg / 3) + ((log.Rank % 3) + (rankGainAvg % 3) >= 3 ? 1 : 0);

    lines.push(`${fillWhitespaces(divider.length / 3 - 2)} hRank: v${ns.formatNumber(log.Rank, log.Rank >= 1e6 ? 3 : 0, 1e6)}` +
      `${rankGainAvg > 0 && rankGainAvg !== Infinity ? ` (+ ~${ns.formatNumber(rankGainAvg, rankGainAvg >= 1e6 ? 1 : 0, 1e6)})` : ''}`);
    lines.push(`${fillWhitespaces(divider.length / 3 - 10)} hSkill Points: v${ns.formatNumber(log["Skill Points"], log["Skill Points"] > 1e6 ? 3 : 0, 1e6)}` +
      `${spGainAvg > 0 && spGainAvg !== Infinity ? ` (+ ~${ns.formatNumber(Math.trunc(spGainAvg), 3, 1e6)})` : ''}`);

    skillToPrint.forEach(skill => {
      if (ns.bladeburner.getSkillLevel(skill.name) > 0) {
        if (skill.name === 'Overclock' && ns.bladeburner.getSkillLevel('Overclock') >= 90) return;
        const sp = ns.bladeburner.getSkillUpgradeCost(skill.name);
        lines.push(
          `${fillWhitespaces(divider.length / 3 - (skill.name.length) + 2)} h${skill.name}: v${ns.formatNumber(ns.bladeburner.getSkillLevel(skill.name), 3, 1e6)} - ` +
          (log["Skill Points"] >= sp ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`) + `${ns.formatNumber(sp, 3, 1e6)}`
        );
      }
    });

    if (!postBlade) {
      const rankMet = log.Rank > blackOpRanks[currentBlackOp];
      lines.push(' h--------------==={ sBLACK OP h}===---------------');
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${currentBlackOp.substring(10)}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hChance: ${log["Black Op"].Chance > chanceLimits.blackOp ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(log["Black Op"].Chance, 2)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hRank: v${ns.formatNumber(blackOpRanks[currentBlackOp], 3)} -` +
        ` ${rankMet ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(log.Rank / blackOpRanks[currentBlackOp])}`);
    }
    else {
      lines.push(' h----------------==={ sCITY h}===-----------------');
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${log.City.Name}`);
      lines.push(`${fillWhitespaces(divider.length / 4 - 4)} hPopulation: v${ns.formatNumber(log.City.Population, 3)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hChaos: v${ns.formatNumber(log.City.Chaos, 3)}`);

      lines.push(' h------------==={ sASSASSINATION h}===------------');
      lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hLevel: v${log.Assassination.Level}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hChance: v${ns.formatPercent(log.Assassination.Chance, 2)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 - 3)} hSuccesses: v${ns.formatNumber(log.Assassination.Successes, 3, 1e6)}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hNeeded: v${ns.formatNumber(log.Assassination.Needed, 3, 1e6)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hCount: v${log.Assassination.Count}`);
    }

    ns.print(lines
      .join('\n')
      .replaceAll(' s', ` ${colors.section}`)
      .replaceAll(' h', ` ${colors.header}`)
      .replaceAll(' v', ` ${colors.value}`)
    );
    ns.resizeTail((divider.length - 2) * 10, lines.length * 25 + 25);
  }

  /** * Starts the specified action a certain amount of time and write to log.
   ** Also check stamina beforehand.
   * @param {string} type Type of the action.
   * @param {string} action Name of the action.
   * @param {number} count The action count. Defaults to ```1```.
   * @param {boolean} stamina Whether to check stamina. Set to ```false``` to avoid stamina check (and possible infinite loop). Defaults to ```true```.
   * @param {boolean} blackOp Whether to check for Black Op. Set to ```false``` to disable Black Op (why?). Defaults to ```true```. */
  async function performAction(type = '', action = '', count = 1, stamina = true, blackOp = true) {
    const successes = ns.bladeburner.getActionSuccesses('op', 'Assassination'),
      maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
    log = {
      ...log, Action: { ...log.Action, Name: action, Type: type },
      Assassination: { Chance: successChance('op', 'Assassination')[0], Level: maxLevel, Successes: successes, Needed: Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - successes, Count: actionCount('op', 'Assassination'), },
    };

    if (ns.bladeburner.startAction(type, action)) {
      for (let i = 1; i <= count; i++) {
        log = {
          ...log, Rank: ns.bladeburner.getRank(), 'Skill Points': ns.bladeburner.getSkillPoints(),
          Action: { ...log.Action, Chance: successChance(type, action)[0], Count: actionCount(type, action), Time: ns.bladeburner.getActionTime(type, action), },
        };
        if (action === 'Assassination') {
          const successes = ns.bladeburner.getActionSuccesses('op', 'Assassination'),
            maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
          log = { ...log, Assassination: { Chance: successChance('op', 'Assassination')[0], Level: maxLevel, Successes: successes, Needed: Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - successes, Count: actionCount('op', 'Assassination'), }, };
        }

        if (actionCount(type, action) <= 0) break;

        rankGain = [Infinity, 0];
        for (let j = 0; j < 30; j++) {
          const repGain = ns.bladeburner.getActionRepGain(type, action),
            rank = repGain + (Math.random() * (repGain * 0.2) - repGain * 0.1);
          rankGain[0] = Math.min(rank, rankGain[0]);
          rankGain[1] = Math.max(rank, rankGain[1]);
        }
        if (rankGain[0] === Infinity) rankGain[0] = 0;

        if (!postBlade) {
          stamina && await checkStamina();
          blackOp && await checkBlackOps();
        }

        const title = `R:${ns.formatNumber(log.Rank, log.Rank >= 1e6 ? 2 : 0, 1e6)} | ` +
          (postBlade ? ' ' : `D:${ns.formatPercent(successChance('blackop', 'Operation Daedalus')[0], 0)} | `) +
          `${type !== 'blackop' ? action : 'Op. ' + action.substring(10)}`
        ns.setTitle(title);

        let current = ns.bladeburner.getActionCurrentTime();

        // ns.tprint(log);
        while (current <= log.Action.Time) {
          logAction();
          await ns.sleep(500);
          const bonus = ns.bladeburner.getBonusTime();
          current = ns.bladeburner.getActionCurrentTime();
          if (ns.bladeburner.getCurrentAction().type === 'Idle') break;
          if ((bonus <= 1e3 && current === 0) || (bonus > 1e3 && current < 5e3)) break;
        }
        await upgradeSkills();
      }
    }
    ns.bladeburner.stopBladeburnerAction();
  }

  /** Calculates the best city based on the population, chaos, player stats and Bladeburner skills (from source code). */
  function checkCity() {
    const citiesSortedPop = cities.sort((a, b) => ns.bladeburner.getCityEstimatedPopulation(b) - ns.bladeburner.getCityEstimatedPopulation(a));
    if (citiesSortedPop.length > 0) ns.bladeburner.switchCity(citiesSortedPop[0]);
  }

  /** If success chance difference is more than ```5%``` starts increasing accuracy. */
  async function checkAccuracy(type, name) {
    while (successChance(type, name)[1] - successChance(type, name)[0] > 0.05) {
      if (successChance('op', 'Undercover Operation')[0] >= chanceLimits.operation &&
        actionCount('op', 'Undercover Operation') > 0 &&
        ns.bladeburner.getActionTime('op', 'Undercover Operation') <= 30e3)
        await performAction('op', 'Undercover Operation', 1, false, false);

      else if (successChance('op', 'Investigation')[0] >= chanceLimits.operation &&
        actionCount('op', 'Investigation') > 0 &&
        ns.bladeburner.getActionTime('op', 'Investigation') <= 30e3)
        await performAction('op', 'Investigation', 1, false, false);

      else await performAction('gen', 'Field Analysis', 1, false, false);
    }
  }

  /** Regen if stamina is less than half. Regen until full. */
  async function checkStamina() {
    if (ns.bladeburner.getStamina()[0] < 0.5 * ns.bladeburner.getStamina()[1])
      while (ns.bladeburner.getStamina()[0] < ns.bladeburner.getStamina()[1])
        await performAction('gen', 'Hyperbolic Regeneration Chamber', 1, false, false);
  }

  /** Continuously upgrade skill while SP is sufficient. Speed increases the more points accumulated. */
  async function upgradeSkills() {
    const allSkills = getAllSkills();
    allSkills.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a.name) - ns.bladeburner.getSkillUpgradeCost(b.name));

    let sp = ns.bladeburner.getSkillPoints();
    let count = calculateLevels(allSkills[0], ns.bladeburner.getSkillLevel(allSkills[0].name), sp);
    while (sp >= ns.bladeburner.getSkillUpgradeCost(allSkills[0].name, count)) {
      if (allSkills[0].name === 'Overclock' && ns.bladeburner.getSkillLevel(allSkills[0].name) >= 90)
        allSkills.splice(0, 1);
      ns.bladeburner.upgradeSkill(allSkills[0].name, count);
      allSkills.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a.name) - ns.bladeburner.getSkillUpgradeCost(b.name));
      sp = ns.bladeburner.getSkillPoints();
      count = calculateLevels(allSkills[0], ns.bladeburner.getSkillLevel(allSkills[0].name), sp);
      await ns.asleep(0);
    }
  }

  /** Notifies user if work count is ```0```. */
  function checkWorkCount(type = '', name = '') {
    if (actionCount(type, name) <= 0) {
      ns.toast(`Remaining Work of ${name} is 0. Use Sleeve (Infiltrate) if possible.`, 'info', 20e3);
      return false;
    }
    return true;
  }

  /** Starts ```Diplomacy``` if ```chaos > getChaosThreshold```, nothing otherwise. */
  async function checkChaos() {
    const currentCity = ns.bladeburner.getCity();
    if (postBlade) {
      const [con, op] = [getActionDisplayChance('contract', 'Bounty Hunter'), getActionDisplayChance('op', 'Assassination')];
      if (con >= 1 && op >= 1) {
        toggleSleeveDiplomacy(false);
        return;
      }
      toggleSleeveDiplomacy(true);
      while (ns.bladeburner.getCityChaos(currentCity) > 50) await performAction('gen', 'Diplomacy', 1, false, false);
      toggleSleeveDiplomacy(false);
    } else {
      if (ns.bladeburner.getCityChaos(currentCity) > 50)
        ns.toast('Chaos higher than 50. Use Sleeves for Diplomacy if possible', 'info', 5e3);
      //   toggleSleeveDiplomacy(true);
      // toggleSleeveDiplomacy(false);
    }
  }

  /** Perform the current blackop if ```chance === 100%``` and ```rank``` is sufficient. */
  async function checkBlackOps() {
    currentBlackOp = getCurrentBlackOp();
    while (1) {
      if (postBlade) return;

      if (ns.bladeburner.getRank() < blackOpRanks[currentBlackOp]) return;
      await checkAccuracy('blackop', currentBlackOp);
      if (successChance('blackop', currentBlackOp)[0] < chanceLimits.blackOp) return;

      await performAction('blackop', currentBlackOp, 1, true, false);

      // if succeed, notify the user and update the blackop
      const nextBlackOp = getCurrentBlackOp();
      if (nextBlackOp !== currentBlackOp) {
        ns.toast(`Successfully completed ${currentBlackOp}`, 'success', 5e3);
        if (!nextBlackOp) {
          postBlade = true;
          ns.alert(`!  Operation Daedalus is accomplished  !\nDestroy this BitNode when you're ready`);
          // Log the time of the Daedalus completion to terminal
          // Only if Daedalus is actually performed, not just finished
          ns.tprintf(`\n(!) Finished Daedalus at: ${(new Date()).toLocaleString()}`, 0);
        }
        else {
          currentBlackOp = nextBlackOp;
          log['Black Op'] = { Name: currentBlackOp, Chance: successChance('blackop', currentBlackOp)[0], 'Required Rank': blackOpRanks[currentBlackOp], };
        }
      }
    }
  }

  /**
   * Get the name of the next available black op. If there is no black op, returns ```null```.
   * @returns The next available black op name.
   */
  function getCurrentBlackOp() {
    if (postBlade || actionCount('blackop', 'Operation Daedalus') <= 0) return null;
    let currentBlackOp = '';
    blackOps.forEach(bo => {
      if (currentBlackOp === '' && actionCount('blackop', bo) > 0) currentBlackOp = bo;
    });
    return currentBlackOp;
  }

  /**
   * Chooses the best operation. Always return ```Assassination``` if is in Post-Blade.
   * @returns The best operation that is currently available.
   */
  function getBestOp() {
    if (postBlade) return 'Assassination';
    let bestOp = '';
    operations.forEach(op => {
      if (bestOp !== '') return;
      if (actionCount('op', op) > 0 && successChance('op', op)[0] >= chanceLimits.operation)
        bestOp = op;
    });
    return bestOp;
  }

  function getAllSkills() {
    let allSkills = skills.slice();
    if (postBlade) allSkills = skills.slice(-1);
    else allSkills.push({ name: 'Overclock', baseCost: 3, costInc: 1.4 });
    return allSkills;
  }

  function calculateLevels(skill, currentLevel, sp) {
    let count = Math.trunc(sp / (5 * Math.pow(10, 8.7)));
    while (calculateCost(skill, currentLevel, count) > sp) count = Math.trunc(count / 3);
    return Math.max(1, count);
  }

  function calculateCost(skill, currentLevel, count = 1) {
    const preMult = (count * (2 * skill.baseCost + skill.costInc * (2 * currentLevel + count + 1))) / 2;
    const unFloored = preMult * nodeSkillCost - count / 2;
    return Math.floor(unFloored);
  }

  function getActionDisplayChance(type, actionName, city = ns.bladeburner.getCity()) {
    return Math.min(1, getActionChance(type, actionName, city));
  }

  /**
   * Return the success chance of the given action if you're in the given city (not represented as percentage or within 0-1).
   * @param {string} type Type of the action. ```Contract``` or ```Operation```.
   * @param {string} actionName Name of the action.
   * @param {string} city City name. Default is the current city.
   * @returns Success chance of the action.
   */
  function getActionChance(type, actionName, city = ns.bladeburner.getCity()) {
    if (type.toLowerCase() !== 'contract' && !type.toLowerCase().includes('op')) return;
    if (!cities.includes(city)) return;

    const actionType = type.toLowerCase().includes('contract') ? actions.Contract : actions.Operation;
    const action = actionType[actionName];

    let difficulty = action.baseDifficulty * Math.pow(action.difficultyFac, ns.bladeburner.getActionMaxLevel(type.toLowerCase(), actionName) - 1);
    let competence = 0;

    for (const stat of Object.keys(action.weights)) {
      if (Object.hasOwn(action.weights, stat)) {
        const playerStatLvl = queryStatFromString(stat); // getPlayer().skills
        const key = 'eff' + stat.charAt(0).toUpperCase() + stat.slice(1);
        let effMultiplier = getSkillMults(key);
        if (effMultiplier === null) effMultiplier = 1;
        competence += action.weights[stat] * Math.pow(effMultiplier * playerStatLvl, action.decays[stat]);
      }
    }
    competence *= calculateIntelligenceBonus(ns.getPlayer().skills.intelligence, 0.75);
    competence *= calculateStaminaPenalty();

    // competence *= getTeamSuccessBonus();
    competence *= 1;

    competence *= getChaosCompetencePenalty(city);
    difficulty *= getChaosDifficultyBonus(city);

    // Factor skill multipliers into success chance
    competence *= getSkillMults('successChanceAll');

    if (type.toLowerCase().includes('contract')) competence *= getSkillMults('successChanceContract');
    if (type.toLowerCase().includes('op')) competence *= getSkillMults('successChanceOperation');

    if (action.isStealth) competence *= getSkillMults('successChanceStealth');
    if (action.isKill) competence *= getSkillMults('successChanceKill');

    competence *= ns.getPlayer().mults.bladeburner_success_chance;

    return competence / difficulty;
  }

  function queryStatFromString(str) {
    const tempStr = str.toLowerCase();
    if (tempStr.includes('hack')) return ns.getPlayer().skills.hacking;
    if (tempStr.includes('str')) return ns.getPlayer().skills.strength;
    if (tempStr.includes('def')) return ns.getPlayer().skills.defense;
    if (tempStr.includes('dex')) return ns.getPlayer().skills.dexterity;
    if (tempStr.includes('agi')) return ns.getPlayer().skills.agility;
    if (tempStr.includes('cha')) return ns.getPlayer().skills.charisma;
    if (tempStr.includes('int')) return ns.getPlayer().skills.intelligence;
  }

  function getSkillMults(str) {
    if (str.includes('Str') || str.includes('Def')) return 1 + ns.bladeburner.getSkillLevel('Reaper') * 0.02;
    if (str.includes('Dex') || str.includes('Agi')) return 1 + (ns.bladeburner.getSkillLevel('Reaper') * 0.02 * ns.bladeburner.getSkillLevel('Evasive System') * 0.04);
    if (str.includes('ChanceAll')) return 1 + ns.bladeburner.getSkillLevel(`Blade's Intuition`) * 0.03;
    if (str.includes('ChanceStealth')) return 1 + ns.bladeburner.getSkillLevel(`Cloak`) * 0.055;
    if (str.includes('ChanceKill')) return 1 + ns.bladeburner.getSkillLevel(`Short-Circuit`) * 0.055;
    if (str.includes('ChanceOperation')) return 1 + ns.bladeburner.getSkillLevel(`Digital Observer`) * 0.04;
    if (str.includes('ChanceContract')) return 1 + ns.bladeburner.getSkillLevel(`Tracer`) * 0.04;
    return 1;
  }

  function calculateIntelligenceBonus(intelligence, weight = 1) {
    return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
  }

  function calculateStaminaPenalty() {
    const [stamina, maxStamina] = ns.bladeburner.getStamina();
    return Math.min(1, stamina / (0.5 * maxStamina));
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

  function toggleSleeveInfiltrate(toggle) {
    sleeveControl.runInfiltrate = toggle;
    if (toggle) {
      if (sleeveControl.runContract) sleeveControl.runContract = false;
      if (sleeveControl.runDiplomacy) sleeveControl.runDiplomacy = false;
    }
    ns.write('blade-sleeve.txt', JSON.stringify(sleeveControl), 'w');
  }

  function toggleSleeveDiplomacy(toggle) {
    sleeveControl.runDiplomacy = toggle;
    if (toggle) {
      if (sleeveControl.runContract) sleeveControl.runContract = false;
      if (sleeveControl.runInfiltrate) sleeveControl.runInfiltrate = false;
    }
    ns.write('blade-sleeve.txt', JSON.stringify(sleeveControl), 'w');
  }

  function toggleSleeveContract(toggle) {
    sleeveControl.runContract = toggle;
    if (toggle) {
      if (sleeveControl.runDiplomacy) sleeveControl.runDiplomacy = false;
      if (sleeveControl.runInfiltrate) sleeveControl.runInfiltrate = false;
    }
    ns.write('blade-sleeve.txt', JSON.stringify(sleeveControl), 'w');
  }
}

/** Convert ```HEX``` colors to ```ANSI``` colors, default is ```#ffffff```. This color is used for text (foreground).
 * @param {string} colorHex color in hex format
 * @returns ```Unicode``` string for the color */
function getColor(colorHex = '#ffffff') {
  if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
  const r = parseInt(colorHex.substring(1, 3), 16);
  const g = parseInt(colorHex.substring(3, 5), 16);
  const b = parseInt(colorHex.substring(5, 7), 16);
  return `\u001b[38;2;${r};${g};${b}m`;
}

/** Return a ```string``` representation of progress as a bar.
 * @param {number} progress The current progress.
 * @param {number} maxChar The number of characters the progress bar should display, excluding the enclosing characters.
 * @returns The progress bar as a ```string```. */
function progressBar(progress, maxChar = 10) {
  progress = Math.min(1, Math.max(progress, 0));
  const fullCount = Math.round(maxChar * progress), full = fullCount <= Math.round(0.35 * maxChar) ? '🟥' : fullCount <= Math.round(0.9 * maxChar) ? '🟨' : '🟩';
  return `[${full.repeat(fullCount)}${'🔳'.repeat(Math.max(0, maxChar - fullCount))}]`;
}

const fillWhitespaces = (count = 0) => ' '.repeat(count);

const chanceLimits = {
  contract: 0.6,
  operation: 0.8,
  blackOp: 0.95,
};

const currentBN = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bitNodeN;
const bnSkillCost = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1.2, 10: 1, 11: 1, 13: 2 };

// connect to sleeves
const sleeveControl = {
  runContract: false,
  runDiplomacy: false,
  runInfiltrate: false,
};

let log = {
  Action: { Name: '', Type: '', Chance: 0, Count: 0, Time: 0, },
  Rank: 0, 'Skill Points': 0,
  City: { Name: '', Population: 0, Chaos: 0, },
  'Black Op': { Name: '', Chance: 0, 'Required Rank': 0, },
  Assassination: { Chance: 0, Level: 0, Successes: 0, Needed: 0, Count: 0, },
};

const cities = ['Aevum', 'Chongqing', 'Sector-12', 'New Tokyo', 'Ishima', 'Volhaven'];
const contracts = ['Retirement', 'Bounty Hunter', 'Tracking'];
const operations = ['Assassination', 'Stealth Retirement Operation', 'Sting Operation', 'Undercover Operation', 'Investigation'];
const blackOps = ['Operation Typhoon', 'Operation Zero', 'Operation X', 'Operation Titan', 'Operation Ares', 'Operation Archangel', 'Operation Juggernaut', 'Operation Red Dragon', 'Operation K', 'Operation Deckard', 'Operation Tyrell', 'Operation Wallace', 'Operation Shoulder of Orion', 'Operation Hyron', 'Operation Morpheus', 'Operation Ion Storm', 'Operation Annihilus', 'Operation Ultron', 'Operation Centurion', 'Operation Vindictus', 'Operation Daedalus'];
const blackOpRanks = { 'Operation Typhoon': 2500, 'Operation Zero': 5000, 'Operation X': 7500, 'Operation Titan': 10000, 'Operation Ares': 12500, 'Operation Archangel': 15000, 'Operation Juggernaut': 20000, 'Operation Red Dragon': 25000, 'Operation K': 30000, 'Operation Deckard': 40000, 'Operation Tyrell': 50000, 'Operation Wallace': 75000, 'Operation Shoulder of Orion': 100000, 'Operation Hyron': 125000, 'Operation Morpheus': 150000, 'Operation Ion Storm': 175000, 'Operation Annihilus': 200000, 'Operation Ultron': 250000, 'Operation Centurion': 300000, 'Operation Vindictus': 350000, 'Operation Daedalus': 400000 };
const skills = [
  { name: `Blade's Intuition`, baseCost: 3, costInc: 2.1 },
  { name: 'Cloak', baseCost: 2, costInc: 1.1 },
  { name: 'Short-Circuit', baseCost: 2, costInc: 2.1 },
  { name: 'Digital Observer', baseCost: 2, costInc: 2.1 },
  { name: 'Tracer', baseCost: 2, costInc: 2.1, },
  { name: 'Reaper', baseCost: 2, costInc: 2.1 },
  { name: 'Evasive System', baseCost: 2, costInc: 2.1 },
  { name: 'Hyperdrive', baseCost: 1, costInc: 2.5 }
];
const actions = {
  Contract: {
    Tracking: {
      baseDifficulty: 125,
      difficultyFac: 1.02,
      weights: { hack: 0, str: 0.05, def: 0.05, dex: 0.35, agi: 0.35, cha: 0.1, int: 0.05, },
      decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.9, int: 1, },
      isStealth: true,
    },
    'Bounty Hunter': {
      baseDifficulty: 250,
      difficultyFac: 1.04,
      weights: { hack: 0, str: 0.15, def: 0.15, dex: 0.25, agi: 0.25, cha: 0.1, int: 0.1, },
      decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.8, int: 0.9, },
      isKill: true,
    },
    Retirement: {
      baseDifficulty: 200,
      difficultyFac: 1.03,
      weights: { hack: 0, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0.1, int: 0.1, },
      decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.8, int: 0.9, },
      isKill: true,
    }
  },
  Operation: {
    Assassination: {
      baseDifficulty: 1500,
      difficultyFac: 1.06,
      weights: { hack: 0.1, str: 0.1, def: 0.1, dex: 0.3, agi: 0.3, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.8, },
      isStealth: true,
      isKill: true,
    }
  },
};