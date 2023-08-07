/** Version 2.3
 * Grouped some options together
 * Added BN Multipliers
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.clearLog();

  const doc = eval('document');
  try {
    doc.querySelector('svg[aria-label="Stats"]').parentElement.click();

    const labels = doc.getElementsByClassName('MuiTypography-root');
    // get BitNode and level
    let level = '';
    for (const i in labels) {
      const text = labels.item(i).textContent;
      if (text.includes('BitNode') && text.includes('(Level')) {
        level = text.split('(')[1].split(' ')[1].split(')')[0];
        break;
      }
    }
    doc.querySelector('svg[aria-label="Terminal"]').parentElement.click();
    ns.write('BN_Level.txt', level, 'w');
  } catch { }

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

  let maxTextWidth = 0;
  let buttons = [];

  const shadowSize = 0.5, shadowBlur = 3.5;
  const createElement = (type, attributes = {}, eventType, eventCallback = () => { }, hook = null) => {
    const element = Object.assign(doc.createElement(type), attributes);
    Object.assign(element, { title: `${element.innerHTML}` });
    maxTextWidth = Math.max(maxTextWidth, element.innerHTML.length);

    Object.assign(element.style, Object.assign(attributes.style, {
      fontWeight: 'normal',
      fontFamily: "Cascadia Code",
      height: '20px',
      backgroundColor: theme.backgroundsecondary,
      borderColor: theme.backgroundsecondary,
      cursor: 'pointer',
      boxShadow: `0px 0px ${shadowBlur}px ${shadowSize}px ${element.style.color}`,
      transition: 'all 0.2s ease-in',
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
    buttons.push(element);
    return element;
  };

  const optionStates = {
    info: false,
    crime: false,
    gang: false,
    stock: false,
    hacking: false,
    grafting: false,
    bnMult: false,
    blade: false,
    stanek: false,
    sleeve: false,
    corp: false,
    runScript: false,
    traveling: false,
    manageServers: false,
    buyRam: false,
    clearTerminal: false,
    reportMoney: false,
    hud: false,
  };

  // crime
  createElement('button', { innerHTML: 'Crime', style: { color: theme.hp } }, 'click', () => optionStates.crime = true, hooks.hookHP);

  // gang
  createElement('button', { innerHTML: 'Gang', style: { color: theme.hp } }, 'click', () => optionStates.gang = true, hooks.hookHP);

  // stock
  createElement('button', { innerHTML: 'Stock', style: { color: theme.money } }, 'click', () => optionStates.stock = true, hooks.hookMoney);

  // hack
  createElement('button', { innerHTML: 'Hack', style: { color: theme['hack'] } }, 'click', () => optionStates.hacking = true, hooks.hookHack);

  // grafting
  createElement('button', { innerHTML: 'Graft', style: { color: theme.combat } }, 'click', () => optionStates.grafting = true, hooks.hookStr);

  // BN mults
  createElement('button', { innerHTML: 'BN Mults', style: { color: theme.combat } }, 'click', () => optionStates.bnMult = true, hooks.hookStr);

  // blade
  createElement('button', { innerHTML: 'Blade', style: { color: theme.combat } }, 'click', () => optionStates.blade = true, hooks.hookDef);

  // stanek
  createElement('button', { innerHTML: 'Stanek', style: { color: theme.combat } }, 'click', () => optionStates.stanek = true, hooks.hookDef);

  // sleeve
  createElement('button', { innerHTML: 'Sleeve', style: { color: theme.combat } }, 'click', () => optionStates.sleeve = true, hooks.hookDex);

  // corp
  createElement('button', { innerHTML: 'Corp', style: { color: theme.combat } }, 'click', () => optionStates.corp = true, hooks.hookDex);

  // run script
  createElement('button', { innerHTML: 'Script', style: { color: theme.combat } }, 'click', () => optionStates.runScript = true, hooks.hookAgi);

  // traveling
  createElement('button', { innerHTML: 'Travel', style: { color: theme.combat } }, 'click', () => optionStates.traveling = true, hooks.hookAgi);

  // manage servers
  createElement('button', { innerHTML: 'Servers', style: { color: theme.cha } }, 'click', () => optionStates.manageServers = true, hooks.hookCha);

  // buy ram
  createElement('button', { innerHTML: 'RAM', style: { color: theme.cha } }, 'click', () => optionStates.buyRam = true, hooks.hookCha);

  // info
  createElement('button', { innerHTML: 'Info', style: { color: theme.int } }, 'click', () => optionStates.info = !optionStates.info, hooks.hookInt);

  // cls;ls
  createElement(
    'button',
    { innerHTML: 'CLS;LS', style: { color: theme.int } },
    'click', () => {
      const terminalInput = doc.getElementById('terminal-input');
      terminalInput.value = 'cls;ls';
      const handler = Object.keys(terminalInput)[1];
      terminalInput[handler].onChange({ target: terminalInput });
      terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
    },
    hooks.hookInt
  );

  // money report
  createElement('button', { innerHTML: 'Report', style: { color: theme.warning } }, 'click', () => optionStates.reportMoney = true, hooks.hook2);

  // restart & exit
  createElement('button', { innerHTML: 'HUD', style: { color: theme.warning } }, 'click', () => optionStates.hud = true, hooks.hook2);

  buttons.forEach(bt => Object.assign(bt.style, { width: `${maxTextWidth * 10}px` }));

  const currentBN = JSON.parse(JSON.parse(atob(eval('window').appSaveFns.getSaveData().save)).data.PlayerSave).data.bitNodeN;
  const currentBNLevel = ns.read('BN_Level.txt');

  while (await ns.sleep(10)) {
    let key = ['BitNode'];
    let value = [`${currentBN}.${currentBNLevel}`];

    if (optionStates.info) {
      const player = ns.getPlayer(), max = ns.getServerMaxRam('home'), used = ns.getServerUsedRam('home');
      key = [...key, 'City', 'Karma', 'Kills', `Entropy`, `Mult`, `Max`, `Used`, 'Free'];
      value = [
        ...value,
        `${player.city}`,
        `${ns.formatNumber(ns.heart.break(), 3)}`,
        `${ns.formatNumber(player.numPeopleKilled, 3)}`,
        `${player.entropy}`,
        `${ns.formatPercent(0.98 ** player.entropy, 2)}`,
        `${ns.formatRam(max, 2)}`,
        `${ns.formatRam(used, 2)}`,
        `${ns.formatRam(max - used, 2)}`,
      ];
    }
    if (optionStates.gang) {
      ns.exec('gang_v3.js', 'home', { preventDuplicates: true });
      optionStates.gang = false;
    }
    if (optionStates.crime) {
      ns.exec('autoCrime.js', 'home', { preventDuplicates: true });
      optionStates.crime = false;
    }
    if (optionStates.stock) {
      ns.exec('stockControl.js', 'home', { preventDuplicates: true });
      optionStates.stock = false;
    }
    if (optionStates.hacking) {
      ns.exec('controlHack.js', 'home', { preventDuplicates: true });
      optionStates.hacking = false;
    }
    if (optionStates.manageServers) {
      ns.exec('extraServer_v2.js', 'home', { preventDuplicates: true });
      optionStates.manageServers = false;
    }
    if (optionStates.grafting) {
      const choice = await ns.prompt('Choose Grafting option:', { type: "select", choices: ['Graft', 'Multiple'] });
      if (choice === 'Graft') ns.exec('graft.js', 'home', { preventDuplicates: true });
      if (choice === 'Multiple') ns.exec('graftMultiple.js', 'home', { preventDuplicates: true });
      optionStates.grafting = false;
    }
    if (optionStates.bnMult) {
      ns.exec('BN_Mult.js', 'home', { preventDuplicates: true });
      await ns.sleep(5);
      try {
        const terminalInput = doc.getElementById('terminal-input');
        terminalInput.value = 'cat BitNodeMultipliers.txt';
        const handler = Object.keys(terminalInput)[1];
        terminalInput[handler].onChange({ target: terminalInput });
        terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });
      } catch { }
      optionStates.bnMult = false;
    }
    if (optionStates.blade) {
      ns.exec('joinBlade.js', 'home', { preventDuplicates: true });
      await ns.sleep(5);
      ns.exec('blade_v4.js', 'home', { preventDuplicates: true });
      optionStates.blade = false;
    }
    if (optionStates.stanek) {
      ns.exec('stanek_v2.js', 'home', { preventDuplicates: true });
      ns.exec('manageChargeStanek.js', 'home', { preventDuplicates: true });
      ns.exec('spreadStanekCharger.js', 'home', { preventDuplicates: true });
      optionStates.stanek = false;
    }
    if (optionStates.sleeve) {
      const choice = await ns.prompt('Choose Sleeve option:', { type: "select", choices: ['Presets', 'Contracts'] });
      if (choice === 'Presets') ns.exec('sleeveChoosePresets.js', 'home', { preventDuplicates: true });
      if (choice === 'Contracts') ns.exec('sleeveContracts.js', 'home', { preventDuplicates: true });
      optionStates.sleeve = false;
    }
    if (optionStates.corp) {
      ns.exec('corp_v2.js', 'home', { preventDuplicates: true });
      optionStates.corp = false;
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
          .split(' ').filter(arg => arg !== '');

        ns.exec(file, 'home', { preventDuplicates: true, threads: thread }, ...args);
      }
      optionStates.runScript = false;
    }
    if (optionStates.traveling) {
      ns.exec('travel.js', 'home', { preventDuplicates: true });
      optionStates.traveling = false;
    }
    if (optionStates.buyRam) {
      ns.exec('homeUpgrade.js', 'home', { preventDuplicates: true });
      optionStates.buyRam = false;
    }
    if (optionStates.reportMoney) {
      ns.exec('getMoneyReport.js', 'home', { preventDuplicates: true });
      optionStates.reportMoney = false;
    }
    if (optionStates.hud) {
      const choice = await ns.prompt('Choose HUD option:', { type: "select", choices: ['Restart', 'Exit'] });
      if (choice === 'Restart') ns.exec('restart.js', 'home', { preventDuplicates: true }, 'hudExtra_v2.js');
      if (choice === 'Exit') ns.exit();
    }

    hooks.hook0.innerText = key.join('\n');
    hooks.hook1.innerText = value.join('\n');
  }
}