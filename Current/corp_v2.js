/** Version 2.0.1
 * Removed HR Researches
 * Now use the recently fixed import 'IPROD' (have not tested yet)
 * The funds needed to buy upgrades & AdVert gradually increases after a certain level
 * Now use the new maxProducts property (the old one is flawed)
 * Product rating is now the average of all cities
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

    const boostMaterials = ['Hardware', 'Robots', 'AI Cores', 'Real Estate'];
    const agricultureName = 'BFarm',
        restaurantName = 'BDiner',
        tobaccoName = 'Bigarette';

    let desiredInvestFunds = 1e12;

    const Enums = {
        BoostMaterial: {
            Agriculture1: [0, 100, 100, 35000],
            Agriculture2: [0, 130, 130, 45000],
            Agriculture3: [0, 150, 150, 60000],
            Restaurant: [0, 0, 3000, 0],
            // Tobacco: [0, 0, 0, 0],
        },
        IndustryType: {
            Water: 'Water Utilities',
            SpringWater: 'Spring Water',
            Agriculture: 'Agriculture',
            Fishing: 'Fishing',
            Mining: 'Mining',
            Refinery: 'Refinery',
            Restaurant: 'Restaurant',
            Tobacco: 'Tobacco',
            Chemical: 'Chemical',
            Pharmaceutical: 'Pharmaceutical',
            Computers: 'Computer Hardware',
            Robotics: 'Robotics',
            Software: 'Software',
            Healthcare: 'Healthcare',
            RealEstate: 'Real Estate',
        },
        // indicates what's the next state
        CorpState: {
            Start: 'START',
            Purchase: 'PURCHASE',
            Production: 'PRODUCTION',
            Export: 'EXPORT',
            Sale: 'SALE',
        },
        Job: {
            Operations: 'Operations',
            Engineer: 'Engineer',
            Business: 'Business',
            Management: 'Management',
            RandD: 'Research & Development',
            Intern: 'Intern',
            // Unassigned: 'Unassigned',
        },
        Unlock: {
            SmartSupply: 'Smart Supply',
            Export: 'Export',
            VeChain: 'VeChain',
            MarketDemand: 'Market Research - Demand',
            ShadyAccounting: 'Shady Accounting',
            MarketCompetition: 'Market Data - Competition',
            GovernmentPartnership: 'Government Partnership',
        },
        Upgrade: {
            SmartFactories: 'Smart Factories',
            FocusWires: 'FocusWires',
            NeuralAccelerators: 'Neural Accelerators',
            SpeechImplants: 'Speech Processor Implants',
            NuoptimalImplants: 'Nuoptimal Nootropic Injector Implants',
            WilsonAnalytics: 'Wilson Analytics',
            ProjectInsight: 'Project Insight',
            SmartStorage: 'Smart Storage',
            // DreamSense: 'DreamSense',
            // ABCSalesBots: 'ABC SalesBots',
        },
        Research: {
            HiTechLab: new Research('Hi-Tech R&D Laboratory'),
            AutoBrew: new Research('AutoBrew', 'Hi-Tech R&D Laboratory'),
            AutoPartyManager: new Research('AutoPartyManager', 'Hi-Tech R&D Laboratory'),
            AutoDrugAdmin: new Research('Automatic Drug Administration', 'Hi-Tech R&D Laboratory'),
            GoJuice: new Research('Go-Juice', 'Automatic Drug Administration'),
            CPH4: new Research('CPH4 Injections', 'Automatic Drug Administration'),
            Drones: new Research('Drones', 'Hi-Tech R&D Laboratory'),
            DroneAssembly: new Research('Drones - Assembly', 'Drones'),
            DroneTransport: new Research('Drones - Transport', 'Drones'),
            // HRRecruit: new Research('HRBuddy-Recruitment', 'Hi-Tech R&D Laboratory'),
            // HRTraining: new Research('HRBuddy-Training', 'HRBuddy-Recruitment'),
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

    if (!corp.hasCorporation()) {
        if (!(await ns.prompt('Create a new Corporation?' + `You have $${ns.formatNumber(ns.getServerMoneyAvailable('home'))} / $150b`)))
            ns.exit();
        try { corp.createCorporation('BillCorp', false); } catch { }
        try { corp.createCorporation('BillCorp', true); } catch { }
    }

    const corpInfo = () => corp.getCorporation();
    const getDivisions = () => corpInfo().divisions;
    const getFunds = () => corpInfo().funds;

    // [current stage, limits some purchases of the stage]
    let stage = [0, 0];
    if (getDivisions().includes(restaurantName)) stage[0] = 2;
    // if (getDivisions().includes(tobaccoName)) stage[0] = 4;
    switch (stage[0]) {
        case 0:
            // check for initial upgrades
            if (corp.getUpgradeLevel(Enums.Upgrade.SmartFactories) < 2) stage[1] = 0;
            else if (corp.getUpgradeLevel(Enums.Upgrade.SmartFactories) === 2) stage[1] = 1;
            // upgrade stage after agri init
            else stage[0] = 1;
            break;
        // case 2:
        //     // upgrade stage after restaurant init
        //     if (corp.getUpgradeLevel(Enums.Upgrade.SmartFactories) <= 20) stage[0] = 3;
        //     break;
    }

    const researches = Object.values(Enums.Research);
    const upgrades = Object.values(Enums.Upgrade);

    while (true) {
        ns.clearLog();
        await checkStage();
        checkInvestment();

        // * current: start
        if (corpInfo().state === Enums.CorpState.Purchase) {
            for (const division of getDivisions())
                if (corp.getDivision(division).makesProducts)
                    handleProduct(division);
            log(Enums.CorpState.Start);
        }
        while (corpInfo().state === Enums.CorpState.Purchase) await ns.sleep(10);

        // * current: purchase
        if (corpInfo().state === Enums.CorpState.Production) {
            for (const division of getDivisions())
                handleEmployees(division);
            log(Enums.CorpState.Purchase);
        }
        while (corpInfo().state === Enums.CorpState.Production) await ns.sleep(10);

        // * current: production
        if (corpInfo().state === Enums.CorpState.Export) {
            for (const division of getDivisions())
                upgradeOffices(division);
            log(Enums.CorpState.Production);
        }
        while (corpInfo().state === Enums.CorpState.Export) await ns.sleep(10);

        // * current: export
        if (corpInfo().state === Enums.CorpState.Sale) {
            for (const division of getDivisions())
                handleWarehouse(division);
            log(Enums.CorpState.Export);
        }
        while (corpInfo().state === Enums.CorpState.Sale) await ns.sleep(10);

        // * current: sale
        if (corpInfo().state === Enums.CorpState.Start) {
            for (const division of getDivisions())
                handleResearch(division);
            log(Enums.CorpState.Sale);
        }
        while (corpInfo().state === Enums.CorpState.Start) await ns.sleep(10);

    }

    /**
     * * Checks for the current stage. Currently only has 3 stages: ```[0, 1, 2]```.
     * * If the criteria is met, forwards to the next stage.
     * * Each stage has its own initialization.
     */
    async function checkStage() {
        switch (stage[0]) {
            case 0: // expands to agriculture
                initDivision(Enums.IndustryType.Agriculture, agricultureName);
                buyFirstUpgrades();
                try { corp.purchaseUnlock(Enums.Unlock.SmartSupply); } catch { }
                Object.values(ns.enums.CityName).forEach(city => {
                    if (corp.getWarehouse(agricultureName, city).level < 2)
                        corp.upgradeWarehouse(agricultureName, city, 2);
                    corp.setSmartSupply(agricultureName, city, true);
                    corp.sellMaterial(agricultureName, city, 'Plants', 'MAX', 'MP');
                    corp.sellMaterial(agricultureName, city, 'Food', 'MAX', 'MP');
                });
                buyProductionMaterials();

                stage = [1, 0];
                break;
            case 1: // more upgrades
                upgrades.slice(0, 5).forEach(upgrade => {
                    if (corp.getUpgradeLevel(upgrade) < 10)
                        try { corp.levelUpgrade(upgrade); } catch { }
                });

                if (corp.getDivision(agricultureName).numAdVerts < 10)
                    try { corp.hireAdVert(agricultureName); } catch { }

                buyProductionMaterials();
                if (getFunds() > 200e9)
                    stage = [2, 0];
                break;
            case 2: // expands to restaurant
                try { corp.purchaseUnlock(Enums.Unlock.Export); } catch { }
                initDivision(Enums.IndustryType.Restaurant, restaurantName);
                Object.values(ns.enums.CityName).forEach(city => {
                    if (corp.getWarehouse(restaurantName, city).level < 2)
                        corp.upgradeWarehouse(restaurantName, city, 2);
                    corp.setSmartSupply(restaurantName, city, true);
                    corp.exportMaterial(restaurantName, city, agricultureName, city, 'Food', 'IPROD');
                    corp.sellMaterial(agricultureName, city, 'Food', 'MAX', 'MP');
                    // corp.sellMaterial(restaurantName, city, 'Food', '40', 'MP');
                });
                buyProductionMaterials();

                stage = [3, 0];
                break;
            case 3: // more upgrades
                upgrades.forEach(upgrade => {
                    // if (corp.getUpgradeLevel(upgrade) < 20)
                    if (corp.getUpgradeLevelCost(upgrade) < getFunds() / Math.max(1, Math.log(corp.getUpgradeLevel(upgrade)) * 2.5 / Math.LN10))
                        try { corp.levelUpgrade(upgrade); } catch { }
                });

                getDivisions().forEach(division => {
                    if (corp.getHireAdVertCost(division) < getFunds() / Math.max(1, Math.log(corp.getDivision(division).numAdVerts) * 2.5 / Math.LN10))
                        try { corp.hireAdVert(division); } catch { }
                });
                buyProductionMaterials();

                // if (getFunds() > 1e12)
                //     stage = [4, 0];
                break;
            // case 4: // expands to tobacco
            //     initDivision(Enums.IndustryType.Tobacco, tobaccoName);
            //     handleEmployees(tobaccoName);
            //     Object.values(ns.enums.CityName).forEach(city => {
            //         if (corp.getWarehouse(tobaccoName, city).level < 2)
            //             corp.upgradeWarehouse(tobaccoName, city, 2);
            //         corp.setSmartSupply(tobaccoName, city, true);
            //         corp.exportMaterial(agricultureName, city, tobaccoName, city, 'Plants', 'MAX');
            //     });
            //     buyProductionMaterials();
            //     handleProduct(tobaccoName);
            //     break;
        }
    }

    /** Purchases Materials to boost production. */
    function buyProductionMaterials() {
        let division = '';
        let boostMaterialCount = [];
        switch (stage[0]) {
            case 0:
                division = agricultureName;
                boostMaterialCount = Enums.BoostMaterial.Agriculture1;
                break;
            case 1:
                division = agricultureName;
                boostMaterialCount = Enums.BoostMaterial.Agriculture2;
                break;
            case 2:
                division = agricultureName;
                boostMaterialCount = Enums.BoostMaterial.Agriculture3;
                break;
            case 3:
                division = restaurantName;
                boostMaterialCount = Enums.BoostMaterial.Restaurant;
                break;
            // case 4:
            //     division = tobaccoName;
            //     boostMaterialCount = Enums.BoostMaterial.Tobacco;
            //     break;
        }

        Object.values(ns.enums.CityName).forEach(city => {
            // if (stage[0] === 1 && corp.getWarehouse(division, city).size < 400) return;
            for (let i = 0; i < 4; i++) {
                if (corp.getMaterial(division, city, boostMaterials[i]).stored < boostMaterialCount[i])
                    corp.buyMaterial(division, city, boostMaterials[i], 1);
                else
                    corp.buyMaterial(division, city, boostMaterials[i], 0);
            }
        });
    }

    /** The first round of upgrade when starting the 1st division. */
    function buyFirstUpgrades() {
        if (stage[1] === 1) return;
        // const upgradesStage1 = [Enums.Upgrade.SmartFactories, Enums.Upgrade.FocusWires, Enums.Upgrade.NeuralAccelerators, Enums.Upgrade.SpeechImplants, Enums.Upgrade.NuoptimalImplants];
        const upgradesStage1 = upgrades.slice(0, 5);
        for (let i = 0; i < 2; i++)
            for (const up of upgradesStage1)
                try { corp.levelUpgrade(up); } catch { }
        stage[1] = 1;
    }

    /**
     * Initializes the industry. Expands to ```industry```, expands to all cities and purchases all warehouses.
     * @param {CorpIndustryName} industry Name of the industry to expand to.
     * @param {string} division Name for the division of ```industry```.
     */
    function initDivision(industry, division) {
        try {
            if (getDivisions().includes(division) || getFunds() < corp.getIndustryData(industry).startingCost * 1.5 + 45e9) return;
            corp.expandIndustry(industry, division);
            for (let i = 0; i < 2; i++)
                try { corp.hireAdVert(division); } catch { }

            Object.values(ns.enums.CityName)
                .forEach(city => {
                    if (!corp.getDivision(division).cities.includes(city) && getFunds() > 4e9)
                        corp.expandCity(division, city);
                    if (!corp.hasWarehouse(division, city) && getFunds() > 5e9)
                        corp.purchaseWarehouse(division, city);
                });
        } catch { }
    }

    /** Handles the Researches of ```division```.
     * @param {string} division Name of the division. 
     */
    function handleResearch(division) {
        // check research root
        if (!corp.hasResearched(division, Enums.Research.HiTechLab.name)) {
            if (corp.getDivision(division).researchPoints < corp.getResearchCost(division, Enums.Research.HiTechLab.name))
                return;
            corp.research(division, Enums.Research.HiTechLab.name);
        }
        try {
            researches.forEach(research => {
                // skip if: has researched, prereq not researched, insufficient point
                if (corp.hasResearched(division, research.name)) return;
                if (!corp.hasResearched(division, research.prerequisite)) return;
                if (corp.getDivision(division).researchPoints < corp.getResearchCost(division, research.name)) return;

                corp.research(division, research.name);
            });
        } catch { }
    }

    /** * Upgrades office size of all cities in the specified division if the fund is sufficient.
     * * Forces the size to be multiples of 9.
     * @param {string} division Name of the division. 
     */
    function upgradeOffices(division) {
        try {
            Object.values(ns.enums.CityName).forEach(city => {
                // before employee count reaches 9
                if (corp.getOffice(division, city).size <= 9 && corp.getOfficeSizeUpgradeCost(division, city, 3) < getFunds() * 0.8)
                    corp.upgradeOfficeSize(division, city, 3);
                // force employee count to be multiples of 9 
                else if (corp.getOfficeSizeUpgradeCost(division, city, 9) < getFunds() * 0.8)
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
                const maxSize = corp.getOffice(division, city).size;
                while (corp.getOffice(division, city).numEmployees < maxSize) {
                    switch (corp.getOffice(division, city).numEmployees % 9) {
                        case 0:
                        case 5:
                            corp.hireEmployee(division, city, Enums.Job.Operations);
                            break;
                        case 1:
                        case 6:
                            corp.hireEmployee(division, city, Enums.Job.Engineer);
                            break;
                        case 2:
                            corp.hireEmployee(division, city, Enums.Job.Business);
                            break;
                        case 3:
                            corp.hireEmployee(division, city, Enums.Job.Management);
                            break;
                        case 4:
                            corp.hireEmployee(division, city, Enums.Job.RandD);
                            break;
                        case 7:
                        case 8:
                            corp.hireEmployee(division, city, Enums.Job.Intern);
                            break;
                    }
                }
            });
    }

    /** Handles the warehouse of ```division```.
     * @param {string} division Name of the division.
     */
    function handleWarehouse(division) {
        Object.values(ns.enums.CityName)
            .forEach(city => {
                const info = corp.getWarehouse(division, city);
                if (info.sizeUsed < info.size * 0.95) return;
                if (corp.getUpgradeWarehouseCost(division, city, 1) < getFunds() * 0.01)
                    corp.upgradeWarehouse(division, city, 1);
            });
    }

    /** Handles the creation of new product for the specified division.
     * @param {string} division Name of the division. 
     */
    function handleProduct(division) {
        let divProducts = corp.getDivision(division).products;
        // 1st product
        if (divProducts.length <= 0 && getFunds() < 2e9) return;
        // later products
        if (divProducts.length > 0) {
            // only start next product if previous product is fully developed
            if (corp.getProduct(division, ns.enums.CityName.Aevum, divProducts.slice(-1)[0]).developmentProgress < 100) return;
            Object.values(ns.enums.CityName).forEach(city => {
                corp.sellProduct(division, city, divProducts.slice(-1)[0], 'MAX', 'MP', true);
            });
            // limit how often a product is created
            if (getFunds() < 2e9 * 8) return;
        }

        // remove oldest product if max product is reached
        if (divProducts.length >= corp.getDivision(division).maxProducts) {
            corp.discontinueProduct(division, divProducts[0]);
            divProducts = corp.getDivision(division).products;
        }

        const newProduct = `${corp.getDivision(division).type.replace(' ', '')}-` +
            (divProducts.length <= 0
                ? '0'
                : `${parseInt(divProducts.slice(-1)[0].split('-')[1]) + 1}`);

        corp.makeProduct(division, ns.enums.CityName.Aevum, newProduct, 1e9, 1e9);
    }

    /** Check if Investment funds, accept if good. */
    function checkInvestment() {
        const investOffer = corp.getInvestmentOffer();
        switch (investOffer.round) { // the round currently in, not done
            case 1:
                desiredInvestFunds = 1e12;
                if (investOffer.funds < desiredInvestFunds) return;
                corp.acceptInvestmentOffer();
                break;
            case 2:
                desiredInvestFunds = 50e12;
                if (investOffer.funds < desiredInvestFunds) return;
                corp.acceptInvestmentOffer();
                break;
        }
    }

    /** Log the current Corp state. */
    function log(state) {
        ns.clearLog();
        const lines = [];
        const investFunds = corp.getInvestmentOffer().funds;
        const profit = (corpInfo().revenue - corpInfo().expenses) * 10;

        lines.push(` sCurrent Stage: v${stage[0]} - ${stage[1]}`);
        lines.push(` sCurrent State: v${state}`);
        lines.push(` sFunds: v$${ns.formatNumber(getFunds(), 3)}`);
        lines.push(` sProfit: ` +
            (profit > 0 ? `g` : `r`) + `$${ns.formatNumber(profit, 3)} v/ cycle`);
        lines.push(` sInvestment`);
        lines.push(`  m Round:    v${corp.getInvestmentOffer().round}`);
        lines.push(`  m Current:  v$${ns.formatNumber(investFunds, 3)} / $${ns.formatNumber(desiredInvestFunds, 3)}`);
        lines.push(`  l Progress: v${progressBar(investFunds, desiredInvestFunds)}\n`);
        const divisions = getDivisions();

        divisions.forEach(div => {
            const info = corp.getDivision(div);
            lines.push(` sDivision: v${div}`);
            const dProfit = (info.lastCycleRevenue - info.lastCycleExpenses) * 10;

            lines.push(`  m AdVert:   v${info.numAdVerts}`);
            lines.push(`  m Research: v${ns.formatNumber(info.researchPoints, 3)}`);

            if (info.makesProducts) {
                lines.push(`  m Profit:   ` +
                    (dProfit > 0 ? `g` : `r`) + `$${ns.formatNumber(dProfit, 3)} v/ cycle`);
                const totalProduct = info.products.length;
                info.products.forEach((product, index) => {
                    const pInfo = corp.getProduct(div, ns.enums.CityName.Sector12, product);
                    const avgEffRating = Object.values(ns.enums.CityName)
                        .map(city => corp.getProduct(div, city, product).effectiveRating)
                        .reduce((total, current) => total + current) / Object.values(ns.enums.CityName).length;
                    lines.push(`  ` + (index === totalProduct - 1 ? `l` : `m`) + ` Product: v${product}`);
                    const devProg = pInfo.developmentProgress;
                    if (devProg < 100) lines.push(`    l Development: v${ns.formatPercent(devProg / 100, 2)}`);
                    else {
                        lines.push(`  ` + (index === totalProduct - 1 ? ` ` : `e`) + ` m Avg. Rating: v${ns.formatNumber(avgEffRating, 3)}`);
                        lines.push(`  ` + (index === totalProduct - 1 ? ` ` : `e`) + ` l Sell / Prod: v${ns.formatNumber(pInfo.actualSellAmount, 3)} / ${ns.formatNumber(pInfo.productionAmount, 3)}`);
                    }
                });
            }
            else
                lines.push(`  l Profit:   ` +
                    (dProfit > 0 ? `g` : `r`) + `$${ns.formatNumber(dProfit, 3)} v/ cycle`);
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
    }

    function getColor(colorHex = '#ffffff') {
        if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
        const r = parseInt(colorHex.substring(1, 3), 16);
        const g = parseInt(colorHex.substring(3, 5), 16);
        const b = parseInt(colorHex.substring(5, 7), 16);
        return `\u001b[38;2;${r};${g};${b}m`;
    }

    function progressBar(currentProgress, fullProgress, maxChar = 10) {
        const progress = Math.trunc(currentProgress / (fullProgress / maxChar));
        return `\u251c${'\u2588'.repeat(progress)}${'\u2500'.repeat(Math.max(0, maxChar - progress))}\u2524 ${ns.formatPercent(currentProgress / fullProgress, 2)}`;
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