/** Version 4.9.7
 * General actions are skipped if contract chances are sufficient
 * Check accuracy of operations
 * Log title is now the current action
 * Changed Daedalus log time format
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.clearLog();
  ns.tail();

  const chanceLimits = {
    contract: 0.6,
    operation: 0.8,
    blackOp: 0.95,
  };

  const colors = {
    section: getColor(ns.ui.getTheme().money),
    header: getColor(ns.ui.getTheme().hp),
    value: getColor(ns.ui.getTheme().white),
  };

  const blade = ns.bladeburner;

  try {
    blade.getContractNames();
  } catch (error) {
    ns.alert(`Haven't joined Bladeburner yet\n`);
    ns.exit();
  }

  // shortened function
  const player = () => ns.getPlayer();
  const successChance = (type = '', name = '') => blade.getActionEstimatedSuccessChance(type, name);
  const populationOf = city => blade.getCityEstimatedPopulation(city);
  const currentTime = () => blade.getActionCurrentTime();
  const actionCount = (type = '', name = '') => blade.getActionCountRemaining(type, name);
  const requiredSP = skill => blade.getSkillUpgradeCost(skill);

  // for chaos purpose
  const stealthSuccessMult = () => blade.getSkillLevel(`Cloak`) * 0.055 + 1;
  const retirementSuccessMult = () => blade.getSkillLevel(`Short-Circuit`) * 0.055 + 1;
  const opSuccessMult = () => blade.getSkillLevel(`Digital Observer`) * 0.04 + 1;

  // const
  const cities = Object.keys(ns.enums.CityName).map(c => ns.enums.CityName[c]);
  const contracts = blade.getContractNames().reverse();
  const operations = blade.getOperationNames();
  operations.splice(3, 1); // removes 'Raid'
  operations.reverse();

  let currentBlackOp = getCurrentBlackOp();
  let currentOp = getBestOp();

  let rankGain = [Infinity, 0];

  // main loop
  while (await ns.sleep(10)) {
    // general
    await checkAccuracy('contract', 'Tracking');
    if (successChance('contract', 'Tracking')[0] < chanceLimits.contract) {
      await checkCity();
      await checkChaos();
      await performAction('general', 'Training');
      await performAction('general', 'Field Analysis');
    }

    // contracts
    await checkAccuracy('contract', 'Tracking');
    if (successChance('contract', 'Tracking')[0] >= chanceLimits.contract && currentOp === '') {
      for (const con of contracts) {
        await checkCity();
        await checkAccuracy('contract', con);
        if (successChance('contract', con)[0] < chanceLimits.contract || !checkWorkCount('contract', con)) continue;
        await performAction('contract', con, Math.min(10, actionCount('contract', con)));
        await ns.sleep(10);
      }
    }

    currentOp = getBestOp();
    if (currentOp !== '') {
      await checkCity();
      await checkAccuracy('op', currentOp);
      await performAction('op', currentOp, Math.trunc(Math.random() * 7 + 13)); // 13-20
    }
  }

  function logAction(type = '', name = '', count = 1, maxCount = 1) {
    const divider = ' ---------------------------------------------------';
    ns.clearLog();

    const lines = [];

    const city = blade.getCity();
    let maxSkillWidth = Math.max('Rank'.length, 'Skill Points'.length);
    let skillCount = 0;
    blade.getSkillNames().forEach(skill => {
      if (blade.getSkillLevel(skill) > 0) {
        maxSkillWidth = Math.max(maxSkillWidth, skill.length);
        skillCount++;
      }
    });
    const currentSP = blade.getSkillPoints();
    const currentRank = blade.getRank();
    const blackOpRank = blade.getBlackOpRank(currentBlackOp);
    const rankMet = currentRank > blackOpRank;
    const taskCount = actionCount(type, name);
    const totalTime = blade.getActionTime(type, name);
    let lineCount = 21;

    lines.push(' h----------------==={ sCURRENT h}===------------------');
    const task = `${name}` + (maxCount > 1 ? ` (${count} / ${maxCount})` : '');
    lines.push(` s${fillWhitespaces((divider.length / 2) - (task.length / 2) - 1)}v${task}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hType: v${type}`);
    type !== 'General' && lines.push(`${fillWhitespaces(divider.length / 4)} hChance: v${ns.formatPercent(successChance(type, name)[0], 2)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hTime: v${formatTime(currentTime())} / ${formatTime(totalTime)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 - 2)} hProgress: v${progressBar(currentTime(), totalTime, 20)}`);
    (taskCount !== Infinity && taskCount !== 1) && lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hCount: v${taskCount}`);
    lines.push(`${fillWhitespaces(divider.length / 4 - 1)} hStamina: v${ns.formatPercent(blade.getStamina()[0] / blade.getStamina()[1], 3)}`);

    lines.push(' h------------------==={ sCITY h}===-------------------');
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${city}`);
    lines.push(`${fillWhitespaces(divider.length / 4 - 4)} hPopulation: v${ns.formatNumber(populationOf(city), 3)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 1)} hChaos: v${ns.formatNumber(blade.getCityChaos(city), 3)}`);

    lines.push(' h-----------------==={ sSKILLS h}===------------------');
    const rankGainAvg = (rankGain[0] + rankGain[1]) / 2;
    const spGainAvg = Math.trunc(rankGainAvg / 3) + ((currentRank % 3) + (rankGainAvg % 3) >= 3 ? 1 : 0);

    lines.push(`${fillWhitespaces(divider.length / 3 - 3)} hRank: v${ns.formatNumber(currentRank, 3)}` +
      `${rankGainAvg > 0 ? ` (+${ns.formatNumber(rankGainAvg, 3)} \u00b1 ${ns.formatNumber(rankGain[1] - rankGainAvg, 2)})` : ''}`);
    lines.push(`${fillWhitespaces(divider.length / 3 - 11)} hSkill Points: v${ns.formatNumber(currentSP, 3)}` +
      `${spGainAvg > 0 ? ` (+${Math.trunc(spGainAvg)} \u00b1` + ` ${Math.trunc(Math.abs(rankGain[1] / 3 - spGainAvg))})` : ''}`);

    blade.getSkillNames().forEach(skill => {
      if (blade.getSkillLevel(skill) > 0) {
        const sp = requiredSP(skill);
        lines.push(
          `${fillWhitespaces(divider.length / 3 - (skill.length) + 1)} h${skill}: v${ns.formatNumber(blade.getSkillLevel(skill), 3)} - ` +
          (skill === 'Overclock' && blade.getSkillLevel(skill) >= 90 ? 'MAX' :
            (blade.getSkillPoints() >= sp ? `${getColor('#00ff00')}`
              : `${getColor('#ff0000')}`) + `${sp}`)
        );
        lineCount++;
      }
    });

    lines.push(' h-----------------==={ sCHANCES h}===-----------------');
    lines.push(`${fillWhitespaces(divider.length / 10)} hAvg. Contract: v${ns.formatPercent(averageTaskChance('contract', contracts), 2)}`);
    lines.push(`${fillWhitespaces(divider.length / 10 - 1)} hAvg. Operation: v${ns.formatPercent(averageTaskChance('op', operations), 2)}`);

    lines.push(' h----------------==={ sBLACK OP h}===-----------------');
    const chance = successChance('blackop', currentBlackOp)[0];
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hName: v${currentBlackOp}`);
    lines.push(`${fillWhitespaces(divider.length / 4)} hChance: ${chance > chanceLimits.blackOp ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(chance, 2)}`);
    lines.push(`${fillWhitespaces(divider.length / 4 + 2)} hRank: v${ns.formatNumber(blackOpRank, 3)} -` +
      ` ${rankMet ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`}${ns.formatPercent(currentRank / blackOpRank)}`);

    ns.print(lines
      .join('\n')
      .replaceAll(' s', ` ${colors.section}`)
      .replaceAll(' h', ` ${colors.header}`)
      .replaceAll(' v', ` ${colors.value}`)
    );
    ns.resizeTail((divider.length - 2) * 10, lines.length * 25 + 15);
  }

  /** Calculates the best city based on the population, chaos, player stats and Bladeburner skills (from source code). */
  async function checkCity() {
    let citiesCopy = cities.slice();

    citiesCopy = citiesCopy.filter(c => populationOf(c) >= 1e9);

    if (citiesCopy.length > 0) {
      citiesCopy.sort((a, b) => getAverageChance(a) - getAverageChance(b));
      blade.switchCity(citiesCopy[citiesCopy.length - 1]);
    }

    await ns.sleep(50);
  }

  /** Loosely estimated average success chance of the specified ```city```.
   * 
   * Since this is hardcoded and there's no way to dynamically calculate them (Bitburner doesn't provide any way to get ```weight``` and ```decay```), this CAN break if the source changes.
   * @formula ```chance = competence / difficulty```
   * @see https://github.com/bitburner-official/bitburner-src/blob/dev/src/Bladeburner/Action.tsx#L239
  */
  function getAverageChance(city = '') {
    return Math.min(1, getCompetence(city) / getDifficulty(city));
  }

  /** Calculates the chaos threshold based on the loosely calculated situation of the specified ```city```.
   * @see {@link getAverageChance()}
   */
  function getChaosThreshold(city = '', chance = 1) {
    let contractLevel = 0, opLevel = 0;
    contracts.forEach(c => contractLevel += blade.getActionCurrentLevel('contract', c));
    operations.forEach(op => opLevel += blade.getActionCurrentLevel('op', op));
    const averageActionLevel = (contractLevel / contracts.length + opLevel / operations.length) / 2;

    return Math.pow(getCompetence(city) / (100 * chance * Math.pow((1.03 + 1.044) / 2, averageActionLevel - 1)), 2) + 49;
  }

  function getCompetence(city) {
    let competence = 0;
    // + actionWeight * Math.pow(skillMult * playerLvl, actionDecay) // for each stat
    competence += 0.083 * Math.pow(1 * player().skills.hacking, 0.37);
    competence += 0.1125 * Math.pow(1 * player().skills.strength, 0.876);
    competence += 0.1125 * Math.pow(1 * player().skills.defense, 0.876);
    competence += 0.254 * Math.pow(1 * player().skills.dexterity, 0.876);
    competence += 0.23 * Math.pow(1 * player().skills.agility, 0.876);
    competence += 0.104 * Math.pow(1 * player().skills.charisma, 0.592);
    competence += 0.097 * Math.pow(1 * player().skills.intelligence, 0.908);

    competence *= 1 + (0.75 * Math.pow(player().skills.intelligence, 0.8)) / 600;
    competence *= Math.min(1, blade.getStamina()[0] / (0.5 * blade.getStamina()[1]));
    competence *= Math.pow(populationOf(city) / 1e9, 0.7);
    competence *= (blade.getSkillLevel(`Blade's Intuition`) * 0.03 + 1);
    competence *= ((stealthSuccessMult() + retirementSuccessMult() * 2) / 3
      + (stealthSuccessMult() * 3 + retirementSuccessMult() + stealthSuccessMult() * retirementSuccessMult() * 2) * opSuccessMult() / 6) / 2;
    competence *= player().mults.bladeburner_success_chance;

    return competence;
  }

  // average difficultyFac: contract - 1.03, op - 1.044
  function getDifficulty(city) {
    let contractLevel = 0, opLevel = 0;
    contracts.forEach(c => contractLevel += blade.getActionCurrentLevel('contract', c));
    operations.forEach(op => opLevel += blade.getActionCurrentLevel('op', op));
    const averageActionLevel = (contractLevel / contracts.length + opLevel / operations.length) / 2;

    const chaos = blade.getCityChaos(city);
    let chaosBonus = chaos > 50 ? Math.pow(chaos - 49, 0.5) : 1;

    return 100 * Math.pow((1.03 + 1.044) / 2, averageActionLevel - 1) * chaosBonus;
  }

  /** If success chance accuracy of ```name``` is insufficient (```[0] != [1]```) starts ```Field Analysis``` */
  async function checkAccuracy(type, name) {
    while (successChance(type, name)[0] !== successChance(type, name)[1])
      await performAction('general', 'Field Analysis');
  }

  /** * Starts the specified action a certain amount of time and write to log.
   ** Also check stamina beforehand.
   * @param {string} type Type of the action.
   * @param {string} action Name of the action.
   * @param {number} count The action count. Defaults to ```1```.
   * @param {boolean} stamina Whether to check stamina. Set to ```false``` to avoid stamina check (and possible infinite loop). Defaults to ```true```.
   * @param {boolean} blackOp Whether to check for Black Op. Set to ```false``` to disable Black Op (why?). Defaults to ```true```.
  */
  async function performAction(type = '', action = '', count = 1, stamina = true, blackOp = true) {
    stamina && await checkStamina();
    if (currentBlackOp === '') { // Daedalus is done
      ns.alert(`=====  Operation Daedalus is accomplished  =====\n(!) Destroy this BitNode when you're ready (!)`);
      blade.stopBladeburnerAction();
      ns.closeTail();
      ns.exit();
    }

    for (let i = 0; i < count; i++) {
      // if (action === 'Field Analysis' || type === 'contract' || type === 'op' || type === 'blackop') {
      rankGain = [Infinity, 0];
      for (let j = 0; j < 50; j++) {
        const repGain = blade.getActionRepGain(type, action);
        const rank = repGain + (Math.random() * (repGain * 0.2) - repGain * 0.1);
        rankGain[0] = Math.min(rank, rankGain[0]);
        rankGain[1] = Math.max(rank, rankGain[1]);
      }
      // }
      if (rankGain[0] === Infinity) rankGain[0] = 0;

      if (blade.startAction(type, action)) {
        ns.setTitle(action + (count > 1 ? ' x' + (i + 1) : ''));
        const totalTime = blade.getActionTime(type, action);
        let current = currentTime();
        while (current < totalTime) {
          logAction(blade.getCurrentAction().type, blade.getCurrentAction().name, i + 1, count);
          await ns.sleep(1e3);
          current = currentTime();
          if (blade.getBonusTime() <= 1e3 && current === 0) break;
          if (blade.getBonusTime() > 1e3 && current < 5e3) break;
        }
        await upgradeSkills();
        blackOp && await checkBlackOps();
      }
      else i--;
    }
  }

  /** Rest (loop) if stamina is less than half. Rest until full. */
  async function checkStamina() {
    if (blade.getStamina()[0] < 0.5 * blade.getStamina()[1])
      while (blade.getStamina()[0] < blade.getStamina()[1])
        await performAction('general', 'Hyperbolic Regeneration Chamber', 1, false);
  }

  /** Continuously upgrade skill while SP is sufficient. */
  async function upgradeSkills() {
    const allSkills = blade.getSkillNames();
    const skillIndex = [0, 1, 2, 3, 5, 6, 7, 11];

    const chosenSkills = [];
    skillIndex.forEach(i => {
      if (i === 5 && blade.getSkillLevel(allSkills[i]) >= 90) return;
      chosenSkills.push(allSkills[i]);
    });

    chosenSkills.sort((a, b) => requiredSP(a) - requiredSP(b));

    while (blade.getSkillPoints() >= requiredSP(chosenSkills[0])) {
      if (chosenSkills[0] === 'Overclock' && blade.getSkillLevel(chosenSkills[0]) >= 90)
        chosenSkills.splice(0, 1);
      blade.upgradeSkill(chosenSkills[0]);
      chosenSkills.sort((a, b) => requiredSP(a) - requiredSP(b));
      await ns.sleep(10);
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

  /** Starts ```Diplomacy``` if ```chaos > getChaosThreshold```, nothing otherwise.
   * @see {@link getChaosThreshold()}
   */
  async function checkChaos() {
    const currentCity = blade.getCity();
    const chaos = blade.getCityChaos(currentCity);
    if (chaos <= 50) return;

    if (chaos > getChaosThreshold(currentCity, 0.3)) {
      ns.toast(`Current Chaos is ${chaos}. Use Sleeve (Diplomacy) if possible.`, 'info', 20e3);
      return false;
    }
  }

  /** Perform the current blackop if ```chance === 100%``` and ```rank``` is sufficient. */
  async function checkBlackOps() {
    currentBlackOp = getCurrentBlackOp();
    while (await ns.sleep(10)) {
      if (currentBlackOp === '') { // Daedalus is done
        ns.alert(`=====  Operation Daedalus is accomplished  =====\n(!) Destroy this BitNode when you're ready (!)`);
        blade.stopBladeburnerAction();
        ns.closeTail();
        // Log the time of the Daedalus completion to terminal
        // Only if Daedalus is actually performed, not just finished
        ns.tprintf(`\n(!) Finished Daedalus at: ${(new Date()).toLocaleString()}`, 0);
        ns.exit();
      }

      if (blade.getRank() < blade.getBlackOpRank(currentBlackOp)) return;
      await checkAccuracy('blackop', currentBlackOp);
      if (successChance('blackop', currentBlackOp)[0] < chanceLimits.blackOp) return;

      await performAction('blackop', currentBlackOp, 1, true, false);

      // if succeed, notify the user and update the blackop
      const nextBlackOp = getCurrentBlackOp();
      if (nextBlackOp !== currentBlackOp) {
        ns.toast(`Successfully completed ${currentBlackOp}`, 'success', 5e3);
        currentBlackOp = nextBlackOp;
      }
    }
  }

  function getCurrentBlackOp() {
    let currentBlackOp = '';
    blade.getBlackOpNames().forEach(bo => {
      if (currentBlackOp !== '') return;
      if (actionCount('blackop', bo) > 0) {
        currentBlackOp = bo;
        return;
      }
    });
    return currentBlackOp;
  }

  function averageTaskChance(type = '', tasks = []) {
    let chance = 0;
    tasks.forEach(t => chance += successChance(type, t)[0]);
    return chance / tasks.length;
  }

  function getBestOp() {
    let bestOp = '';
    operations.forEach(op => {
      if (bestOp !== '') return;
      if (actionCount('op', op) > 0 && successChance('op', op)[0] >= chanceLimits.operation)
        bestOp = op;
    });
    return bestOp;
  }

  /** Convert ```HEX``` colors to ```ANSI``` colors, default is ```#ffffff```. This color is used for text (foreground).
   * @param {string} colorHex color in hex format
   * @returns ```Unicode``` string for the color
   */
  function getColor(colorHex = '#ffffff') {
    if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    return `\u001b[38;2;${r};${g};${b}m`;
  }

  function fillWhitespaces(count = 0) {
    let whiteSpaces = '';
    for (let i = 0; i < count; i++)
      whiteSpaces += ' ';
    return whiteSpaces;
  }

  /** Convert time in milliseconds to ```string``` representation.
   * @param {number} time The time in milliseconds
   * @return {string} The formatted time: ```mm:ss```
   */
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
   * @returns The progress bar as a ```string```.
   */
  function progressBar(currentProgress, fullProgress, maxChar = 10) {
    const progress = Math.trunc(currentProgress / (fullProgress / maxChar));
    return `\u251c${'\u2588'.repeat(progress)}${'\u2500'.repeat(Math.max(0, maxChar - progress))}\u2524`;
  }
}