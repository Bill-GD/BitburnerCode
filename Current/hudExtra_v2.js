/** Version 2.0
 * Now uses template for element creation
 * Significantly reduced the amount of options
 * All options now use button
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");

    const shadowSize = 3;

    const doc = eval('document');
    const hooks = {
        hookHP: doc.getElementById('overview-hp-hook'),
        hookMoney: doc.getElementById('overview-money-hook'),
        hookHack: doc.getElementById('overview-hack-hook'),
        hookStr: doc.getElementById('overview-str-hook'),
        hookDef: doc.getElementById('overview-def-hook'),
        hookDex: doc.getElementById('overview-dex-hook'),
        hookAgi: doc.getElementById('overview-agi-hook'),
        hookCha: doc.getElementById('overview-cha-hook'),
        hookInt: doc.getElementById('overview-int-hook'),
        hook0: doc.getElementById('overview-extra-hook-0'),
        hook1: doc.getElementById('overview-extra-hook-1'),
        hook2: doc.getElementById('overview-extra-hook-2'),
    };

    ns.atExit(() => Object.keys(hooks).forEach(hook => hooks[hook].innerHTML = ''));

    const createElement = (type, attributes = {}, eventType, eventCallback = () => { }, hook = null) => {
        const element = Object.assign(doc.createElement(type), attributes);
        Object.assign(element, { title: `${element.innerHTML}` });
        Object.assign(element.style, Object.assign(attributes.style, {
            fontWeight: 'bold',
            backgroundColor: theme.black,
            cursor: 'pointer',
            boxShadow: `0px 0px ${shadowSize}px ${element.style.color}`
        }));
        element.addEventListener(eventType, eventCallback);
        if (hook) hook.append('\xa0', element);
        return element;
    };

    const theme = ns.ui.getTheme();

    const optionStates = {
        crime: false,//
        stock: false,//
        runScript: false,//
        manageServers: false,//
        entropy: false,//
        travel: false,//
        buyRam: false,//
        hudRestart: false,//
        hudExit: false,//
    };

    // crime
    createElement(
        'button',
        { innerHTML: 'Crime', style: { color: theme.hp } },
        'click', () => optionStates.crime = true,
        hooks.hookHP
    );

    // stock
    createElement(
        'button',
        { innerHTML: 'Stock', style: { color: theme.money } },
        'click', () => optionStates.stock = true,
        hooks.hookMoney
    );

    // run script
    createElement(
        'button',
        { innerHTML: 'Run Script', style: { color: theme.hack } },
        'click', () => optionStates.runScript = true,
        hooks.hookHack
    );

    // manage servers
    createElement(
        'button',
        { innerHTML: 'Servers', style: { color: theme.combat } },
        'click', () => optionStates.manageServers = true,
        hooks.hookStr
    );

    // grafting
    createElement(
        'button',
        { innerHTML: 'Entropy', style: { color: theme.combat } },
        'click', () => optionStates.entropy = !optionStates.entropy,
        hooks.hookDef
    );

    // travel
    createElement(
        'button',
        { innerHTML: 'Travel', style: { color: theme.combat } },
        'click', () => optionStates.travel = true,
        hooks.hookDex
    );

    // buy ram
    createElement(
        'button',
        { innerHTML: 'Buy Ram', style: { color: theme.combat } },
        'click', () => optionStates.buyRam = true,
        hooks.hookAgi
    );

    // restart & exit
    createElement(
        'button',
        { innerHTML: 'Restart', style: { color: theme.warning } },
        'click', () => optionStates.hudRestart = true,
        hooks.hookCha
    );
    createElement(
        'button',
        { innerHTML: 'Exit', style: { color: theme.warning } },
        'click', () => optionStates.hudExit = true,
        hooks.hookInt
    );

    while (await ns.sleep(10)) {
        hooks.hook0.innerText = 'BitNode\n';
        hooks.hook1.innerText = ns.getPlayer().bitNodeN + '\n';
        if (optionStates.crime) {
            ns.exec('autoCrime.js', 'home');
            optionStates.crime = false;
        }
        if (optionStates.stock) {
            ns.exec('stockControl.js', 'home');
            optionStates.stock = false;
        }
        if (optionStates.runScript) {
            ns.exec('runScript.js', 'home');
            optionStates.runScript = false;
        }
        if (optionStates.manageServers) {
            // ns.exec('extra_sv.js', 'home');
            ns.alert(`'extra_sv.js' isn't compatible right now`);
            optionStates.manageServers = false;
        }
        if (optionStates.entropy) {
            hooks.hook0.innerText += `Entropy\nMult`;
            hooks.hook1.innerText += `${ns.getPlayer().entropy}\n${ns.formatPercent(0.98 ** ns.getPlayer().entropy, 2)}`;
        }
        if (optionStates.travel) {
            ns.exec('travel.js', 'home');
            optionStates.travel = false;
        }
        if (optionStates.buyRam) {
            ns.exec('homeUpgrade.js', 'home');
            optionStates.buyRam = false;
        }
        if (optionStates.hudRestart) ns.exec('restart.js', 'home', 1, ns.getScriptName());
        if (optionStates.hudExit) ns.exit();
    }
}