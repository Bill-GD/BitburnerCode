/** Version 1.0
 * First time trying to make a Corporation script
 * Can create a new Corporation
 * Can expand to 2 industries (Tobacco & Healthcare)
 * Can expand to cities
 * Can handle Warehouses, Offices and Employees
 * Can create/discontinue new Products
 * Can check for Unlocks, Upgrades, Researches and AdVert
 * 
 * Things may break in the future as not everything is tested
 */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog('ALL');
    ns.tail();
    ns.clearLog();

    const corp = ns.corporation;

    // mutable enums
    const Enums = {
        // indicates what happens next
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
            // ShadyAccounting: 'Shady Accounting',
            MarketCompetition: 'Market Data - Competition',
            // GovernmentPartnership: 'Government Partnership',
        },
        Upgrades: {
            SmartFactories: 'Smart Factories',
            WilsonAnalytics: 'Wilson Analytics',
            NeuralAccelerators: 'Neural Accelerators',
            ProjectInsight: 'Project Insight',
            SmartStorage: 'Smart Storage',
            NuoptimalImplants: 'Nuoptimal Nootropic Injector Implants',
            FocusWires: 'FocusWires',
            DreamSense: 'DreamSense',
            SpeechImplants: 'Speech Processor Implants',
            ABCSalesBots: 'ABC SalesBots',
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
    const industryInfo = industry => corp.getIndustryData(industry);
    const divInfo = division => corp.getDivision(division);
    const officeInfo = (division, city) => corp.getOffice(division, city);
    const officeSizeCost = (division, city, size) => corp.getOfficeSizeUpgradeCost(division, city, size);
    const warehouseInfo = (division, city) => corp.getWarehouse(division, city);
    const productInfo = (division, city, product) => corp.getProduct(division, city, product);
    const upgradeLevel = upgrade => corp.getUpgradeLevel(upgrade);
    const researchCost = (division, research) => corp.getResearchCost(division, research);

    let MAX_PRODUCT_COUNT = 3;
    const researches = Object.values(Enums.Researches);
    const unlocks = Object.values(Enums.Unlocks);
    const upgrades = Object.values(Enums.Upgrades);

    if (!corp.hasCorporation()) {
        if (!(await ns.prompt('Create a new Corporation?' + `You have $${ns.formatNumber(ns.getServerMoneyAvailable('home'))} / $150b`)))
            ns.exit();
        corp.createCorporation('BillCorp', false);
    }
    try { corp.purchaseUnlock(Enums.Unlocks.SmartSupply); } catch { }
    initDivision('Tobacco', 'Bigarette');

    while (true) {
        ns.clearLog();
        initDivision('Healthcare', 'BHealth');

        // * current: start
        if (corpInfo().state === Enums.CorpStates.Purchase) {
            for (const division of getDivisions()) {
                handleProduct(division);
            }
            log(Enums.CorpStates.Start);
        }
        while (corpInfo().state === Enums.CorpStates.Purchase) await ns.sleep(10);

        // * current: purchase
        if (corpInfo().state === Enums.CorpStates.Production) {
            for (const division of getDivisions()) {
                upgradeOffices(division);
            }
            log(Enums.CorpStates.Purchase);
        }
        while (corpInfo().state === Enums.CorpStates.Production) await ns.sleep(10);

        // * current: production
        if (corpInfo().state === Enums.CorpStates.Export) {
            for (const division of getDivisions()) {
                checkAdVert(division);
                handleWarehouse(division);
            }
            log(Enums.CorpStates.Production);
        }
        while (corpInfo().state === Enums.CorpStates.Export) await ns.sleep(10);

        // * current: export
        if (corpInfo().state === Enums.CorpStates.Sale) {
            for (const division of getDivisions()) {
                handleResearch(division);
            }
            log(Enums.CorpStates.Export);
        }
        while (corpInfo().state === Enums.CorpStates.Sale) await ns.sleep(10);

        // * current: sale
        if (corpInfo().state === Enums.CorpStates.Start) {
            // for (const division of getDivisions()) {
            // }
            log(Enums.CorpStates.Sale);
        }
        while (corpInfo().state === Enums.CorpStates.Start) await ns.sleep(10);

        handleUnlocks();
        handleUpgrades();
    }

    /**
     * @param {Enums.CorpStates | string} state The current Corporation state.
     */
    function log(state) {
        ns.clearLog();
        ns.print(`Current state: ${state}\n\n`);

        const divisions = getDivisions();

        divisions.forEach(div => {
            const info = divInfo(div);
            const products = info.products;

            ns.print(`Division: ${div}`);
            ns.print(` AdVert: ${info.numAdVerts}`);
            ns.print(` Research: ${ns.formatNumber(info.researchPoints, 3)}`);
            products.forEach(product => {
                const info = productInfo(div, ns.enums.CityName.Sector12, product);
                ns.print(` Product: ${product}`);
                ns.print(`  Produced: ${ns.formatNumber(info.productionAmount, 3)}`);
            });

            ns.print('\n');
        });
    }

    /**
     * Initializes the industry. Expands to ```industry```, expands to all cities and purchases all warehouses.
     * @param {CorpIndustryName} industry Name of the industry to expand to.
     * @param {string} division Name for the division of ```industry```.
     */
    function initDivision(industry, division) {
        try {
            if (getDivisions().includes(division) || getFunds() < industryInfo(industry).startingCost * 2) return;
            corp.expandIndustry(industry, division);

            Object.values(ns.enums.CityName)
                .forEach(city => {
                    if (!divInfo(division).cities.includes(city) && getFunds() > 4e9)
                        corp.expandCity(division, city);
                    if (!corp.hasWarehouse(division, city) && getFunds() > 5e9)
                        corp.purchaseWarehouse(division, city);
                    try { corp.setSmartSupply(division, city, true); } catch { }
                });
        } catch { }
    }

    /** Purchases Unlocks if funds is sufficient. */
    function handleUnlocks() {
        unlocks.forEach(unlock => {
            if (corp.hasUnlock(unlock)) return;
            if (getFunds() < corp.getUnlockCost(unlock) * 15) return;

            corp.purchaseUnlock(unlock);
        });
    }

    /** Levels up Upgrades if funds is sufficient. */
    function handleUpgrades() {
        upgrades.forEach(upgrade => {
            if (getFunds() < corp.getUpgradeLevelCost(upgrade) * 6) return;

            corp.levelUpgrade(upgrade);
        });
    }

    /** Handles the Researches of ```division```.
     * @param {string} division Name of the division. 
     */
    function handleResearch(division) {
        // check research root
        if (!corp.hasResearched(division, Enums.Researches.HiTechLab.name)) {
            if (divInfo(division).researchPoints < researchCost(division, Enums.Researches.HiTechLab.name))
                return;
            corp.research(division, Enums.Researches.HiTechLab.name);
        }
        researches.forEach(research => {
            // skip if: has researched, prereq not researched, insufficient fund
            if (corp.hasResearched(division, research.name)) return;
            if (!corp.hasResearched(division, research.prerequisite)) return;
            if (divInfo(division).researchPoints < researchCost(division, research.name)) return;

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
        let upgraded = false;

        try {
            Object.values(ns.enums.CityName).forEach(city => {
                // before employee count reaches 9
                if (officeInfo(division, city).size <= 9) {
                    if (getFunds() > officeSizeCost(division, city, 3) * 5) {
                        corp.upgradeOfficeSize(division, city, 3);
                        upgraded = true;
                    }
                }
                // force employee count to be multiples of 9 
                else {
                    if (getFunds() > officeSizeCost(division, city, 9) * 5) {
                        corp.upgradeOfficeSize(division, city, 9);
                        upgraded = true;
                    }
                }
                if (upgraded) handleEmployees(division);
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
                try {
                    const maxSize = officeInfo(division, city).size;
                    while (officeInfo(division, city).numEmployees < maxSize) {
                        switch (officeInfo(division, city).numEmployees % 9) {
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
                                corp.hireEmployee(division, city, Enums.Jobs.RandD);
                                break;
                            case 4:
                                corp.hireEmployee(division, city, Enums.Jobs.Business);
                                break;
                        }
                    }
                } catch { }
            });
    }

    /** Handles the hiring of AdVert.
     * @param {string} division Name of the division.
     */
    function checkAdVert(division) {
        if (corp.getHireAdVertCost(division) < getFunds() * 0.05) {
            corp.hireAdVert(division);
        }
    }

    /** Handles the warehouse of ```division```.
     * @param {string} division Name of the division.
     */
    function handleWarehouse(division) {
        Object.values(ns.enums.CityName)
            .forEach(city => {
                const info = warehouseInfo(division, city);
                if (info.sizeUsed < info.size * 0.9) return;
                if (corp.getUpgradeWarehouseCost(division, city, 1) < getFunds() * 0.05) {
                    corp.upgradeWarehouse(division, city, 1);
                }
            });
    }

    /** Handles the creation of new product for the specified division.
     * @param {string} division Name of the division. 
     */
    function handleProduct(division) {
        let divProducts = divInfo(division).products;
        // 1st product
        if (divProducts.length <= 0 && getFunds() < 3e9 * 6) return;
        // later products
        if (divProducts.length > 0) {
            // limit how often a product is created
            if (getFunds() < 3e9 * 10 * 6) return;
            // only start next product if previous product is fully developed
            if (corp.getProduct(division, ns.enums.CityName.Sector12, divProducts.slice(-1)[0]).developmentProgress !== 100) return;
        }

        // remove oldest product if max product is reached
        if (divProducts.length >= MAX_PRODUCT_COUNT) {
            corp.discontinueProduct(division, divProducts[0]);
            divProducts = divInfo(division).products;
        }

        const newProduct = `${divInfo(division).type.replace(' ', '')}-` +
            (divProducts.length <= 0
                ? '0'
                : `${parseInt(divProducts.slice(-1)[0].split('-')[1]) + 1}`);

        corp.makeProduct(division, ns.enums.CityName.Sector12, newProduct, 1e9, 2e9);
        corp.sellProduct(division, ns.enums.CityName.Sector12, newProduct, 'MAX', 'MP', true);
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