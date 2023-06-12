/** @param {NS} ns */
export async function main(ns) {
  let target = await ns.prompt(
    'Choose a city',
    {
      'type': 'select',
      'choices': Object.keys(ns.enums.CityName).map(c => ns.enums.CityName[c])
    }
  );
  if (target === '')
    ns.exit();
  if (target === ns.getPlayer().city) {
    ns.alert(`(!) You're already at ${target} (!)`);
    ns.exit();
  }
  if (ns.singularity.travelToCity(target)) ns.alert(`(!) You've traveled to ${target} (!)`);
  else ns.alert(`(!) Couldn't travel to ${target} (!)`);
}