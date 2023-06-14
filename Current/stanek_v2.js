/** Version 2.0
 * Reworked how it check for size (BN & level -> width & height)
 * Need more sizes (other BNs)
 */
/** @param {NS} ns */
export async function main(ns) {
  const size = getSize();

  const Fragments = {
    Strength: 10,
    Defense: 12,
    Dexterity: 14,
    Agility: 16,
    Blade: 30,
    Crime: 28,
  };

  if (ns.stanek.acceptGift())
    ns.alert(`Accepted Stanek's gift`);
  else {
    ns.alert(`Failed to accept gift`);
    ns.exit();
  }

  if (compareSize(size, [7, 7])) {
    ns.stanek.placeFragment(0, 0, 1, Fragments.Strength);
    ns.stanek.placeFragment(2, 2, 0, Fragments.Agility);
    ns.stanek.placeFragment(3, 1, 0, Fragments.Defense);
    ns.stanek.placeFragment(0, 5, 3, Fragments.Dexterity);
    ns.stanek.placeFragment(4, 5, 0, Fragments.Blade);
    ns.stanek.placeFragment(5, 2, 1, Fragments.Crime);
    ns.stanek.placeFragment(0, 3, 0, 106);
    ns.stanek.placeFragment(3, 3, 3, 105);
    ns.stanek.placeFragment(2, 0, 0, 101);
  }

  /** @returns {[number, number]} Returns ```[width, height]```. */
  function getSize() {
    const baseSize = 9 + ns.getBitNodeMultipliers(11, 3).StaneksGiftExtraSize + 3;
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