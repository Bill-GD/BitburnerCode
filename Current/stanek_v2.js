/** Version 2.0.3
 * Added placement for size [7,6]
 */
/** @param {NS} ns */
export async function main(ns) {
  try {
    const doc = eval('document');
    doc.querySelector('svg[aria-label="Stats"]').parentElement.click();
    const labels = doc.getElementsByClassName('MuiTypography-root');
    let bitnode = '', level = '';
    for (const i in labels) {
      const text = labels.item(i).textContent;
      if (text.includes('BitNode') && text.includes('(Level')) {
        bitnode = text.split(':')[0].split(' ')[1];
        level = text.split('(')[1].split(' ')[1].charAt(0);
        break;
      }
    }
    doc.querySelector('svg[aria-label="Staneks Gift"]').parentElement.click();
    const size = getSize(parseInt(bitnode), parseInt(level));

    const Fragments = {
      Strength: 10,
      Defense: 12,
      Dexterity: 14,
      Agility: 16,
      Blade: 30,
      Crime: 28,
      HacknetProd: 20,
    };

    if (ns.stanek.acceptGift())
      ns.alert(`Accepted Stanek's gift`);
    else {
      ns.alert(`Failed to accept gift`);
      ns.exit();
    }

    // rotation parameter uses 'E' rotation
    if (compareSize(size, [7, 7])) {
      ns.stanek.placeFragment(0, 0, 3, Fragments.Strength);
      ns.stanek.placeFragment(2, 2, 0, Fragments.Agility);
      ns.stanek.placeFragment(1, 0, 3, Fragments.Defense);
      ns.stanek.placeFragment(0, 5, 0, Fragments.Dexterity);
      ns.stanek.placeFragment(4, 5, 0, Fragments.Blade);
      ns.stanek.placeFragment(5, 2, 3, Fragments.Crime);
      ns.stanek.placeFragment(0, 3, 0, 106);
      ns.stanek.placeFragment(3, 3, 0, 105);
      ns.stanek.placeFragment(3, 0, 2, 101);
    }
    if (compareSize(size, [7, 6])) {
      ns.stanek.placeFragment(2, 2, 0, 101);
      ns.stanek.placeFragment(0, 4, 0, Fragments.Blade);
      ns.stanek.placeFragment(3, 3, 1, Fragments.Crime);
      ns.stanek.placeFragment(4, 3, 1, 105);
      ns.stanek.placeFragment(6, 1, 1, Fragments.HacknetProd);
      ns.stanek.placeFragment(4, 0, 0, Fragments.Agility);
      ns.stanek.placeFragment(2, 0, 0, Fragments.Strength);
      ns.stanek.placeFragment(0, 0, 3, Fragments.Dexterity);
      ns.stanek.placeFragment(0, 1, 1, Fragments.Defense);
    }
  } catch (error) {
    ns.alert(`Can't access BitNode detail\nMaybe you're focusing on work/crime\n` + error.message);
  }

  /** @returns {[number, number]} Returns ```[width, height]```. */
  function getSize(bitnode = 1, level = 1) {
    const baseSize = 9 + ns.getBitNodeMultipliers(bitnode, level).StaneksGiftExtraSize + 3;
    return [Math.max(2, Math.min(Math.floor(baseSize / 2 + 1), 25)), Math.max(3, Math.min(Math.floor(baseSize / 2 + 0.6), 25))];
  }

  /**
   * @param {[number, number]} availableSize 
   * @param {[number, number]} presetSize 
   * @returns ```true``` if the sizes match, otherwise ```false```.
   */
  function compareSize(availableSize, presetSize) {
    return JSON.stringify(availableSize) === JSON.stringify(presetSize);
  }
}