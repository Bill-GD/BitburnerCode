/** Version 0.1 (WIP)
 * Can find the location of the specified company
 * Check if location exist and can be infiltrated
 * Starts the infiltration
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog('ALL');
  ns.tail();
  ns.clearLog();

  const doc = eval('document');

  // let keyboardEvent = new KeyboardEvent('keydown', { key: 'A' });
  // ns.print('Event: [', keyboardEvent.key, '] |End');
  // let initMethod = typeof keyboardEvent.initKeyboardEvent !== 'undefined' ? 'initKeyboardEvent' : 'initKeyEvent';

  // const company = `Noodle Bar`;
  const company = (await ns.prompt('Enter company name: ', { 'type': 'text' }));
  ns.print('Chosen: ', company);

  // moves to the location if exist
  doc.querySelector('svg[aria-label="City"]').parentElement.click();
  const cityLocation = doc.querySelector(`span[aria-label="${company}"]`);
  if (!cityLocation) {
    ns.print(`Couldn't find the location`);
    ns.exit();
  }
  cityLocation.click();

  // opens infiltration menu if exist
  const infilButton = Array.from(doc.querySelectorAll('button')).find(el => el.innerText.includes('Infiltrate Company'));
  if (!infilButton) {
    ns.print(`Can't Infiltrate`);
    returnToWorld();
    ns.exit();
  }
  infilButton[Object.keys(infilButton)[1]].onClick({ isTrusted: true });

  // starts the infiltration
  const startButton = Array.from(doc.querySelectorAll('button')).find(el => el.innerText.includes('Start'));
  startButton[Object.keys(startButton)[1]].onClick({ isTrusted: true });

  // keyboardEvent[initMethod](
  //   'keydown', // event type: keydown, keyup, keypress
  //   true, // bubbles
  //   true, // cancelable
  //   eval('window'), // view: should be window
  //   32, // keyCode: unsigned long - the virtual key code, else 0
  //   0, // charCode: unsigned long - the Unicode character associated with the depressed key, else 0
  //   false, // ctrlKey
  //   false, // altKey
  //   false, // shiftKey
  //   false, // metaKey
  // );
  try {
    const keyboardEvent = {
      type: 'keydown',
      isTrusted: true,
      key: 'Space',
      code: '',
      location: 0,
      repeat: false,
      isComposing: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      repeatCount: 0,
      charCode: 0,
      keyCode: 0,
      which: 0,
    }

    await ns.sleep(4e3);

    for (let i = 0; i < 500; i++) {
      doc.dispatchEvent(keyboardEvent);
      await ns.sleep(10);
    }
  } catch (error) {
    ns.print(error);
  }
}

function returnToWorld() {
  const returnButton = Array.from(doc.querySelectorAll('button')).find(el => el.innerText.includes('Return to World'));
  returnButton[Object.keys(returnButton)[1]].onClick({ isTrusted: true });
}

function sellInfo() {
  const sellButton = Array.from(doc.querySelectorAll('button')).find(el => el.innerText.includes('Sell for'));
  sellButton[Object.keys(sellButton)[1]].onClick({ isTrusted: true });
}