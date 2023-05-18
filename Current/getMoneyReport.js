/** @param {NS} ns */
export async function main(ns) {
    // get the clicked nested element corresponding to the 'Stats' sidebar tab
    document.querySelector('svg[aria-label="Stats"]').parentElement.click();

    // get BitNode time
    const labels = document.getElementsByClassName('MuiTypography-root');
    let bitnodeTime = '';
    for (const i in labels) {
        if (labels.item(i).textContent === 'Total')
            break;
        else
            bitnodeTime = labels.item(i).innerHTML;
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

    // get the '...' button that shows money report popup
    const buttons = document.getElementsByClassName('MuiIconButton-root');
    buttons.item(2).click();

    // get the table of the bitnode money report
    let bitnodeReport = null;
    document.querySelectorAll('h6').forEach(element => {
        if (element.innerHTML.includes('BitNode'))
            bitnodeReport = element // title of the bitnode segment
                .parentElement // parent of the title -> inner div of popup
                .children.item(7) // outer table
                .children.item(0); // inner table
    });

    const suffices = ['k', 'm', 'b', 't'];
    let loss = 0, gain = 0;
    let totalMoney = 0;

    // let report = `BitNode: ${ns.getPlayer().bitNodeN}\n\n`;
    let report = `BitNode: ${bitnode}.${level}\n\n`;

    // get all items in the table
    for (const row of bitnodeReport.children) {
        const title = row.children.item(0)
            .children.item(0).innerHTML;
        if (title.includes('Total')) continue;

        let money = row.children.item(1)
            .children.item(0)
            .children.item(0).innerHTML.substring(1);

        const moneySuffix = money.substring(money.length - 1);
        if (isNaN(parseInt(moneySuffix))) {
            money.substring(0, money.length - 1);
            const power = suffices.findIndex(s => s === moneySuffix);
            money = Math.round(parseFloat(money) * Math.pow(1e3, power + 1));
        }
        else
            money = parseFloat(money);

        money > 0 ? gain += money : loss += Math.abs(money);
        totalMoney += money;

        report += `${title} $${ns.formatNumber(money)}\n`;
    }

    report += `\nLoss: ${loss} (- ${ns.formatNumber(loss)})\nGain: ${gain} (+ ${ns.formatNumber(gain)})\nTotal: ${totalMoney} (${ns.formatNumber(totalMoney)})\n\nTime: ${bitnodeTime}`;

    ns.write('BitNode_Money_Report.txt', report, 'w');

    // return to terminal
    document.querySelector('svg[aria-label="Terminal"]').parentElement.click();

    // open report
    const terminalInput = document.getElementById('terminal-input');
    terminalInput.value = 'cat BitNode_Money_Report.txt';
    const handler = Object.keys(terminalInput)[1];
    terminalInput[handler].onChange({ target: terminalInput });
    terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
}