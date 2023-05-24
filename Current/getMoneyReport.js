/** @param {NS} ns */
export async function main(ns) {
    const doc = eval('document');
    // click the 'Stats' sidebar tab
    // parent of the icon is clickable
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
            level = text.split('(')[1].split(' ')[1].charAt(0);
            break;
        }
    }
    let report = `BitNode: ${bitnode}.${level}\n\n`;

    let loss = 0, gain = 0;
    let totalMoney = 0;

    Object.entries(ns.getMoneySources().sinceStart).forEach(([k, v]) => {
        if (k === 'total') return;
        totalMoney += v;
        if (v !== 0) report += `${k.charAt(0).toUpperCase() + k.substring(1)}: $${ns.formatNumber(v)}\n`;
        v > 0 ? gain += v : loss += Math.abs(v);
    });

    report += `\nLoss: ${loss} (-${ns.formatNumber(loss)})\n` +
        `Gain: ${gain} (+${ns.formatNumber(gain)})\n` +
        `Total: ${totalMoney} (${ns.formatNumber(totalMoney)})\n\n` +
        `Time: ${bitnodeTime}`;

    ns.write('BitNode_Money_Report.txt', report, 'w');

    // return to terminal
    doc.querySelector('svg[aria-label="Terminal"]').parentElement.click();

    // open report
    const terminalInput = doc.getElementById('terminal-input');
    terminalInput.value = 'cat BitNode_Money_Report.txt';
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({ target: terminalInput });
    terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
}