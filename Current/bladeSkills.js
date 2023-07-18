/** Version 1.1
 * Uses new skill upgrading implementation from 'blade_v4.js'
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail(); ns.clearLog();

  const nodeSkillCost = currentBN !== 12 ? bnSkillCost[currentBN] : 1.02 ** parseInt(ns.read('BN_Level.txt'));

  while (true) {
    ns.resizeTail(400, skills.length * 25 + 51);
    ns.setTitle(`Waiting for Skill Points`);
    await upgradeSkills();
  }

  async function upgradeSkills() {
    allSkills.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a.name) - ns.bladeburner.getSkillUpgradeCost(b.name));

    let sp = ns.bladeburner.getSkillPoints();
    let count = calculateLevels(allSkills[0], ns.bladeburner.getSkillLevel(allSkills[0].name), sp);
    while (sp >= ns.bladeburner.getSkillUpgradeCost(allSkills[0].name, count)) {
      ns.setTitle(`Upgrading Skills`);
      ns.bladeburner.upgradeSkill(allSkills[0].name, count);
      log();
      allSkills.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a.name) - ns.bladeburner.getSkillUpgradeCost(b.name));
      sp = ns.bladeburner.getSkillPoints();
      count = calculateLevels(allSkills[0], ns.bladeburner.getSkillLevel(allSkills[0].name), sp);
      await ns.sleep(0);
    }
    await ns.sleep(1);
  }

  function log() {
    ns.clearLog();
    const sp = ns.bladeburner.getSkillPoints();
    ns.print(` ${getColor('#ffff00')}SP: ${getColor('#ffffff')}${ns.formatNumber(sp, 3, 1e6)}`);
    skills.forEach(skill => {
      const cost = ns.bladeburner.getSkillUpgradeCost(skill.name);
      ns.print(
        `${getColor('#ffff00')} ${skill.name}: ${getColor('#ffffff')}${ns.formatNumber(ns.bladeburner.getSkillLevel(skill.name), 3, 1e6)} - ` +
        (sp >= cost ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`) + `${ns.formatNumber(cost, 3, 1e6)}`
      );
    });
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
}

const currentBN = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bitNodeN;
const bnSkillCost = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 2, 8: 1, 9: 1.2, 10: 1, 11: 1, 13: 2 };

const skills = [
  { name: `Blade's Intuition`, baseCost: 3, costInc: 2.1 },
  { name: 'Cloak', baseCost: 2, costInc: 1.1 },
  { name: 'Short-Circuit', baseCost: 2, costInc: 2.1 },
  { name: 'Digital Observer', baseCost: 2, costInc: 2.1 },
  { name: 'Reaper', baseCost: 2, costInc: 2.1 },
  { name: 'Evasive System', baseCost: 2, costInc: 2.1 },
  { name: 'Hyperdrive', baseCost: 1, costInc: 2.5 },
  { name: 'Hands of Midas', baseCost: 2, costInc: 2.5 },
];
const allSkills = skills.slice();

function getColor(colorHex = '#ffffff') {
  if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
  const r = parseInt(colorHex.substring(1, 3), 16);
  const g = parseInt(colorHex.substring(3, 5), 16);
  const b = parseInt(colorHex.substring(5, 7), 16);
  return `\u001b[38;2;${r};${g};${b}m`;
}