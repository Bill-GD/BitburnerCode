/** Version 1.4
 * Removed HTML (DOM/document) method completely
 * Display using alert box and save to file for later viewing
 */
/** @param {NS} ns */
export async function main(ns) {
  const saveData = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data;

  const bitnodeTime = ns.tFormat(saveData.playtimeSinceLastBitnode);

  const bitnode = saveData.bitNodeN;
  let level = saveData.sourceFiles.data.find(e => e[0] === bitnode)[1];
  if (bitnode === 12) level += 1;
  else if (level < 3) level += 1;
  let report = [`BitNode: ${bitnode}.${level}\n`];

  const moneySinceBN = saveData.moneySourceB.data;
  let loss = 0, gain = 0;

  Object.entries(moneySinceBN).forEach(([k, v]) => {
    if (k === 'total') return;
    if (v !== 0) report.push(`${k.charAt(0).toUpperCase() + k.substring(1)}: $${ns.formatNumber(v, 3)}`);
    v > 0 ? gain += v : loss += Math.abs(v);
  });

  report.push(`\nLoss: ${loss} ($${ns.formatNumber(loss, 3)})\n` +
    `Gain: ${gain} ($${ns.formatNumber(gain, 3)})\n` +
    `Total: ${moneySinceBN.total} ($${ns.formatNumber(moneySinceBN.total, 3)})\n\n` +
    `Time: ${bitnodeTime}`);

  ns.alert(report.join('\n') + `\n\nSaved to 'BitNode_Money_Report.txt'`);

  ns.write('BitNode_Money_Report.txt', report.join('\n'), 'w');
}