/** @param {NS} ns */
export async function main(ns) {
    const file = await ns.prompt(
        'Choose script to run\nIgnore to exit',
        { 'type': 'select', 'choices': ns.ls('home', '.js') }
    );

    let thread = await ns.prompt('Thread count?', { 'type': 'text' });
    thread = isNaN(parseInt(thread)) ? 1 : parseInt(thread);

    const args = (await ns.prompt('Arguments?\nSeparate by spaces', { 'type': 'text' }))
        .split(' ').filter(arg => arg === '');

    ns.exec(file, 'home', thread, ...args);
}