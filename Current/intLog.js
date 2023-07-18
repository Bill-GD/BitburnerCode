/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL'); ns.clearLog();
  const fileName = 'int-log.txt',
    delayHour = 4; // time between each log entry (in hours)
  while (1) {
    const file = ns.read(fileName);
    let [time, level, xp, rate] = ['', '', '', '', '', ''];

    let [currentLevel, currentXp] = [ns.getPlayer().skills.intelligence, ns.getPlayer().exp.intelligence];

    if (file.match(/[M\/\:]/)) {
      const latest = file.split('\n').filter(line => line !== '').reverse()[0];
      // const sample = '7/13/2023, 6:55:42 PM, lv, xp (readable xp)' + ', rate';

      [time, level, xp] = latest.split(/,/).map(e => e.trim());
      xp = xp.split(' ')[0];

      const oldTime = (new Date(time)).getTime();
      const timeDiff = (Date.now() - oldTime);
      const [levelDiff, xpDiff] = [currentLevel - parseInt(level), currentXp - parseFloat(xp)];
      const [lvRate, xpRate] = [levelDiff / timeDiff * 3600e3, xpDiff / timeDiff * 1e3]; // per minute, second
      rate = `, ${ns.formatNumber(lvRate, 3)} lv/h, ${ns.formatNumber(xpRate, 3)} xp/s`;
    }

    [currentLevel, currentXp] = [ns.getPlayer().skills.intelligence, ns.getPlayer().exp.intelligence];
    const string = `${getTimeString(new Date())}, ${currentLevel}, ${currentXp} (${ns.formatNumber(currentXp, 3)})${rate}\n`;
    ns.write(fileName, string, 'a');
    ns.print(`Logged at: ${getTimeString(new Date())}`);
    await ns.sleep(delayHour * 3600e3);
  }
}

function getTimeString(time) {
  const date = new Date(time);
  let [hour, minute, second] = [date.getHours(), date.getMinutes(), date.getSeconds()];
  hour = hour >= 10 ? hour : '0' + hour;
  minute = minute >= 10 ? minute : '0' + minute;
  second = second >= 10 ? second : '0' + second;
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${hour}:${minute}:${second}`;
}