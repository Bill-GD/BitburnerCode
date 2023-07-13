/** @param {NS} ns */
export async function main(ns) {
  const fileName = 'int-log.txt';
  while (1) {
    const file = ns.read(fileName);
    let [time, int] = ['', ''],
      [level, xp, rate] = ['', '', ''];

    let [currentLevel, currentXp] = [ns.getPlayer().skills.intelligence, ns.getPlayer().exp.intelligence];

    if (file.match(/[\[\]]/)) {
      const latest = file.split('\n').filter(line => line !== '').reverse()[0];
      // const sample = '[7/13/2023, 6:55:42 PM] lv, xp (readable xp)' + ', rate';

      [_, time, int] = latest.split(/[\[\]]/);
      [level, xp] = int.trim().split(/[, ]/).filter(e => e !== '');

      const oldTime = (new Date(time)).getTime();
      const timeDiff = (Date.now() - oldTime) / 3600e3; // max precision: [milisecond] - [second] -> hour
      const [levelDiff, xpDiff] = [currentLevel - parseInt(level), currentXp - parseFloat(xp)];
      const [lvRate, xpRate] = [levelDiff / timeDiff, xpDiff / timeDiff]; // per hour
      rate = `, ${ns.formatNumber(lvRate, 3)}lv/h, ${ns.formatNumber(xpRate, 3)}xp/h`;
    }

    [currentLevel, currentXp] = [ns.getPlayer().skills.intelligence, ns.getPlayer().exp.intelligence];
    const string = `[${(new Date()).toLocaleString()}] ${currentLevel}, ${currentXp} (${ns.formatNumber(currentXp, 3)})${rate}\n`;
    ns.write(fileName, string, 'a');
    await ns.sleep(3600e3);
  }
}