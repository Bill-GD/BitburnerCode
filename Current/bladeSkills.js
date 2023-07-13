/** Version 1.0
 * Used when entering Post-Blade phase
 * Changes upgrading speed depending on the accumulated points
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.tail(); ns.clearLog();

  while (true) {
    ns.resizeTail(400, skills.length * 25 + 51);
    ns.setTitle(`Waiting for Skill Points`);
    await upgradeSkills();
  }

  async function upgradeSkills() {
    allSkills.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a) - ns.bladeburner.getSkillUpgradeCost(b));

    let sp = ns.bladeburner.getSkillPoints();
    if (sp >= ns.bladeburner.getSkillUpgradeCost(allSkills[0])) ns.setTitle(`Upgrading Skills`);
    while (sp >= ns.bladeburner.getSkillUpgradeCost(allSkills[0])) {
      ns.setTitle(`Upgrading Skills`);
      const count = Math.max(1, Math.trunc(Math.pow(sp / 5e8, 2)));
      ns.bladeburner.upgradeSkill(allSkills[0], count);
      log();
      allSkills.sort((a, b) => ns.bladeburner.getSkillUpgradeCost(a) - ns.bladeburner.getSkillUpgradeCost(b));
      sp = ns.bladeburner.getSkillPoints();
      await ns.sleep(0);
    }
    await ns.sleep(20);
  }

  function log() {
    ns.clearLog();
    const sp = ns.bladeburner.getSkillPoints();
    ns.print(` ${getColor('#ffff00')}SP: ${getColor('#ffffff')}${ns.formatNumber(sp, 3, 1e6)}`);
    skills.forEach(skill => {
      const cost = ns.bladeburner.getSkillUpgradeCost(skill);
      ns.print(
        `${getColor('#ffff00')} ${skill}: ${getColor('#ffffff')}${ns.formatNumber(ns.bladeburner.getSkillLevel(skill), 3, 1e6)} - ` +
        (sp >= cost ? `${getColor('#00ff00')}` : `${getColor('#ff0000')}`) + `${ns.formatNumber(cost, 3, 1e6)}`
      );
    });
  }
}

const skills = [`Blade's Intuition`, 'Cloak', 'Short-Circuit', 'Digital Observer', 'Reaper', 'Evasive System', 'Hyperdrive',
  // 'Hands of Midas'
];
const allSkills = skills.slice();

function getColor(colorHex = '#ffffff') {
  if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
  const r = parseInt(colorHex.substring(1, 3), 16);
  const g = parseInt(colorHex.substring(3, 5), 16);
  const b = parseInt(colorHex.substring(5, 7), 16);
  return `\u001b[38;2;${r};${g};${b}m`;
}