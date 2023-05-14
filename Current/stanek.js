/** @param {NS} ns */
export async function main(ns) {
    let s = ns.stanek
    s.acceptGift()
    let presets = ['none', 'combat', 'blade', 'crime $']	//	presets should cover all BNs in which stanek is useful
    let choice = await ns.prompt(`Choose a preset:\n('none' to keep it unchanged)`, { 'type': 'select', 'choices': presets })
    let bn = ns.getPlayer().bitNodeN

    function placeCombat() {
        s.placeFragment(2, 0, 0, 10)
        s.placeFragment(3, 1, 0, 16)
        s.placeFragment(2, 3, 0, 14)
        s.placeFragment(0, 2, 1, 12)
        s.placeFragment(1, 1, 3, 106)
    }
    switch (choice) {
        case 'none':
            break
        case presets[1]:
            s.clearGift()
            s.placeFragment(0, 0, 3, 28)
            placeCombat()
            break
        case presets[2]:
            s.clearGift()
            if (bn == 6) {
                s.placeFragment(2, 2, 2, 30)
                s.placeFragment(3, 3, 3, 106)
                s.placeFragment(2, 0, 0, 102)
                s.placeFragment(4, 0, 2, 106)
                s.placeFragment(0, 0, 3, 106)
                s.placeFragment(5, 2, 1, 102)
                s.placeFragment(0, 3, 3, 100)
            }
            if (bn == 13) {
                s.placeFragment(0, 0, 1, 30)
                placeCombat()
            }
            if (bn == 10 || bn == 7) {
                s.placeFragment(2, 0, 1, 101)
                s.placeFragment(1, 0, 3, 30)
                s.placeFragment(1, 2, 1, 105)
                s.placeFragment(0, 1, 3, 101)
            }
            break
        case presets[3]:
            s.clearGift()
            if (bn == 6) {
                s.placeFragment(2, 2, 0, 28)
                s.placeFragment(4, 0, 2, 106)
                s.placeFragment(2, 0, 1, 106)
                s.placeFragment(0, 0, 3, 106)
                s.placeFragment(5, 2, 1, 102)
                s.placeFragment(2, 4, 2, 102)
                s.placeFragment(0, 3, 3, 100)
            }
            if (bn == 10 || bn == 7) {
                s.placeFragment(2, 1, 1, 28)
                s.placeFragment(0, 0, 1, 103)
                s.placeFragment(2, 0, 1, 106)
                s.placeFragment(1, 3, 2, 101)
            }
            if (bn == 13) {
                s.placeFragment(3, 1, 1, 28)
                s.placeFragment(0, 0, 2, 107)
                s.placeFragment(3, 0, 3, 105)
                s.placeFragment(2, 3, 2, 101)
                s.placeFragment(0, 2, 0, 106)
            }
            break
    }

    let ram = ns.getScriptRam('chargeStanek.js')
    if (ns.isRunning('chargeStanek.js', 'home')) ns.kill('chargeStanek.js', 'home')
    await ns.sleep(1e3)
    let thread = Math.floor((ns.getServerMaxRam('home') - ns.getServerUsedRam('home')) * 0.9 / ram);
    thread = thread >= 1 ? thread : 1
    ns.run('chargeStanek.js', thread)
    //
    //	make presets -> choose (grid size?)
    //	sol: try to get sf13 to lv 3 -> make preset for each size changing BN
}