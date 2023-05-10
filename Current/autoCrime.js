/** @param {NS} ns
 * Performs crimes automatically. First arugment must be the (partial name of a crime.
 * Adds a "Stop crime spree"-button to the overview to cancel the crime spree.
 */
export async function main(ns) {
    if (ns.isRunning("hud_extra.js")) {
        ns.kill("hud_extra.js", "home");
        ns.alert("hud_extra.js can mess up this script. Killed it.");
    }

    const crimeName = ns.args[0];

    if (!_.isString(crimeName)) {
        throw "First argument must be a string.";
    }

    getCityName().click();
    getSlums().click();

    const crime = getCrime(crimeName);

    if (crime == null) {
        ns.toast("Abort: cannot find element containing textContent: \"" + crimeName + "\".", "error");
        return;
    }

    const doc = document; //This is expensive (25GB RAM)
    const hook1 = doc.getElementById('overview-extra-hook-1');
    const hook0 = doc.getElementById('overview-extra-hook-0');
    const hook2 = doc.getElementById('overview-extra-hook-2');
    let karma = ns.heart.break();

    let btn1 = document.createElement("button");
    btn1.style.color = '#07F5F1';
    btn1.style.backgroundColor = '#0A2F5E';
    btn1.innerHTML = "Stop Crime"; //DON'T call it something like "Cancel crime*"
    var clicked = false;
    hook2.appendChild(btn1);
    btn1.onclick = function () { clicked = true; ns.toast("Aborting loop after current crime.", "info") };

    ns.atExit(() => {
        hook2.innerHTML = " ";
        hook1.innerHTML = "";
        hook0.innerHTML = "";
    });

    let start = new Date();


    for (var i = 0; i < Infinity; ++i) {
        let head = ['Chance\xa0', 'Karma\xa0'];
        let value = [ns.formatPercent(ns.formulas.work.crimeSuccessChance(ns.getPlayer(), 'homicide'), 2), ns.formatNumber(ns.heart.break(), 1)];
        hook0.innerText = head.join("\n");
        hook1.innerText = value.join("\n");

        const handler = Object.keys(crime)[1];
        crime[handler].onClick({ isTrusted: true });

        if (clicked) {
            ns.singularity.stopAction();
            ns.run("hud_extra.js");
            break;
        }
        await ns.asleep(3e3);
    }

    hook2.removeChild(btn1);
    let newKarma = ns.heart.break();
    let end = new Date();
    let karmaRate = (newKarma - karma) / ((end - start) / 1000);
    let msg = `Crime spree concluded. Your karma is: ${newKarma.toFixed(0)} (${(karmaRate > 0 ? "+" : "")}${(newKarma - karma).toFixed(0)}). That's ${karmaRate.toFixed(1)} karma/sec`;
    ns.alert(msg)
}

function getCityName() {
    for (const elem of document.querySelectorAll("p")) {
        if (elem.textContent == "City") {
            return elem;
        }
    }
}

function getSlums() {
    return document.querySelector('[aria-label="The Slums"]');
}

function getCrime(text) {
    for (const elem of document.querySelectorAll("button"))
        if (elem.textContent.toLowerCase().includes(text.toLowerCase()))
            return elem;
}