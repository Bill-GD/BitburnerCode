/** Version 2.1
 * Added option for some Player data
 * Changed how data is loaded into the hooks
 * Merged with 'runScript.js' -> reduce RAM
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    ns.clearLog();

    const getPlayer = () => ns.getPlayer();

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

    const theme = ns.ui.getTheme();

    const shadowSize = 0, shadowBlur = 5;
    const createElement = (type, attributes = {}, eventType, eventCallback = () => { }, hook = null) => {
        const element = Object.assign(doc.createElement(type), attributes);
        Object.assign(element, { title: `${element.innerHTML}` });

        Object.assign(element.style, Object.assign(attributes.style, {
            fontWeight: 'normal',
            fontFamily: "Cascadia Code",
            height: '20px',
            backgroundColor: theme.backgroundsecondary,
            borderColor: theme.backgroundsecondary,
            cursor: 'pointer',
            boxShadow: `0px 0px ${shadowBlur}px ${shadowSize}px ${element.style.color}`,
        }));
        element.addEventListener(eventType, eventCallback);
        element.addEventListener('mouseover', (event) => {
            event.target.style.backgroundColor = element.style.color;
            event.target.style.borderColor = element.style.color;
            event.target.style.boxShadow = `0px 0px ${shadowBlur}px ${shadowSize + 4}px ${element.style.color}`;
            event.target.style.color = theme.backgroundsecondary;
        });
        element.addEventListener('mouseout', (event) => {
            event.target.style.color = element.style.backgroundColor;
            event.target.style.boxShadow = `0px 0px ${shadowBlur}px ${shadowSize}px ${element.style.color}`;
            event.target.style.backgroundColor = theme.backgroundsecondary;
            event.target.style.borderColor = theme.backgroundsecondary;
        });
        if (hook) hook.append('\xa0', element);
        return element;
    };

    const optionStates = {
        player: false,
        crime: false,
        stock: false,
        runScript: false,
        manageServers: false,
        entropy: false,
        traveling: false,
        buyRam: false,
        hudRestart: false,
        hudExit: false,
    };

    // player
    createElement(
        'button',
        { innerHTML: 'Player', style: { color: theme.hp } },
        'click', () => optionStates.player = !optionStates.player,
        hooks.hookHP
    );

    // crime
    createElement(
        'button',
        { innerHTML: 'Crime', style: { color: theme.money } },
        'click', () => optionStates.crime = true,
        hooks.hookMoney
    );

    // stock
    createElement(
        'button',
        { innerHTML: 'Stock', style: { color: theme['hack'] } },
        'click', () => optionStates.stock = true,
        hooks.hookHack
    );

    // run script
    createElement(
        'button',
        { innerHTML: 'Script', style: { color: theme.combat } },
        'click', () => optionStates.runScript = true,
        hooks.hookStr
    );

    // manage servers
    createElement(
        'button',
        { innerHTML: 'Servers', style: { color: theme.combat } },
        'click', () => optionStates.manageServers = true,
        hooks.hookDef
    );

    // grafting
    createElement(
        'button',
        { innerHTML: 'Entropy', style: { color: theme.combat } },
        'click', () => optionStates.entropy = !optionStates.entropy,
        hooks.hookDex
    );

    // traveling
    createElement(
        'button',
        { innerHTML: 'Travel', style: { color: theme.combat } },
        'click', () => optionStates.traveling = true,
        hooks.hookAgi
    );

    // buy ram
    createElement(
        'button',
        { innerHTML: 'Buy Ram', style: { color: theme.cha } },
        'click', () => optionStates.buyRam = true,
        hooks.hookCha
    );

    // restart & exit
    createElement(
        'button',
        { innerHTML: 'Restart', style: { color: theme.warning } },
        'click', () => optionStates.hudRestart = true,
        hooks.hookInt
    );
    createElement(
        'button',
        { innerHTML: 'Remove', style: { color: theme.warning } },
        'click', () => optionStates.hudExit = true,
        hooks.hook2
    );

    while (await ns.sleep(10)) {
        try {
            let key = ['BitNode'];
            let value = [ns.getResetInfo().currentNode];

            if (optionStates.player) {
                const player = getPlayer();
                key = [...key, 'City', 'Karma', 'Kills',];
                value = [
                    ...value,
                    `${player.city}`,
                    `${ns.formatNumber(ns.heart.break())}`,
                    `${ns.formatNumber(player.numPeopleKilled, 0)}`,
                ];
            }
            if (optionStates.crime) {
                ns.exec('autoCrime.js', 'home');
                optionStates.crime = false;
            }
            if (optionStates.stock) {
                ns.exec('stockControl.js', 'home');
                optionStates.stock = false;
            }
            if (optionStates.runScript) {
                const file = await ns.prompt(
                    'Choose script to run\nIgnore to exit',
                    { 'type': 'select', 'choices': ns.ls('home', '.js') }
                );
                if (file !== '') {
                    let thread = await ns.prompt('Thread count?', { 'type': 'text' });
                    thread = isNaN(parseInt(thread)) ? 1 : parseInt(thread);

                    const args = (await ns.prompt('Arguments?\nSeparate by spaces', { 'type': 'text' }))
                        .split(' ').filter(arg => arg === '');

                    ns.exec(file, 'home', thread, ...args);
                }
                optionStates.runScript = false;
            }
            if (optionStates.manageServers) {
                ns.exec('extraServer_v2.js', 'home');
                optionStates.manageServers = false;
            }
            if (optionStates.entropy) {
                key = [...key, `Entropy`, `Mult`];
                value = [
                    ...value,
                    `${getPlayer().entropy}`,
                    `${ns.formatPercent(0.98 ** getPlayer().entropy, 2)}`
                ];
            }
            if (optionStates.traveling) {
                ns.exec('travel.js', 'home');
                optionStates.traveling = false;
            }
            if (optionStates.buyRam) {
                ns.exec('homeUpgrade.js', 'home');
                optionStates.buyRam = false;
            }
            if (optionStates.hudRestart) ns.exec('restart.js', 'home', 1, ns.getScriptName());
            if (optionStates.hudExit) ns.exit();

            hooks.hook0.innerText = key.join('\n');
            hooks.hook1.innerText = value.join('\n');
        } catch (e) {
            ns.alert(e.cause + ' ');
        }
    }
}