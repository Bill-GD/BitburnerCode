/** Version 4.15.1
 * Reduced RAM:
 * - getActionRepGain renamed to getActionRankGain (avoid conflict)
 * - Removed bladeburner.stopBladeburnerAction
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

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

  const nodeSkillCost = currentBN !== 12 ? bnSkillCost[currentBN] : 1.02 ** parseInt(ns.read('BN_Level.txt')),
    nodeRank = currentBN !== 12 ? bnRank[currentBN] : 1.02 ** parseInt(ns.read('BN_Level.txt'));

  let currentBlackOp = getCurrentBlackOp(),
    postBlade = !currentBlackOp,
    currentOp = getBestOp(),
    rankGain = 0, spGain = 0,
    logNote = '',
    skillsToUse = [];

  log.City = { Name: ns.bladeburner.getCity(), Population: ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()), Chaos: ns.bladeburner.getCityChaos(ns.bladeburner.getCity()), };
  if (currentBlackOp) log['Black Op Chance'] = getActionChance('blackop', currentBlackOp);

  const leftoverAction = ns.bladeburner.getCurrentAction();
  if (leftoverAction.type === 'BlackOp') {
    log.Action = { Name: leftoverAction.name, Type: 'blackop', Chance: getActionChance('blackop', leftoverAction.name), Count: 1, Time: ns.bladeburner.getActionTime('blackop', leftoverAction.name), };
    log.Rank = ns.bladeburner.getRank();
    log['Skill Points'] = ns.bladeburner.getSkillPoints();
  }
  while (ns.bladeburner.getCurrentAction().type === 'BlackOp') {
    logAction();
    await ns.sleep(500);
  }

  // main loop
  while (1) {
    checkCity();
    await checkPopAccuracy();
    skillsToUse = getAllSkills();
    await checkChaos();

    if (postBlade && contracts.slice().map(con => ns.bladeburner.getActionCountRemaining('contract', con)).filter(count => count >= 1500).length > 0)
      toggleSleeveContract(true);
    else toggleSleeveInfiltrate(true);

    if (!postBlade) {
      // general
      if (getActionChance('contract', 'Tracking') < chanceLimits.contract) {
        await performAction('gen', 'Training');
        await performAction('gen', 'Field Analysis');
      }

      // contracts
      if (getActionChance('contract', 'Tracking') >= chanceLimits.contract && currentOp === '')
        for (const con of contracts)
          if (getActionChance('contract', con) >= chanceLimits.contract && checkWorkCount('contract', con))
            await performAction('contract', con, Math.min(ns.bladeburner.getActionCountRemaining('contract', con), 10));
    }

    await checkChaos();
    logNote = 'Post-Blade: ' + postBlade;
    if (ns.bladeburner.getBonusTime() <= 1e3) {
      currentOp = getBestOp();
      if (currentOp !== '') {
        const count = postBlade
          ? ns.bladeburner.getActionCountRemaining('op', currentOp)
          : Math.min(ns.bladeburner.getActionCountRemaining('op', currentOp), Math.trunc(Math.random() * 7 + 13)); // 13-20
        await performAction('op', currentOp, count);
      }
    }

    if (postBlade && (ns.bladeburner.getActionCountRemaining('op', 'Assassination') <= 0 || ns.bladeburner.getBonusTime() > 1e3)) {
      const maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
      const opToGenerate = Math.min(100, Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - ns.bladeburner.getActionSuccesses('op', 'Assassination'));
      while (ns.bladeburner.getActionCountRemaining('op', 'Assassination') < opToGenerate || ns.bladeburner.getBonusTime() > 1e3) {
        // if all contracts are exhausted here, set sleeves to infiltrate, else let contracts script handle it
        if (contracts.every(con => ns.bladeburner.getActionCountRemaining('contract', con) <= 0)) toggleSleeveInfiltrate(true);
        await performAction('gen', 'Incite Violence', 1, false, false);
      }
    }
  }

  function logAction() {
    ns.clearLog();
    const divider = ' -----------------------------------------------', lines = [];

    lines.push(' h----------------==={ sNOTE h}===-----------------');
    lines.push(` s${fillWhitespaces((divider.length / 2) - (logNote.length / 2) - 1)}v${logNote}`);

    lines.push(' h---------------==={ sCURRENT h}===---------------');
    lines.push(` s${fillWhitespaces((divider.length / 2) - (log.Action.Name.length / 2))}v${log.Action.Name}`);
    log.Action.Type !== 'gen' && lines.push(`${fillWhitespaces(divider.length / 4)} hChance: v${ns.formatPercent(log.Action.Chance, 2)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hTime: v${Math.round(ns.bladeburner.getActionCurrentTime() / 1e3)} / ${Math.round(log.Action.Time / 1e3)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 - 2)} hProgress: v${progressBar(ns.bladeburner.getActionCurrentTime() / log.Action.Time, 20)}`);
    (log.Action.Count !== Infinity && log.Action.Count !== 1) && lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hCount: v${log.Action.Count}`);

    lines.push(' h---------------==={ sSKILLS h}===----------------');
    lines.push(`${fillWhitespaces(divider.length / 3 - 2)} hRank: v${ns.formatNumber(log.Rank, log.Rank >= 1e6 ? 3 : 0, 1e6)}` +
      `${rankGain > 0 ? ` (+ ~${ns.formatNumber(rankGain, rankGain >= 1e6 ? 1 : 0, 1e6)})` : ''}`);
    lines.push(`${fillWhitespaces(divider.length / 3 - 10)} hSkill Points: v${ns.formatNumber(log["Skill Points"], log["Skill Points"] > 1e6 ? 3 : 0, 1e6)}` +
      `${spGain > 0 ? ` (+ ~${ns.formatNumber(Math.trunc(spGain), 3, 1e6)})` : ''}`);

    skillsToUse.forEach(skill => {
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
      const rankMet = log.Rank > actions.BlackOp[currentBlackOp].reqdRank;
      lines.push(' h--------------==={ sBLACK OP h}===---------------');
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${currentBlackOp.substring(10)}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hChance: ${log['Black Op Chance'] > chanceLimits.blackOp ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(log['Black Op Chance'], 2)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hRank: v${ns.formatNumber(actions.BlackOp[currentBlackOp].reqdRank, 3)} -` +
        ` ${rankMet ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(log.Rank / actions.BlackOp[currentBlackOp].reqdRank)}`);
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
    ns.resizeTail((divider.length - 2) * 10, lines.length * 25 + 20);
  }

  /** * Starts the specified action a certain amount of time and write to log.
   ** Also check stamina beforehand.
   * @param {string} type Type of the action.
   * @param {string} action Name of the action.
   * @param {number} count The action count. Defaults to ```1```.
   * @param {boolean} stamina Whether to check stamina. Set to ```false``` to avoid stamina check (and possible infinite loop). Defaults to ```true```.
   * @param {boolean} blackOp Whether to check for Black Op. Set to ```false``` to disable Black Op (why?). Defaults to ```true```. */
  async function performAction(type = '', action = '', count = 1, stamina = true, blackOp = true) {
    log.Action = { ...log.Action, Name: action, Type: type };
    const titleAction = type !== 'blackop' ? action : 'Op. ' + action.substring(10);

    if (ns.bladeburner.startAction(type, action)) {
      for (let i = 1; i <= count; i++) {
        if (ns.bladeburner.getActionCountRemaining(type, action) <= 0) break;

        log.Rank = ns.bladeburner.getRank();
        log.Action = {
          ...log.Action,
          Chance: getActionChance(type, action), Count: ns.bladeburner.getActionCountRemaining(type, action), Time: ns.bladeburner.getActionTime(type, action),
        };
        log.City = { ...log.City, Population: ns.bladeburner.getCityEstimatedPopulation(log.City.Name), Chaos: ns.bladeburner.getCityChaos(log.City.Name), };
        if (postBlade || action === 'Assassination') {
          const successes = ns.bladeburner.getActionSuccesses('op', 'Assassination'), maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
          log.Assassination = {
            ...log.Assassination,
            Chance: getActionChance('op', 'Assassination'), Level: maxLevel, Successes: successes, Needed: Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - successes,
          };
        }

        rankGain = getActionRankGain(type, action);
        spGain = Math.trunc(rankGain / 3) + ((log.Rank % 3) + (rankGain % 3) >= 3 ? 1 : 0);

        if (!postBlade) {
          stamina && await checkStamina();
          blackOp && await checkBlackOps();
        }

        ns.setTitle(`R:${ns.formatNumber(log.Rank, log.Rank >= 1e6 ? 2 : 0, 1e6)} | ` + (postBlade ? ' ' : `D:${ns.formatPercent(getActionChance('blackop', 'Operation Daedalus'), 0)} | `) + titleAction);

        let current = ns.bladeburner.getActionCurrentTime();

        while (current <= log.Action.Time) {
          if (postBlade) log.Assassination.Count = ns.bladeburner.getActionCountRemaining('op', 'Assassination');
          log["Skill Points"] = ns.bladeburner.getSkillPoints();
          logAction();
          await ns.sleep(1e3);
          const bonus = ns.bladeburner.getBonusTime();
          current = ns.bladeburner.getActionCurrentTime();
          if (ns.bladeburner.getCurrentAction().type === 'Idle' || (bonus <= 1e3 && current === 0) || (bonus > 1e3 && current < 5e3)) break;
        }
        await upgradeSkills();
      }
    }
  }

  /** Moves to city with the highest estimated population. */
  function checkCity() {
    const citiesSortedPop = cities.sort((a, b) => ns.bladeburner.getCityEstimatedPopulation(b) - ns.bladeburner.getCityEstimatedPopulation(a));
    if (citiesSortedPop.length > 0) ns.bladeburner.switchCity(citiesSortedPop[0]);
    log.City.Name = ns.bladeburner.getCity();
    log.City = { ...log.City, Population: ns.bladeburner.getCityEstimatedPopulation(log.City.Name), Chaos: ns.bladeburner.getCityChaos(log.City.Name), };
  }

  /** Check population accuracy, increase if necessary. */
  async function checkPopAccuracy() {
    // const truePop = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bladeburner.data.cities[log.City.Name].data.pop;
    logNote = 'Increasing population accuracy';

    while (ns.bladeburner.getCityEstimatedPopulation(log.City.Name) !== JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bladeburner.data.cities[log.City.Name].data.pop) {
      if (getActionChance('op', 'Undercover Operation') >= chanceLimits.operation
        && ns.bladeburner.getActionCountRemaining('op', 'Undercover Operation') > 0
        && ns.bladeburner.getActionTime('op', 'Undercover Operation') <= 30e3)
        await performAction('op', 'Undercover Operation', 1, false, false);

      else if (getActionChance('op', 'Investigation') >= chanceLimits.operation
        && ns.bladeburner.getActionCountRemaining('op', 'Investigation') > 0
        && ns.bladeburner.getActionTime('op', 'Investigation') <= 30e3)
        await performAction('op', 'Investigation', 1, false, false);

      else await performAction('gen', 'Field Analysis', 1, false, false);
    }
  }

  /** Regen if stamina is less than half. Regen until full. */
  async function checkStamina() {
    if (ns.bladeburner.getStamina()[0] < 0.5 * ns.bladeburner.getStamina()[1]) {
      logNote = 'Increasing stamina';
      while (ns.bladeburner.getStamina()[0] < ns.bladeburner.getStamina()[1])
        await performAction('gen', 'Hyperbolic Regeneration Chamber', 1, false, false);
    }
  }

  /** Continuously upgrade skill while SP is sufficient. Speed increases as points accumulate. */
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
    if (ns.bladeburner.getActionCountRemaining(type, name) <= 0) {
      ns.toast(`Remaining Work of ${name} is 0. Use Sleeve (Infiltrate) if possible.`, 'info', 20e3);
      return false;
    }
    return true;
  }

  /** Starts ```Diplomacy``` if chaos is too high and is affecting success chance, nothing otherwise. */
  async function checkChaos() {
    const currentCity = ns.bladeburner.getCity();
    if (postBlade) {
      const [con, op] = [getActionChance('contract', 'Bounty Hunter'), getActionChance('op', 'Assassination')];
      if (con >= 1 && op >= 1) {
        toggleSleeveDiplomacy(false);
        return;
      }
    } else if (ns.bladeburner.getCityChaos(currentCity) <= 50) return;

    toggleSleeveDiplomacy(true);
    logNote = 'Decreasing Chaos';
    while (ns.bladeburner.getCityChaos(currentCity) > 50) await performAction('gen', 'Diplomacy', 1, false, false);
    toggleSleeveDiplomacy(false);
  }

  /** Perform the current blackop if ```chance === 100%``` and ```rank``` is sufficient. */
  async function checkBlackOps() {
    currentBlackOp = getCurrentBlackOp();
    while (1) {
      if (postBlade) return;

      if (ns.bladeburner.getRank() < actions.BlackOp[currentBlackOp].reqdRank) return;
      if (getActionChance('blackop', currentBlackOp) < chanceLimits.blackOp) return;

      await performAction('blackop', currentBlackOp, 1, true, false);

      // if succeed, notify the user and update the blackop
      const nextBlackOp = getCurrentBlackOp();
      if (nextBlackOp !== currentBlackOp) {
        ns.toast(`Successfully completed ${currentBlackOp}`, 'success', 5e3);
        if (!nextBlackOp) {
          postBlade = true;
          skillsToUse = getAllSkills();
          ns.alert(`!  Operation Daedalus is accomplished  !\nDestroy this BitNode when you're ready`);
          // Log the time of the Daedalus completion to terminal, only if it is actually performed, not just finished
          ns.tprintf(`\n(!) Finished Daedalus at: ${(new Date()).toLocaleString()}`, 0);
        }
        else {
          currentBlackOp = nextBlackOp;
          log['Black Op Chance'] = getActionChance('blackop', currentBlackOp);
        }
      }
    }
  }

  /** Get the name of the next available black op. If there is no black op, returns ```null```.
   * @returns The next available black op name. */
  function getCurrentBlackOp() {
    if (ns.bladeburner.getActionCountRemaining('blackop', 'Operation Daedalus') <= 0) return null;
    let currentBlackOp = '';
    blackOps.forEach(bo => {
      if (currentBlackOp === '' && ns.bladeburner.getActionCountRemaining('blackop', bo) > 0) currentBlackOp = bo;
    });
    return currentBlackOp;
  }

  /** Chooses the best operation. Always return ```Assassination``` if is in Post-Blade.
   * @returns The best operation that is currently available. */
  function getBestOp() {
    if (postBlade) return 'Assassination';
    let bestOp = '';
    operations.forEach(op => {
      if (bestOp !== '') return;
      if (ns.bladeburner.getActionCountRemaining('op', op) > 0 && getActionChance('op', op) >= chanceLimits.operation)
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

  /** @param {string} _type Type of action.
   * @param {string} _name Name of action.
   * @returns Estimated rank gain. */
  function getActionRankGain(_type, _name) {
    if (_type.toLowerCase().includes('gen')) return;
    const actionObject = _type.toLowerCase().includes('con') ? actions.Contract[_name] : _type.toLowerCase().includes('black') ? actions.BlackOp[_name] : actions.Operation[_name];
    const rewardMultiplier = Math.pow(actionObject.rewardFac, ns.bladeburner.getActionMaxLevel(_type, _name) - 1);
    return actionObject.rankGain * rewardMultiplier * nodeRank;
  }

  /** Return the success chance of the given action if you're in the given city (not represented as percentage or within 0-1).
   * @param {string} type Type of the action. ```Contract``` or ```Operation```.
   * @param {string} actionName Name of the action.
   * @param {string} city City name. Default is the current city.
   * @returns Success chance of the action. */
  function getActionChance(type, actionName, city = ns.bladeburner.getCity()) {
    if (type.toLowerCase().includes('gen')) return;
    if (!cities.includes(city)) return;

    const action = type.toLowerCase().includes('contract') ? actions.Contract[actionName] : actions.Operation[actionName];

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
  return `\x1b[38;2;${r};${g};${b}m`;
}

/** Return a ```string``` representation of progress as a bar.
 * @param {number} progress The current progress.
 * @param {number} maxChar The number of characters the progress bar should display, excluding the enclosing characters.
 * @returns The progress bar as a ```string```. */
function progressBar(progress, maxChar = 10) {
  progress = Math.min(1, Math.max(progress, 0));
  const fullCount = Math.round(progress * maxChar),
    // 0-0.2: red, 0.2-0.5: orange, 0.5-0.7: yellow, 0.7-0.9: lime, 0.9-1: green
    color = fullCount > Math.round(0.9 * maxChar) ? '\x1b[38;5;10m' : fullCount > Math.round(0.7 * maxChar) ? '\x1b[38;5;154m' : fullCount > Math.round(0.5 * maxChar) ? '\x1b[38;5;11m' : fullCount > Math.round(0.2 * maxChar) ? '\x1b[38;5;208m' : '\x1b[38;5;9m';
  return `[${color}${'█'.repeat(fullCount)}\x1b[38;5;235m${'█'.repeat(Math.max(0, maxChar - fullCount))}\x1b[38;5;15m]`;
}

const fillWhitespaces = (count = 0) => ' '.repeat(count);

const chanceLimits = {
  contract: 0.6,
  operation: 0.8,
  blackOp: 0.95,
};

const currentBN = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bitNodeN;
const bnSkillCost = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1.2, 10: 1, 11: 1, 13: 2 };
const bnRank = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0.6, 8: 0, 9: 0.9, 10: 0.8, 11: 1, 13: 0.45 };

// connect to sleeves
const sleeveControl = {
  runContract: false,
  runDiplomacy: false,
  runInfiltrate: false,
};

const log = {
  Action: { Name: '', Type: '', Chance: 0, Count: 0, Time: 0, },
  Rank: 0, 'Skill Points': 0,
  City: { Name: '', Population: 0, Chaos: 0, },
  'Black Op Chance': 0,
  Assassination: { Chance: 0, Level: 0, Successes: 0, Needed: 0, Count: 0, },
};

const cities = ['Aevum', 'Chongqing', 'Sector-12', 'New Tokyo', 'Ishima', 'Volhaven'];
const contracts = ['Retirement', 'Bounty Hunter', 'Tracking'];
const operations = ['Assassination', 'Stealth Retirement Operation', 'Sting Operation', 'Undercover Operation', 'Investigation'];
const blackOps = ['Operation Typhoon', 'Operation Zero', 'Operation X', 'Operation Titan', 'Operation Ares', 'Operation Archangel', 'Operation Juggernaut', 'Operation Red Dragon', 'Operation K', 'Operation Deckard', 'Operation Tyrell', 'Operation Wallace', 'Operation Shoulder of Orion', 'Operation Hyron', 'Operation Morpheus', 'Operation Ion Storm', 'Operation Annihilus', 'Operation Ultron', 'Operation Centurion', 'Operation Vindictus', 'Operation Daedalus'];
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
      rewardFac: 1.041,
      rankGain: 0.3,
      weights: { hack: 0, str: 0.05, def: 0.05, dex: 0.35, agi: 0.35, cha: 0.1, int: 0.05, },
      decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.9, int: 1, },
      isStealth: true,
    },
    'Bounty Hunter': {
      baseDifficulty: 250,
      difficultyFac: 1.04,
      rewardFac: 1.085,
      rankGain: 0.9,
      weights: { hack: 0, str: 0.15, def: 0.15, dex: 0.25, agi: 0.25, cha: 0.1, int: 0.1, },
      decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.8, int: 0.9, },
      isKill: true,
    },
    Retirement: {
      baseDifficulty: 200,
      difficultyFac: 1.03,
      rewardFac: 1.065,
      rankGain: 0.6,
      weights: { hack: 0, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0.1, int: 0.1, },
      decays: { hack: 0, str: 0.91, def: 0.91, dex: 0.91, agi: 0.91, cha: 0.8, int: 0.9, },
      isKill: true,
    }
  },
  Operation: {
    Investigation: {
      baseDifficulty: 400,
      difficultyFac: 1.03,
      rewardFac: 1.07,
      rankGain: 2.2,
      weights: { hack: 0.25, str: 0.05, def: 0.05, dex: 0.2, agi: 0.1, cha: 0.25, int: 0.1, },
      decays: { hack: 0.85, str: 0.9, def: 0.9, dex: 0.9, agi: 0.9, cha: 0.7, int: 0.9, },
      isStealth: true,
    },
    "Undercover Operation": {
      baseDifficulty: 500,
      difficultyFac: 1.04,
      rewardFac: 1.09,
      rankGain: 4.4,
      weights: { hack: 0.2, str: 0.05, def: 0.05, dex: 0.2, agi: 0.2, cha: 0.2, int: 0.1, },
      decays: { hack: 0.8, str: 0.9, def: 0.9, dex: 0.9, agi: 0.9, cha: 0.7, int: 0.9, },
      isStealth: true,
    },
    "Sting Operation": {
      baseDifficulty: 650,
      difficultyFac: 1.04,
      rewardFac: 1.095,
      rankGain: 5.5,
      weights: { hack: 0.25, str: 0.05, def: 0.05, dex: 0.25, agi: 0.1, cha: 0.2, int: 0.1, },
      decays: { hack: 0.8, str: 0.85, def: 0.85, dex: 0.85, agi: 0.85, cha: 0.7, int: 0.9, },
      isStealth: true,
    },
    "Stealth Retirement Operation": {
      baseDifficulty: 1000,
      difficultyFac: 1.05,
      rewardFac: 1.11,
      rankGain: 22,
      weights: { hack: 0.1, str: 0.1, def: 0.1, dex: 0.3, agi: 0.3, cha: 0, int: 0.1, },
      decays: { hack: 0.7, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.9, },
      isStealth: true,
      isKill: true,
    },
    Assassination: {
      baseDifficulty: 1500,
      difficultyFac: 1.06,
      rewardFac: 1.14,
      rankGain: 44,
      weights: { hack: 0.1, str: 0.1, def: 0.1, dex: 0.3, agi: 0.3, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.8, },
      isStealth: true,
      isKill: true,
    }
  },
  BlackOp: {
    'Operation Typhoon': {
      baseDifficulty: 2000,
      reqdRank: 2.5e3,
      rankGain: 50,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Zero': {
      baseDifficulty: 2500,
      reqdRank: 5e3,
      rankGain: 60,
      weights: { hack: 0.2, str: 0.15, def: 0.15, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isStealth: true,
    },
    'Operation X': {
      baseDifficulty: 3000,
      reqdRank: 7.5e3,
      rankGain: 75,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Titan': {
      baseDifficulty: 4000,
      reqdRank: 10e3,
      rankGain: 100,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Ares': {
      baseDifficulty: 5000,
      reqdRank: 12.5e3,
      rankGain: 125,
      weights: { hack: 0, str: 0.25, def: 0.25, dex: 0.25, agi: 0.25, cha: 0, int: 0, },
      decays: { hack: 0, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Archangel': {
      baseDifficulty: 7500,
      reqdRank: 15e3,
      rankGain: 200,
      weights: { hack: 0, str: 0.2, def: 0.2, dex: 0.3, agi: 0.3, cha: 0, int: 0, },
      decays: { hack: 0, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Juggernaut': {
      baseDifficulty: 10e3,
      reqdRank: 20e3,
      rankGain: 300,
      weights: { hack: 0, str: 0.25, def: 0.25, dex: 0.25, agi: 0.25, cha: 0, int: 0, },
      decays: { hack: 0, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Red Dragon': {
      baseDifficulty: 12.5e3,
      reqdRank: 25e3,
      rankGain: 500,
      weights: { hack: 0.05, str: 0.2, def: 0.2, dex: 0.25, agi: 0.25, cha: 0, int: 0.05, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation K': {
      baseDifficulty: 15e3,
      reqdRank: 30e3,
      rankGain: 750,
      weights: { hack: 0.05, str: 0.2, def: 0.2, dex: 0.25, agi: 0.25, cha: 0, int: 0.05, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Deckard': {
      baseDifficulty: 20e3,
      reqdRank: 40e3,
      rankGain: 1e3,
      weights: { hack: 0, str: 0.24, def: 0.24, dex: 0.24, agi: 0.24, cha: 0, int: 0.04, },
      decays: { hack: 0, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Tyrell': {
      baseDifficulty: 25e3,
      reqdRank: 50e3,
      rankGain: 1.5e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Wallace': {
      baseDifficulty: 30e3,
      reqdRank: 75e3,
      rankGain: 2e3,
      weights: { hack: 0, str: 0.24, def: 0.24, dex: 0.24, agi: 0.24, cha: 0, int: 0.04, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Shoulder of Orion': {
      baseDifficulty: 35e3,
      reqdRank: 100e3,
      rankGain: 2.5e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isStealth: true,
    },
    'Operation Hyron': {
      baseDifficulty: 40e3,
      reqdRank: 125e3,
      rankGain: 3e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Morpheus': {
      baseDifficulty: 45e3,
      reqdRank: 150e3,
      rankGain: 4e3,
      weights: { hack: 0.05, str: 0.15, def: 0.15, dex: 0.3, agi: 0.3, cha: 0, int: 0.05, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isStealth: true,
    },
    'Operation Ion Storm': {
      baseDifficulty: 50e3,
      reqdRank: 175e3,
      rankGain: 5e3,
      weights: { hack: 0, str: 0.24, def: 0.24, dex: 0.24, agi: 0.24, cha: 0, int: 0.04, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Annihilus': {
      baseDifficulty: 55e3,
      reqdRank: 200e3,
      rankGain: 7.5e3,
      weights: { hack: 0, str: 0.24, def: 0.24, dex: 0.24, agi: 0.24, cha: 0, int: 0.04, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Ultron': {
      baseDifficulty: 60e3,
      reqdRank: 250e3,
      rankGain: 10e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
      isKill: true,
    },
    'Operation Centurion': {
      baseDifficulty: 70e3,
      reqdRank: 300e3,
      rankGain: 15e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
    },
    'Operation Vindictus': {
      baseDifficulty: 75e3,
      reqdRank: 350e3,
      rankGain: 20e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
    },
    'Operation Daedalus': {
      baseDifficulty: 80e3,
      reqdRank: 400e3,
      rankGain: 40e3,
      weights: { hack: 0.1, str: 0.2, def: 0.2, dex: 0.2, agi: 0.2, cha: 0, int: 0.1, },
      decays: { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.75, },
    },
  }
};