/** Version 4.12.5
 * Limits operations to generate to 100
 * If chaos to high, Diplomacy until chaos is 50 or less
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
    value: getColor(ns.ui.getTheme().white),
  };

  let checkedCity = false;

  try {
    ns.bladeburner.getSkillLevel(`Cloak`);
  } catch (error) {
    ns.alert(`Haven't joined Bladeburner yet\n`);
    ns.exit();
  }

  // shortened function
  const successChance = (type = '', name = '') => ns.bladeburner.getActionEstimatedSuccessChance(type, name);
  const populationOf = city => ns.bladeburner.getCityEstimatedPopulation(city);
  const actionCount = (type = '', name = '') => ns.bladeburner.getActionCountRemaining(type, name);

  let postBlade = false;
  let currentBlackOp = getCurrentBlackOp();
  postBlade = currentBlackOp === '' ? true : false;

  currentBlackOp = getCurrentBlackOp();
  let currentOp = getBestOp();

  let rankGain = [Infinity, 0];

  while (ns.bladeburner.getCurrentAction().type === 'BlackOp') {
    logAction('BlackOp', ns.bladeburner.getCurrentAction().name);
    await ns.sleep(1e3);
  }

  // main loop
  while (1) {
    // general
    checkCity();
    if (postBlade) {
      await checkAccuracy('contract', 'Tracking');
      if (successChance('contract', 'Tracking')[0] < chanceLimits.contract) {
        await checkChaos();
        await performAction('gen', 'Training');
        await performAction('gen', 'Field Analysis');
      }

      // contracts
      await checkAccuracy('contract', 'Tracking');
      if (successChance('contract', 'Tracking')[0] >= chanceLimits.contract && currentOp === '') {
        for (const con of contracts) {
          await checkAccuracy('contract', con);
          if (successChance('contract', con)[0] < chanceLimits.contract || !checkWorkCount('contract', con)) continue;
          await performAction('contract', con, Math.min(actionCount('contract', con), 10));
        }
      }
    }

    currentOp = getBestOp();
    if (currentOp !== '') {
      await checkAccuracy('op', currentOp);
      const count = postBlade
        ? actionCount('op', currentOp)
        : Math.min(actionCount('op', currentOp), Math.trunc(Math.random() * 7 + 13)); // 13-20
      await performAction('op', currentOp, count);
    }

    await ns.sleep(1);
    if (postBlade) {
      await checkChaos();
      if (actionCount('op', 'Assassination') <= 0) {
        const maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
        const opToGenerate = Math.min(100, Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - ns.bladeburner.getActionSuccesses('op', 'Assassination'));
        while (actionCount('op', 'Assassination') < opToGenerate) {
          await ns.sleep(10);
          await performAction('gen', 'Incite Violence', 1, false, false);
        }
      }
    }
    await ns.sleep(1);
  }

  function logAction(type, name, count = 1, maxCount = 1) {
    const divider = ' ---------------------------------------------------';
    ns.clearLog();

    const lines = [];
    const skillToPrint = getAllSkills();

    let maxSkillWidth = Math.max('Rank'.length, 'Skill Points'.length);
    skillToPrint.forEach(skill => {
      if (ns.bladeburner.getSkillLevel(skill.name) > 0)
        maxSkillWidth = Math.max(maxSkillWidth, skill.name.length);
    });
    const currentSP = ns.bladeburner.getSkillPoints();
    const currentRank = ns.bladeburner.getRank();
    const rankMet = currentRank > blackOpRanks[currentBlackOp];
    const taskCount = actionCount(type, name);
    const totalTime = ns.bladeburner.getActionTime(type, name);

    lines.push(' h-----------------==={ sCURRENT h}===-----------------');
    const task = `${name}` + (maxCount > 1 ? ` (${count} / ${maxCount})` : '');
    lines.push(` s${fillWhitespaces((divider.length / 2) - (task.length / 2))}v${task}`);
    type !== 'General' && lines.push(`${fillWhitespaces(divider.length / 4)} hChance: v${ns.formatPercent(successChance(type, name)[0], 2)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hTime: v${formatTime(ns.bladeburner.getActionCurrentTime())} / ${formatTime(totalTime)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 - 2)} hProgress: v${progressBar(ns.bladeburner.getActionCurrentTime(), totalTime, 20)}`);
    (taskCount !== Infinity && taskCount !== 1) && lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hCount: v${taskCount}`);

    lines.push(' h-----------------==={ sSKILLS h}===------------------');
    const rankGainAvg = (rankGain[0] + rankGain[1]) / 2;
    const spGainAvg = Math.trunc(rankGainAvg / 3) + ((currentRank % 3) + (rankGainAvg % 3) >= 3 ? 1 : 0);

    lines.push(`${fillWhitespaces(divider.length / 3 - 2)} hRank: v${ns.formatNumber(currentRank, currentRank >= 1e6 ? 3 : 0, 1e6)}` +
      `${rankGainAvg > 0 && rankGainAvg !== Infinity ? ` (+ ~${ns.formatNumber(rankGainAvg, rankGainAvg >= 1e6 ? 1 : 0, 1e6)})` : ''}`);
    lines.push(`${fillWhitespaces(divider.length / 3 - 10)} hSkill Points: v${ns.formatNumber(currentSP, currentSP > 1e6 ? 3 : 0, 1e6)}` +
      `${spGainAvg > 0 && spGainAvg !== Infinity ? ` (+ ~${ns.formatNumber(Math.trunc(spGainAvg), 3, 1e6)})` : ''}`);

    skillToPrint.forEach(skill => {
      if (ns.bladeburner.getSkillLevel(skill.name) > 0) {
        if (skill.name === 'Overclock' && ns.bladeburner.getSkillLevel('Overclock') >= 90) return;
        const sp = ns.bladeburner.getSkillUpgradeCost(skill.name);
        lines.push(
          `${fillWhitespaces(divider.length / 3 - (skill.name.length) + 2)} h${skill.name}: v${ns.formatNumber(ns.bladeburner.getSkillLevel(skill.name), 3, 1e6)} - ` +
          (ns.bladeburner.getSkillPoints() >= sp ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`) + `${ns.formatNumber(sp, 3, 1e6)}`
        );
      }
    });

    if (!postBlade) {
      lines.push(' h----------------==={ sBLACK OP h}===-----------------');
      const chance = successChance('blackop', currentBlackOp)[0];
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${currentBlackOp.substring(10)}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hChance: ${chance > chanceLimits.blackOp ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(chance, 2)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hRank: v${ns.formatNumber(blackOpRanks[currentBlackOp], 3)} -` +
        ` ${rankMet ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(currentRank / blackOpRanks[currentBlackOp])}`);
    }
    else {
      const city = ns.bladeburner.getCity();
      lines.push(' h------------------==={ sCITY h}===-------------------');
      lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${city}`);
      lines.push(`${fillWhitespaces(divider.length / 4 - 4)} hPopulation: v${ns.formatNumber(populationOf(city), 3)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hChaos: v${ns.formatNumber(ns.bladeburner.getCityChaos(city), 3)}`);

      lines.push(' h--------------==={ sASSASSINATION h}===--------------');
      const maxLevel = ns.bladeburner.getActionMaxLevel('op', 'Assassination');
      const successes = ns.bladeburner.getActionSuccesses('op', 'Assassination');
      lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hLevel: v${maxLevel}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hChance: v${ns.formatPercent(successChance('op', 'Assassination')[0], 2)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 - 3)} hSuccesses: v${ns.formatNumber(successes, 3, 1e6)}`);
      lines.push(`${fillWhitespaces(divider.length / 4)} hNeeded: v${ns.formatNumber(Math.ceil(0.5 * maxLevel * (2 * 2.5 + (maxLevel - 1))) - successes, 3, 1e6)}`);
      lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hCount: v${actionCount('op', 'Assassination')}`);
    }

    ns.print(lines
      .join('\n')
      .replaceAll(' s', ` ${colors.section}`)
      .replaceAll(' h', ` ${colors.header}`)
      .replaceAll(' v', ` ${colors.value}`)
    );
    ns.resizeTail((divider.length - 2) * 10, lines.length * 25 + 25);
  }

  /** Calculates the best city based on the population, chaos, player stats and Bladeburner skills (from source code). */
  function checkCity() {
    if (cities.every(c => populationOf(c)) <= 0) {
      if (checkedCity) return;
      const cityData =
        Object.values(JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bladeburner.data.cities)
          .map(c => c.data)
          .sort((a, b) => b.pop - a.pop);
      ns.bladeburner.switchCity(cityData[0].name);
      checkedCity = true;
    }
    else {
      const citiesSortedPop = cities.sort((a, b) => populationOf(b) - populationOf(a));
      if (citiesSortedPop.length > 0) ns.bladeburner.switchCity(citiesSortedPop[0]);
      checkedCity = false;
    }
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

  /** * Starts the specified action a certain amount of time and write to log.
   ** Also check stamina beforehand.
   * @param {string} type Type of the action.
   * @param {string} action Name of the action.
   * @param {number} count The action count. Defaults to ```1```.
   * @param {boolean} stamina Whether to check stamina. Set to ```false``` to avoid stamina check (and possible infinite loop). Defaults to ```true```.
   * @param {boolean} blackOp Whether to check for Black Op. Set to ```false``` to disable Black Op (why?). Defaults to ```true```. */
  async function performAction(type = '', action = '', count = 1, stamina = true, blackOp = true) {
    for (let i = 0; i < count; i++) {
      if (actionCount(type, action) <= 0) return;
      ns.bladeburner.stopBladeburnerAction();

      rankGain = [Infinity, 0];
      for (let j = 0; j < 30; j++) {
        const repGain = ns.bladeburner.getActionRepGain(type, action);
        const rank = repGain + (Math.random() * (repGain * 0.2) - repGain * 0.1);
        rankGain[0] = Math.min(rank, rankGain[0]);
        rankGain[1] = Math.max(rank, rankGain[1]);
      }
      if (rankGain[0] === Infinity) rankGain[0] = 0;
      if (!postBlade) {
        stamina && await checkStamina();
        blackOp && await checkBlackOps();
      }

      if (ns.bladeburner.startAction(type, action)) {
        const rank = ns.bladeburner.getRank();
        ns.setTitle(
          `R:${ns.formatNumber(rank, rank >= 1e6 ? 2 : 0, 1e6)} | ` +
          `D:${ns.formatPercent(successChance('blackop', 'Operation Daedalus')[0], 0)} | ` +
          `${count > 1 ? (i + 1) + '/' + count + ' ' : ''}${type !== 'blackop' ? action : 'Op. ' + action.substring(10)}`
        );

        const totalTime = ns.bladeburner.getActionTime(type, action);
        let current = ns.bladeburner.getActionCurrentTime();

        while (current <= totalTime) {
          const bonus = ns.bladeburner.getBonusTime();
          await ns.sleep(1e3);
          logAction(ns.bladeburner.getCurrentAction().type, ns.bladeburner.getCurrentAction().name, i + 1, count);
          current = ns.bladeburner.getActionCurrentTime();
          if (ns.bladeburner.getCurrentAction().type === 'Idle') break;
          if (bonus <= 1e3 && current === 0) break;
          if (bonus > 1e3 && current < 5e3) break;
        }
      }
      else i--;
      await upgradeSkills();
      await ns.sleep(0);
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
    const chaos = ns.bladeburner.getCityChaos(currentCity);
    if (postBlade) {
      if (getAssDisplayChance() >= 1) return;
      while (ns.bladeburner.getCityChaos(currentCity) > 50)
        await performAction('gen', 'Diplomacy', 1, false, false);
    } else {
      if (chaos <= 50) return;
      ns.toast(`Current Chaos is more than 50 (${chaos}). Use Sleeve (Diplomacy) if needed.`, 'info', 20e3);
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
        if (currentBlackOp.includes('Daedalus')) {
          postBlade = true;
          ns.alert(`!  Operation Daedalus is accomplished  !\nDestroy this BitNode when you're ready`);
          // Log the time of the Daedalus completion to terminal
          // Only if Daedalus is actually performed, not just finished
          ns.tprintf(`\n(!) Finished Daedalus at: ${(new Date()).toLocaleString()}`, 0);
        }
        else currentBlackOp = nextBlackOp;
      }
    }
  }

  function getCurrentBlackOp() {
    if (postBlade) return 'Operation Daedalus';
    let currentBlackOp = '';
    blackOps.forEach(bo => {
      if (currentBlackOp === '' && actionCount('blackop', bo) > 0) currentBlackOp = bo;
    });
    return currentBlackOp;
  }

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
    if (postBlade) {
      allSkills = skills.slice(-1);
      // allSkills.push({ name: 'Hands of Midas', baseCost: 2, costInc: 2.5 });
    }
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

  function getAssDisplayChance() {
    return Math.min(1, getAssActualChance());
  }

  function getAssActualChance() {
    let difficulty = 1500 * Math.pow(1.06, ns.bladeburner.getActionMaxLevel('op', 'Assassination') - 1);
    let competence = 0;

    for (const stat of Object.keys(weights)) {
      if (Object.hasOwn(weights, stat)) {
        const playerStatLvl = queryStatFromString(stat); // getPlayer().skills
        const key = "eff" + stat.charAt(0).toUpperCase() + stat.slice(1);
        let effMultiplier = getSkillMults(key);
        if (effMultiplier === null) effMultiplier = 1;
        competence += weights[stat] * Math.pow(effMultiplier * playerStatLvl, decays[stat]);
      }
    }
    competence *= calculateIntelligenceBonus(ns.getPlayer().skills.intelligence, 0.75);
    competence *= calculateStaminaPenalty();

    // competence *= getTeamSuccessBonus(inst);
    competence *= 1;

    competence *= getChaosCompetencePenalty();
    difficulty *= getChaosDifficultyBonus();

    // Factor skill multipliers into success chance
    competence *= getSkillMults('successChanceAll');
    competence *= getSkillMults('successChanceOperation');
    competence *= getSkillMults('successChanceStealth');
    competence *= getSkillMults('successChanceKill');
    competence *= ns.getPlayer().mults.bladeburner_success_chance;

    return competence / difficulty;
  }

  function queryStatFromString(str) {
    const tempStr = str.toLowerCase();
    if (tempStr.includes("hack")) return ns.getPlayer().skills.hacking;
    if (tempStr.includes("str")) return ns.getPlayer().skills.strength;
    if (tempStr.includes("def")) return ns.getPlayer().skills.defense;
    if (tempStr.includes("dex")) return ns.getPlayer().skills.dexterity;
    if (tempStr.includes("agi")) return ns.getPlayer().skills.agility;
    if (tempStr.includes("cha")) return ns.getPlayer().skills.charisma;
    if (tempStr.includes("int")) return ns.getPlayer().skills.intelligence;
  }

  function getSkillMults(str) {
    if (str.includes("Str")) return ns.bladeburner.getSkillLevel('Reaper') * 0.02;
    if (str.includes("Def")) return ns.bladeburner.getSkillLevel('Reaper') * 0.02;
    if (str.includes("Dex")) return ns.bladeburner.getSkillLevel('Reaper') * 0.02 * ns.bladeburner.getSkillLevel('Evasive System') * 0.04;
    if (str.includes("Agi")) return ns.bladeburner.getSkillLevel('Reaper') * 0.02 * ns.bladeburner.getSkillLevel('Evasive System') * 0.04;
    if (str.includes("ChanceAll")) return ns.bladeburner.getSkillLevel(`Blade's Intuition`) * 0.03;
    if (str.includes("ChanceStealth")) return ns.bladeburner.getSkillLevel(`Cloak`) * 0.055;
    if (str.includes("ChanceKill")) return ns.bladeburner.getSkillLevel(`Short-Circuit`) * 0.055;
    if (str.includes("ChanceOperation")) return ns.bladeburner.getSkillLevel(`Digital Observer`) * 0.04;
    return 1;
  }

  function calculateIntelligenceBonus(intelligence, weight = 1) {
    return 1 + (weight * Math.pow(intelligence, 0.8)) / 600;
  }

  function calculateStaminaPenalty() {
    const [stamina, maxStamina] = ns.bladeburner.getStamina();
    return Math.min(1, stamina / (0.5 * maxStamina));
  }

  function getChaosCompetencePenalty() {
    return Math.pow(ns.bladeburner.getCityEstimatedPopulation(ns.bladeburner.getCity()) / 1e9, 0.7);
  }

  function getChaosDifficultyBonus() {
    const chaos = ns.bladeburner.getCityChaos(ns.bladeburner.getCity());
    if (chaos > 50) {
      const diff = 1 + (chaos - 50);
      const mult = Math.pow(diff, 0.5);
      return mult;
    }
    return 1;
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

/** Convert time in milliseconds to ```string``` representation.
 * @param {number} time The time in milliseconds
 * @return {string} The formatted time: ```mm:ss``` */
function formatTime(time = 0) {
  let min = Math.trunc(time / 6e4);
  let sec = Math.trunc(time % 6e4) / 1e3;
  sec = sec < 10 ? '0' + sec : sec;
  min = min < 10 ? '0' + min : min;
  return `${min}:${sec}`;
}

/** Return a ```string``` representation of progress as a bar.
 * @param {number} currentProgress The current progress.
 * @param {number} fullProgress Equals to ```100%``` of the progress.
 * @param {number} maxChar The number of characters the progress bar should display, excluding the enclosing characters.
 * @returns The progress bar as a ```string```. */
function progressBar(currentProgress, fullProgress, maxChar = 10) {
  const progress = Math.trunc(currentProgress / (fullProgress / maxChar));
  return `\u251c${'\u2588'.repeat(progress)}${'\u2500'.repeat(Math.max(0, maxChar - progress))}\u2524`;
}

const fillWhitespaces = (count = 0) => ' '.repeat(count);

const chanceLimits = {
  contract: 0.6,
  operation: 0.8,
  blackOp: 0.95,
};

const currentBN = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bitNodeN;
const bnSkillCost = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1.2, 10: 1, 11: 1, 13: 2 };

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
  { name: 'Reaper', baseCost: 2, costInc: 2.1 },
  { name: 'Evasive System', baseCost: 2, costInc: 2.1 },
  { name: 'Hyperdrive', baseCost: 1, costInc: 2.5 }
];
// Ass
const weights = { hack: 0.1, str: 0.1, def: 0.1, dex: 0.3, agi: 0.3, cha: 0, int: 0.1, },
  decays = { hack: 0.6, str: 0.8, def: 0.8, dex: 0.8, agi: 0.8, cha: 0, int: 0.8, };