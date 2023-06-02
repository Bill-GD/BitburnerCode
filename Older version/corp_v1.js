/** Version 1.1
 * Probably the final version of v1
 * 
 * Improved log with colors & format
 * Reduced some code/functions
 * Checks for (big) investment(s)
 * Switched to Restaurant
 * Changed the math (limit) of some aspects (Upgrades, Unlocks, etc...)
 * 
 * * Note: Corp is basically sucks for normal gameplay (slow & next to worthless in some BNs)
 * * Either 'borrow' a script from somewhere -> modify or use Corp manually
 * * The combo of Blade-Graft-Stock-Sleeve is much better imo
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.tail();
    ns.clearLog();

    const corp = ns.corporation;

    const colors = {
        section: getColor(ns.ui.getTheme().money),
        header: getColor(ns.ui.getTheme().hp),
        value: getColor(ns.ui.getTheme().white),
    };

    const listHeaders = {
        middleChild: `${colors.header}\u251C`,
        extendedChild: `${colors.header}\u2502`,
        lastChild: `${colors.header}\u2514`,
    }

    const Enums = {
        // indicates what's the next state
        CorpStates: {
            Start: 'START',
            Purchase: 'PURCHASE',
            Production: 'PRODUCTION',
            Export: 'EXPORT',
            Sale: 'SALE',
        },
        // CorpEmployeeJob
        Jobs: {
            Operations: 'Operations',
            Engineer: 'Engineer',
            Business: 'Business',
            Management: 'Management',
            RandD: 'Research & Development',
            // Intern: 'Intern',
            // Unassigned: 'Unassigned',
        },
        Unlocks: {
            SmartSupply: 'Smart Supply',
            // Export: 'Export',
            VeChain: 'VeChain',
            MarketDemand: 'Market Research - Demand',
            ShadyAccounting: 'Shady Accounting',
            MarketCompetition: 'Market Data - Competition',
            GovernmentPartnership: 'Government Partnership',
        },
        Upgrades: {
            FocusWires: 'FocusWires',
            SmartFactories: 'Smart Factories',
            NeuralAccelerators: 'Neural Accelerators',
            WilsonAnalytics: 'Wilson Analytics',
            NuoptimalImplants: 'Nuoptimal Nootropic Injector Implants',
            ProjectInsight: 'Project Insight',
            // SpeechImplants: 'Speech Processor Implants',
            // SmartStorage: 'Smart Storage',
            // DreamSense: 'DreamSense',
            // ABCSalesBots: 'ABC SalesBots',
        },
        Researches: {
            HiTechLab: new Research('Hi-Tech R&D Laboratory'),
            AutoBrew: new Research('AutoBrew', 'Hi-Tech R&D Laboratory'),
            AutoPartyManager: new Research('AutoPartyManager', 'Hi-Tech R&D Laboratory'),
            AutoDrugAdmin: new Research('Automatic Drug Administration', 'Hi-Tech R&D Laboratory'),
            GoJuice: new Research('Go-Juice', 'Automatic Drug Administration'),
            CPH4: new Research('CPH4 Injections', 'Automatic Drug Administration'),
            Drones: new Research('Drones', 'Hi-Tech R&D Laboratory'),
            DroneAssembly: new Research('Drones - Assembly', 'Drones'),
            DroneTransport: new Research('Drones - Transport', 'Drones'),
            HRRecruit: new Research('HRBuddy-Recruitment', 'Hi-Tech R&D Laboratory'),
            HRTraining: new Research('HRBuddy-Training', 'HRBuddy-Recruitment'),
            MarketTA1: new Research('Market-TA.I', 'Hi-Tech R&D Laboratory'),
            MarketTA2: new Research('Market-TA.II', 'Market-TA.I'),
            Overclock: new Research('Overclock', 'Hi-Tech R&D Laboratory'),
            Stimu: new Research('Sti.mu', 'Overclock'),
            SelfCorrecting: new Research('Self-Correcting Assemblers', 'Hi-Tech R&D Laboratory'),
            uFulcrum: new Research('uPgrade: Fulcrum', 'Hi-Tech R&D Laboratory'),
            uCapacity1: new Research('uPgrade: Capacity.I', 'uPgrade: Fulcrum'),
            uCapacity2: new Research('uPgrade: Capacity.II', 'uPgrade: Capacity.I'),
            uDashboard: new Research('uPgrade: Dashboard', 'uPgrade: Fulcrum'),
        },
    };

    const corpInfo = () => corp.getCorporation();
    const getDivisions = () => corpInfo().divisions;
    const getFunds = () => corpInfo().funds;
    const getAllowedFunds = () => getFunds() * 0.5; // determines how much money is allowed to use by this script

    let stage = 0;

    let MAX_PRODUCT_COUNT = 3;
    const researches = Object.values(Enums.Researches);
    let unlocks = Object.values(Enums.Unlocks);
    let upgrades = Object.values(Enums.Upgrades);

    if (!corp.hasCorporation()) {
        if (!(await ns.prompt('Create a new Corporation?' + `You have $${ns.formatNumber(ns.getServerMoneyAvailable('home'))} / $150b`)))
            ns.exit();
        corp.createCorporation('BillCorp', false);
    }
    try { corp.purchaseUnlock(Enums.Unlocks.SmartSupply); } catch { }
    initDivision('Restaurant', 'BFood');

    while (true) {
        ns.clearLog();
        initDivision('Healthcare', 'BHealth');

        // * current: start
        if (corpInfo().state === Enums.CorpStates.Purchase) {
            for (const division of getDivisions()) {
                handleProduct(division);
            }
            log();
        }
        while (corpInfo().state === Enums.CorpStates.Purchase) await ns.sleep(10);

        // * current: purchase
        if (corpInfo().state === Enums.CorpStates.Production) {
            for (const division of getDivisions()) {
                upgradeOffices(division);
                handleEmployees(division);
            }
            log();
        }
        while (corpInfo().state === Enums.CorpStates.Production) await ns.sleep(10);

        // * current: production
        if (corpInfo().state === Enums.CorpStates.Export) {
            for (const division of getDivisions()) {
                await checkAdVert(division);
            }
            log();
        }
        while (corpInfo().state === Enums.CorpStates.Export) await ns.sleep(10);

        // * current: export
        if (corpInfo().state === Enums.CorpStates.Sale) {
            for (const division of getDivisions()) {
                handleWarehouse(division);
                handleProductSale(division);
            }
            log();
        }
        while (corpInfo().state === Enums.CorpStates.Sale) await ns.sleep(10);

        // * current: sale
        if (corpInfo().state === Enums.CorpStates.Start) {
            for (const division of getDivisions()) {
                handleInvestment();
                handleResearch(division);
            }
            log();
        }
        while (corpInfo().state === Enums.CorpStates.Start) await ns.sleep(10);

        handleUnlocks();
        handleUpgrades();
    }

    /** Log the current Corp state. */
    function log() {
        ns.clearLog();
        const lines = [];
        const investFunds = corp.getInvestmentOffer().funds;

        lines.push(` sCurrent State: v${corpInfo().state}`);
        lines.push(` sFunds: v$${ns.formatNumber(getAllowedFunds(), 3)} / $${ns.formatNumber(getFunds(), 3)}`);
        lines.push(` sInvestment`);
        lines.push(`  m Current:  v$${ns.formatNumber(investFunds, 3)} / $1t`);
        lines.push(`  l Progress: v${progressBar(investFunds, 1e12)}\n`);
        const divisions = getDivisions();

        divisions.forEach(div => {
            const info = corp.getDivision(div);
            lines.push(` sDivision: v${div}`);
            const profit = (info.lastCycleRevenue - info.lastCycleExpenses) * 10;

            lines.push(`  m AdVert:   v${info.numAdVerts}`);
            lines.push(`  m Research: v${ns.formatNumber(info.researchPoints, 3)}`);
            lines.push(`  m Profit:   ` +
                (profit > 0 ? `g` : `r`) + `$${ns.formatNumber(profit, 3)} v/ cycle`);

            lines.push(`  m Cities`);
            info.cities.forEach((city, index) => {
                const oInfo = corp.getOffice(div, city);
                let employeeCount = '[';
                Object.entries(oInfo.employeeJobs).slice(0, 5).forEach(([job, count], i) => {
                    employeeCount += `${count}`;
                    if (i !== 4) employeeCount += ', ';
                });

                lines.push(`  e ` +
                    (index === 5 ? `l` : `m`) +
                    ` ${city}:${fillWhitespaces(11 - city.length - 1)}` +
                    `v${employeeCount}] -> ${ns.formatNumber(oInfo.numEmployees, 3)}`);
                // `v${ns.formatNumber(oInfo.numEmployees, 1)} / ${ns.formatNumber(oInfo.size, 1)}`);

                // lines.push(`  e ` + (index !== 5 ? 'e' : ' ') + ` l Position: ${employeeCount}`);
            });

            const totalProduct = info.products.length;
            info.products.forEach((product, index) => {
                const pInfo = corp.getProduct(div, ns.enums.CityName.Sector12, product);
                lines.push(`  ` + (index === totalProduct - 1 ? `l` : `m`) + ` Product: v${product}`);
                const devProg = pInfo.developmentProgress;
                if (devProg < 100) lines.push(`    l Development: v${ns.formatPercent(devProg / 100, 2)}`);
                else {
                    lines.push(`  ` + (index === totalProduct - 1 ? ` ` : `e`) + ` m Rating: v${ns.formatNumber(pInfo.effectiveRating, 3)}`);
                    lines.push(`  ` + (index === totalProduct - 1 ? ` ` : `e`) + ` l Sell / Prod: v${ns.formatNumber(pInfo.actualSellAmount, 3)} / ${ns.formatNumber(pInfo.productionAmount, 3)}`);
                }
            });

            const maxWidth = Math.max(...(lines.map(line => line.length)));

            ns.print(lines
                .join('\n')
                .replaceAll(' e', ` ${listHeaders.extendedChild}`)
                .replaceAll(' m ', ` ${listHeaders.middleChild} `)
                .replaceAll(' l ', ` ${listHeaders.lastChild} `)
                .replaceAll(' s', ` ${colors.section}`)
                // .replaceAll(' h', `${colors.header}`)
                .replaceAll(' v', ` ${colors.value}`)
                .replaceAll(' g', ` ${getColor('#00ff00')}`)
                .replaceAll(' r', ` ${getColor('#ff0000')}`)
            );

            ns.resizeTail((maxWidth) * 10, lines.length * 25 + 50);
        });
    }

    /**
     * Initializes the industry. Expands to ```industry```, expands to all cities and purchases all warehouses.
     * @param {CorpIndustryName} industry Name of the industry to expand to.
     * @param {string} division Name for the division of ```industry```.
     */
    function initDivision(industry, division) {
        try {
            if (getDivisions().includes(division) || getAllowedFunds() < corp.getIndustryData(industry).startingCost * 2) return;
            corp.expandIndustry(industry, division);

            Object.values(ns.enums.CityName)
                .forEach(city => {
                    if (!corp.getDivision(division).cities.includes(city) && getAllowedFunds() > 4e9)
                        corp.expandCity(division, city);
                    if (!corp.hasWarehouse(division, city) && getAllowedFunds() > 5e9)
                        corp.purchaseWarehouse(division, city);
                    try { corp.setSmartSupply(division, city, true); } catch { }
                });
        } catch { }
    }

    /** Check if Investment funds, accept if good. */
    function handleInvestment() {
        const investOffer = corp.getInvestmentOffer();
        if (investOffer.funds < 1e12 || investOffer.round > 2) return;
        corp.acceptInvestmentOffer();
    }

    /** Purchases Unlocks if funds is sufficient. */
    function handleUnlocks() {
        unlocks = unlocks.filter(unlock => !corp.hasUnlock(unlock));
        unlocks.forEach(unlock => {
            if (getAllowedFunds() < corp.getUnlockCost(unlock) * 30) return;

            corp.purchaseUnlock(unlock);
        });
    }

    /** Levels up Upgrades if funds is sufficient. */
    function handleUpgrades() {
        upgrades.forEach(upgrade => {
            if (corp.getUpgradeLevelCost(upgrade) < getAllowedFunds() / Math.max(1, Math.log(corp.getUpgradeLevel(upgrade)) * 20 / Math.LN10)) {
                if (stage === 0 && corp.getUpgradeLevel(upgrade) === 1) return;
                corp.levelUpgrade(upgrade);
            }
        });
    }

    /** Handles the Researches of ```division```.
     * @param {string} division Name of the division. 
     */
    function handleResearch(division) {
        // check research root
        if (!corp.hasResearched(division, Enums.Researches.HiTechLab.name)) {
            if (corp.getDivision(division).researchPoints < corp.getResearchCost(division, Enums.Researches.HiTechLab.name))
                return;
            corp.research(division, Enums.Researches.HiTechLab.name);
        }
        researches.forEach(research => {
            // skip if: has researched, prereq not researched, insufficient fund
            if (corp.hasResearched(division, research.name)) return;
            if (!corp.hasResearched(division, research.prerequisite)) return;
            if (corp.getDivision(division).researchPoints < corp.getResearchCost(division, research.name)) return;

            corp.research(division, research.name);

            if (research.name === Enums.Researches.uCapacity1.name) MAX_PRODUCT_COUNT = 4;
            if (research.name === Enums.Researches.uCapacity2.name) MAX_PRODUCT_COUNT = 5;
        });
    }

    /** * Upgrades office size of all cities in the specified division if the fund is sufficient.
     * * Forces the size to be multiples of 9.
     * @param {string} division Name of the division. 
     */
    function upgradeOffices(division) {
        try {
            Object.values(ns.enums.CityName).forEach(city => {
                // before employee count reaches 9
                if (corp.getOffice(division, city).size <= 9 && corp.getOfficeSizeUpgradeCost(division, city, 3) < getAllowedFunds() * 0.1)
                    corp.upgradeOfficeSize(division, city, 3);
                // force employee count to be multiples of 9 
                else if (corp.getOfficeSizeUpgradeCost(division, city, 9) < getAllowedFunds() * 0.1)
                    corp.upgradeOfficeSize(division, city, 9);
            });
        } catch { }
    }

    /** * Hires employees of the specified division if there's enough empty space.
     * * Employment cycle is 9. Meaning the assigned jobs will loop after 9 employees have been hired.
     * @param {string} division Name of the division. 
     */
    function handleEmployees(division) {
        Object.values(ns.enums.CityName)
            .forEach(city => {
                if (city !== ns.enums.CityName.Aevum) {
                    const products = corp.getDivision(division).products;
                    if (products.length <= 0) return;
                    if (products.length === 1 && corp.getProduct(division, city, products[0]).developmentProgress < 100) return;
                }
                const maxSize = corp.getOffice(division, city).size;
                while (corp.getOffice(division, city).numEmployees < maxSize) {
                    switch (corp.getOffice(division, city).numEmployees % 9) {
                        case 0:
                        case 5:
                            corp.hireEmployee(division, city, Enums.Jobs.Operations);
                            break;
                        case 1:
                        case 6:
                            corp.hireEmployee(division, city, Enums.Jobs.Engineer);
                            break;
                        case 2:
                        case 7:
                            corp.hireEmployee(division, city, Enums.Jobs.Management);
                            break;
                        case 3:
                        case 8:
                            corp.hireEmployee(division, city, Enums.Jobs.Business);
                            break;
                        case 4:
                            corp.hireEmployee(division, city, Enums.Jobs.RandD);
                            break;
                    }
                }
            });
    }

    /** Handles the hiring of AdVert.
     * @param {string} division Name of the division.
     */
    async function checkAdVert(division) {
        while (corp.getHireAdVertCost(division) < getAllowedFunds() / (Math.max(1, Math.log(corp.getDivision(division).numAdVerts) * 2 / Math.LN10) * getDivisions().length)) {
            corp.hireAdVert(division);
            await ns.sleep(1);
        }
    }

    /** Handles the warehouse of ```division```.
     * @param {string} division Name of the division.
     */
    function handleWarehouse(division) {
        Object.values(ns.enums.CityName)
            .forEach(city => {
                const info = corp.getWarehouse(division, city);
                if (info.sizeUsed < info.size * 0.99) return;
                if (corp.getUpgradeWarehouseCost(division, city, 1) < getAllowedFunds() * 0.01)
                    corp.upgradeWarehouse(division, city, 1);
            });
    }

    /** Handles the creation of new product for the specified division.
     * @param {string} division Name of the division. 
     */
    function handleProduct(division) {
        let divProducts = corp.getDivision(division).products;
        // 1st product
        if (divProducts.length <= 0 && getAllowedFunds() < 5e9) return;
        // later products
        if (divProducts.length > 0) {
            // only start next product if previous product is fully developed
            if (corp.getProduct(division, ns.enums.CityName.Sector12, divProducts.slice(-1)[0]).developmentProgress < 100) return;
            // limit how often a product is created
            if (getAllowedFunds() < 3e9 * 10) return;
        }

        // remove oldest product if max product is reached
        if (divProducts.length >= MAX_PRODUCT_COUNT) {
            corp.discontinueProduct(division, divProducts[0]);
            divProducts = corp.getDivision(division).products;
        }

        const newProduct = `${corp.getDivision(division).type.replace(' ', '')}-` +
            (divProducts.length <= 0
                ? '0'
                : `${parseInt(divProducts.slice(-1)[0].split('-')[1]) + 1}`);

        corp.makeProduct(division, ns.enums.CityName.Aevum, newProduct, 1e9, 2e9);
    }

    /** Toggles products sale of the specified division.
     * @param {string} division Name of the division.
     * @param {boolean} willSell Toggle selling. Defaults to ```true```.
     */
    function handleProductSale(division, willSell = true) {
        Object.values(ns.enums.CityName).forEach(city => {
            // const info = corp.getWarehouse(division, city);
            // if (willSell && info.sizeUsed < info.size * 0.95) return;
            corp.getDivision(division).products.forEach(product => {
                if (corp.getProduct(division, city, product).developmentProgress < 100) return;
                corp.sellProduct(division, city, product, willSell ? 'MAX' : '0', willSell ? 'MP+7' : '0', true);
            });
        });
    }

    // /**
    //  * Get the business factor from a city in the specified division.
    //  * @param {string} division Name of the division.
    //  * @param {CityName} city The city of the division.
    //  */
    // function getBusinessFactor(division, city) {
    //     const jobProd = 1 + corp.getOffice(division, city).employeeProductionByJob[Enums.Jobs.Business];
    //     return Math.pow(jobProd, 0.26) + jobProd / 10e3;
    // }

    // /**
    //  * Get the advertising factor from a city in the specified division.
    //  * @param {CorpIndustryName} industry The industry of the division.
    //  * @param {string} division Name of the division.
    //  */
    // function getAdvertisingFactors(industry, division) {
    //     const awareness = corp.getDivision(division).awareness;
    //     const popularity = corp.getDivision(division).popularity;
    //     const advertisingFactor = corp.getIndustryData(industry).advertisingFactor;

    //     const awarenessFac = Math.pow(awareness + 1, advertisingFactor);
    //     const popularityFac = Math.pow(popularity + 1, advertisingFactor);
    //     const ratioFac = awareness === 0 ? 0.01 : Math.max((popularity + 0.001) / awareness, 0.01);
    //     const totalFac = Math.pow(awarenessFac * popularityFac * ratioFac, 0.85);

    //     return totalFac;
    // }

    // /**
    //  * Calculate the market factor of the given product.
    //  * @param {Product} product The product to process. Pass product using ```ns.corporation.getProduct()```.
    //  * @returns The market factor of the product.
    //  */
    // function getMarketFactor(product) {
    //     return Math.max(0.1, (product.demand * (100 - product.competition)) / 100);
    // }

    function getColor(colorHex = '#ffffff') {
        if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
        const r = parseInt(colorHex.substring(1, 3), 16);
        const g = parseInt(colorHex.substring(3, 5), 16);
        const b = parseInt(colorHex.substring(5, 7), 16);
        return `\u001b[38;2;${r};${g};${b}m`;
    }

    function progressBar(currentProgress, fullProgress, maxChar = 10) {
        const progress = Math.trunc(currentProgress / (fullProgress / maxChar));
        return `\u251c${'\u2588'.repeat(progress)}${'\u2500'.repeat(maxChar - progress)}\u2524 ${ns.formatPercent(currentProgress / fullProgress, 2)}`;
    }

    function fillWhitespaces(count = 0) {
        return ' '.repeat(count);
    }
}
class Research {
    /**
     * @param {string} name
     * @param {string} prerequisite
     */
    constructor(name, prerequisite = '') {
        this.name = name;
        this.prerequisite = prerequisite;
    }
}