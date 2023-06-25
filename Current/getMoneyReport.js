/** Version 1.3.1
 * Fixed inconsistent display
 */
/** @param {NS} ns */
export async function main(ns) {
  const doc = eval('document');
  // click the 'Stats' sidebar tab
  // parent of the icon is clickable
  try {
    doc.querySelector('svg[aria-label="Stats"]').parentElement.click();

    // get BitNode time
    const labels = doc.getElementsByClassName('MuiTypography-root');
    let bitnodeTime = '';
    for (const i in labels) {
      if (labels.item(i).textContent === 'Total')
        break;
      else bitnodeTime = labels.item(i).innerHTML;
    }

    // get BitNode and level
    let bitnode = '', level = '';
    for (const i in labels) {
      const text = labels.item(i).textContent;
      if (text.includes('BitNode') && text.includes('(Level')) {
        bitnode = text.split(':')[0].split(' ')[1];
        level = text.split('(')[1].split(' ')[1].split(')')[0];
        break;
      }
    }
    let report = [`BitNode: ${bitnode}.${level}\n`];

    let loss = 0, gain = 0;
    let totalMoney = 0;

    Object.entries(ns.getMoneySources().sinceStart).forEach(([k, v]) => {
      if (k === 'total') return;
      totalMoney += v;
      if (v !== 0) report.push(`${k.charAt(0).toUpperCase() + k.substring(1)}: $${ns.formatNumber(v, 3)}`);
      v > 0 ? gain += v : loss += Math.abs(v);
    });

    report.push(`\nLoss: ${loss} ($${ns.formatNumber(loss, 3)})\n` +
      `Gain: ${gain} ($${ns.formatNumber(gain, 3)})\n` +
      `Total: ${totalMoney} ($${ns.formatNumber(totalMoney, 3)})\n\n` +
      `Time: ${bitnodeTime}`);

    ns.write('BitNode_Money_Report.txt', report.join('\n'), 'w');

    // return to terminal
    doc.querySelector('svg[aria-label="Terminal"]').parentElement.click();

    // open report
    const terminalInput = doc.getElementById('terminal-input');
    terminalInput.value = 'cat BitNode_Money_Report.txt';
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({ target: terminalInput });
    terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
  } catch (error) { // can't use sidetabs and/or terminal (when focus)
    const saveData = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data;

    const bitnodeTime = ns.tFormat(saveData.playtimeSinceLastBitnode);

    const bitnode = saveData.bitNodeN;
    const level = saveData.sourceFiles.data.find(e => e[0] === bitnode)[1];
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
    
    ns.alert(report.join('\n'));
  }
}