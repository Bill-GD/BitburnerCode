/** Version 2.2
 * Will now trick Investor at the beginning -> money
 * Changed boost materials amount to percentage of storage
 * Expand to Tobacco along with Chemical -> Chemical cycle
 * Expand to Mining, Refinery, Computer Hardware & Water Utils -> water cycle
 * Changed Research priority
 */
//* Consider employee hiring and 'Auto' Researches compatibility
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
  const boostMaterialRatio = [16.67, 2, 10, 200];
  const agricultureName = 'BFarm',
    chemicalName = 'BChem',
    tobaccoName = 'Bigarette',
    miningName = 'BMiner',
    refineName = 'BRefine',
    hardwareName = 'BHardware',
    waterName = 'BWater';

  let desiredInvestFunds = 15e11;

  const Enums = {
    BoostMaterial: {
      Agriculture: [0, 0, 0, 0.5],
      Chemical: [0, 0, 0, 0.5],
      Tobacco: [0, 0, 0, 0.25],
      Mining: [0, 0, 0.1, 0.3],
      Refine: [0.15, 0, 0, 0.4],
      Computer: [0, 0.05, 0, 0.3],
      WaterUtil: [0, 0, 0.05, 0.45],
    },
    IndustryType: {
      WaterUtil: 'Water Utilities',
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
      MarketTA1: new Research('Market-TA.I', 'Hi-Tech R&D Laboratory'),
      MarketTA2: new Research('Market-TA.II', 'Market-TA.I'),
      Drones: new Research('Drones', 'Hi-Tech R&D Laboratory'),
      DroneAssembly: new Research('Drones - Assembly', 'Drones'),
      DroneTransport: new Research('Drones - Transport', 'Drones'),
      Overclock: new Research('Overclock', 'Hi-Tech R&D Laboratory'),
      uFulcrum: new Research('uPgrade: Fulcrum', 'Hi-Tech R&D Laboratory'),
      uCapacity1: new Research('uPgrade: Capacity.I', 'uPgrade: Fulcrum'),
      uCapacity2: new Research('uPgrade: Capacity.II', 'uPgrade: Capacity.I'),
      SelfCorrecting: new Research('Self-Correcting Assemblers', 'Hi-Tech R&D Laboratory'),
      Stimu: new Research('Sti.mu', 'Overclock'),
      uDashboard: new Research('uPgrade: Dashboard', 'uPgrade: Fulcrum'),
      AutoBrew: new Research('AutoBrew', 'Hi-Tech R&D Laboratory'),
      AutoPartyManager: new Research('AutoPartyManager', 'Hi-Tech R&D Laboratory'),
      AutoDrugAdmin: new Research('Automatic Drug Administration', 'Hi-Tech R&D Laboratory'),
      GoJuice: new Research('Go-Juice', 'Automatic Drug Administration'),
      CPH4: new Research('CPH4 Injections', 'Automatic Drug Administration'),
      // HRRecruit: new Research('HRBuddy-Recruitment', 'Hi-Tech R&D Laboratory'),
      // HRTraining: new Research('HRBuddy-Training', 'HRBuddy-Recruitment'),
    },
  };

  if (!corp.hasCorporation()) {
    if (!(await ns.prompt('Create a new Corporation?' + `You have $${ns.formatNumber(ns.getServerMoneyAvailable('home'))} / $150b`)))
      ns.exit();
    if (ns.getServerMoneyAvailable('home') < 150e9) {
      ns.alert('Not enough money');
      ns.closeTail();
      ns.exit();
    }
    try { corp.createCorporation('BillCorp', false); } catch { }
    try { corp.createCorporation('BillCorp', true); } catch { }
  }

  const corpInfo = () => corp.getCorporation();
  const getDivisions = () => corpInfo().divisions;
  const getFunds = () => corpInfo().funds;

  // [current stage, limits some purchases of the stage]
  let stage = [0, 0];
  // check for initial upgrades
  if (corp.getUpgradeLevel(Enums.Upgrade.SmartFactories) < 2) stage[1] = 0;
  else if (corp.getUpgradeLevel(Enums.Upgrade.SmartFactories) === 2) stage[1] = 1;
  // upgrade stage after agri init
  else stage[0] = 1;
  if (getDivisions().includes(chemicalName)) stage[0] = 2;
  // if (getDivisions().includes(waterName)) stage[0] = 4;

  let isTrickingInvestor = false;

  const researches = Object.values(Enums.Research);
  const upgrades = Object.values(Enums.Upgrade);

  try { corp.purchaseUnlock(Enums.Unlock.SmartSupply); } catch { }

  while (true) {
    ns.clearLog();

    if (stage[0] === 1)
      handleInvestFraud();

    checkInvestment();
    await checkStage();

    // * current: start
    if (corpInfo().state === Enums.CorpState.Purchase) {
      getDivisions().forEach(div => {
        if (corp.getDivision(div).makesProducts) handleProduct(div);
      });
      log(Enums.CorpState.Start);
    }
    while (corpInfo().state === Enums.CorpState.Purchase) await ns.sleep(10);

    // * current: purchase
    if (corpInfo().state === Enums.CorpState.Production) {
      getDivisions().forEach(div => { handleEmployees(div); });
      log(Enums.CorpState.Purchase);
    }
    while (corpInfo().state === Enums.CorpState.Production) await ns.sleep(10);

    // * current: production
    if (corpInfo().state === Enums.CorpState.Export) {
      getDivisions().forEach(div => { upgradeOffices(div); });
      log(Enums.CorpState.Production);
    }
    while (corpInfo().state === Enums.CorpState.Export) await ns.sleep(10);

    // * current: export
    if (corpInfo().state === Enums.CorpState.Sale) {
      getDivisions().forEach(div => { handleWarehouse(div); });
      log(Enums.CorpState.Export);
    }
    while (corpInfo().state === Enums.CorpState.Sale) await ns.sleep(10);

    // * current: sale
    if (corpInfo().state === Enums.CorpState.Start) {
      getDivisions().forEach(div => { handleResearch(div); });
      log(Enums.CorpState.Sale);
    }
    while (corpInfo().state === Enums.CorpState.Start) await ns.sleep(10);
  }

  /** * Does stage-specific management tasks. Currently has 6 stages: ```[0, 1, 2, 3, 4, 5]```.
   * * Tasks include: new division, upgrades, AdVert, import & export.
   */
  async function checkStage() {
    switch (stage[0]) {
      case 0: // expands to agriculture
        initDivision(Enums.IndustryType.Agriculture, agricultureName);
        buyFirstUpgrades();
        Object.values(ns.enums.CityName).forEach(city => {
          corp.sellMaterial(agricultureName, city, 'Plants', 'MAX', 'MP');
          corp.sellMaterial(agricultureName, city, 'Food', 'MAX', 'MP');
        });

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
        if (getFunds() > 1e12)
          stage = [2, 0];
        break;
      case 2: // expand to chemical, tobacco & water utils
        try { corp.purchaseUnlock(Enums.Unlock.Export); } catch { }

        initDivision(Enums.IndustryType.Chemical, chemicalName);
        Object.values(ns.enums.CityName).forEach(city => {
          corp.sellMaterial(chemicalName, city, 'Chemicals', 'MAX', 'MP');
          try {
            corp.exportMaterial(agricultureName, city, chemicalName, city, 'Plants', '-IPROD');
            corp.exportMaterial(chemicalName, city, agricultureName, city, 'Chemicals', '-IPROD');
            corp.sellMaterial(chemicalName, city, 'Chemicals', 'MAX', 'MP');
          } catch { }
        });

        initDivision(Enums.IndustryType.Tobacco, tobaccoName);
        Object.values(ns.enums.CityName).forEach(city => {
          try {
            corp.exportMaterial(agricultureName, city, tobaccoName, city, 'Plants', '-IPROD');
          } catch { }
        });

        stage = [3, 0];
        break;
      case 3: // more upgrades
        upgrades.forEach(upgrade => {
          if (corp.getUpgradeLevel(upgrade) < 20)
            try { corp.levelUpgrade(upgrade); } catch { }
        });

        getDivisions().forEach(div => {
          if (corp.getDivision(div).numAdVerts < 20)
            try { corp.hireAdVert(div); } catch { }
        });

        buyProductionMaterials();
        if (getFunds() > 20e12)
          stage = [4, 0];
        break;
      case 4: // expands to water cycle
        initDivision(Enums.IndustryType.Mining, miningName);
        Object.values(ns.enums.CityName).forEach(city => {
          try {
            corp.sellMaterial(miningName, city, 'Ore', 'MAX', 'MP');
            corp.sellMaterial(miningName, city, 'Minerals', 'MAX', 'MP');
          } catch { }
        });

        initDivision(Enums.IndustryType.Refinery, refineName);
        Object.values(ns.enums.CityName).forEach(city => {
          try {
            corp.sellMaterial(refineName, city, 'Metal', 'MAX', 'MP');
            corp.exportMaterial(miningName, city, refineName, city, 'Ore', '-IPROD');
          } catch { }
        });

        initDivision(Enums.IndustryType.Computers, hardwareName);
        Object.values(ns.enums.CityName).forEach(city => {
          try {
            corp.sellMaterial(hardwareName, city, 'Hardware', 'MAX', 'MP');
            corp.exportMaterial(hardwareName, city, miningName, city, 'Hardware', '-IPROD');
          } catch { }
        });

        initDivision(Enums.IndustryType.WaterUtil, waterName);
        Object.values(ns.enums.CityName).forEach(city => {
          try {
            corp.exportMaterial(waterName, city, agricultureName, city, 'Water', '-IPROD');
            corp.exportMaterial(waterName, city, chemicalName, city, 'Water', '-IPROD');
            corp.exportMaterial(hardwareName, city, waterName, city, 'Hardware', '-IPROD');
            corp.sellMaterial(waterName, city, 'Water', 'MAX', 'MP');
          } catch { }
        });

        stage = [5, 0];
        break;
      case 5: // more upgrades
        upgrades.forEach(upgrade => {
          // if (corp.getUpgradeLevel(upgrade) < 20)
          if (corp.getUpgradeLevelCost(upgrade) < getFunds() / Math.max(1, Math.log(corp.getUpgradeLevel(upgrade)) * 1.6 / Math.LN10))
            try { corp.levelUpgrade(upgrade); } catch { }
        });

        getDivisions().forEach(division => {
          if (corp.getHireAdVertCost(division) < getFunds() / Math.max(1, Math.log(corp.getDivision(division).numAdVerts) * 1.6 / Math.LN10))
            try { corp.hireAdVert(division); } catch { }
        });
        buyProductionMaterials();
        break;
    }
  }

  /** Purchases Materials to boost production. */
  function buyProductionMaterials() {
    checkProdMaterials(agricultureName, Enums.BoostMaterial.Agriculture);
    checkProdMaterials(chemicalName, Enums.BoostMaterial.Chemical);
    checkProdMaterials(tobaccoName, Enums.BoostMaterial.Tobacco);

    checkProdMaterials(miningName, Enums.BoostMaterial.Mining);
    checkProdMaterials(refineName, Enums.BoostMaterial.Refine);
    checkProdMaterials(hardwareName, Enums.BoostMaterial.Computer);
    checkProdMaterials(waterName, Enums.BoostMaterial.WaterUtil);
  }

  /**
   * Checks the number of stored materials, compare with the desired amount and buy if necessary.
   * @param {string} division Name of the division.
   * @param {number[]} desiredRatio The desired number of materials to buy.
   */
  function checkProdMaterials(division, desiredRatio) {
    if (!getDivisions().includes(division)) return;
    Object.values(ns.enums.CityName).forEach(city => {
      if (isTrickingInvestor) {
        boostMaterials.forEach(m => corp.buyMaterial(division, city, m, 0));
      }
      else {
        const warehouseSize = corp.getWarehouse(division, city).size;
        const boostMaterialCount = desiredRatio.map(m => m * warehouseSize * boostMaterialRatio[desiredRatio.indexOf(m)]);
        for (let i = 0; i < 4; i++) {
          const stored = corp.getMaterial(division, city, boostMaterials[i]).stored;
          if (stored < boostMaterialCount[i]) {
            corp.buyMaterial(division, city, boostMaterials[i], (boostMaterialCount[i] - stored) / 10);
            corp.sellMaterial(division, city, boostMaterials[i], '0', '0');
          }
          else {
            corp.buyMaterial(division, city, boostMaterials[i], 0);
            if (stored > boostMaterialCount[i])
              corp.sellMaterial(division, city, boostMaterials[i], '1', 'MP');
            else
              corp.sellMaterial(division, city, boostMaterials[i], '0', '0');
          }
        }
      }
    });
  }

  /** The first round of upgrade when starting the 1st division. */
  function buyFirstUpgrades() {
    if (stage[1] === 1) return;
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

      Object.values(ns.enums.CityName).forEach(city => {
        if (!corp.getDivision(division).cities.includes(city) && getFunds() > 4e9)
          corp.expandCity(division, city);
        if (!corp.hasWarehouse(division, city)) {
          corp.purchaseWarehouse(division, city);
        }
        corp.setSmartSupply(division, city, true);
        if (corp.getWarehouse(division, city).level < 2)
          corp.upgradeWarehouse(division, city, 2);
      });
    } catch { }
  }

  /** Handles the Researches of ```division```.
   * @param {string} division Name of the division. 
   */
  function handleResearch(division) {
    // check research root
    if (!corp.hasResearched(division, Enums.Research.HiTechLab.name)) {
      if (corp.getDivision(division).researchPoints - 15e2 < corp.getResearchCost(division, Enums.Research.HiTechLab.name))
        return;
      corp.research(division, Enums.Research.HiTechLab.name);
    }
    try {
      researches.forEach(research => {
        // skip if: has researched, prereq not researched, insufficient point
        if (corp.hasResearched(division, research.name)) return;
        if (!corp.hasResearched(division, research.prerequisite)) return;
        if (corp.getDivision(division).researchPoints - 15e2 < corp.getResearchCost(division, research.name)) return;

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
        if (corp.getOffice(division, city).size < 9) {
          if (corp.getOfficeSizeUpgradeCost(division, city, 3) < getFunds() * 0.7)
            corp.upgradeOfficeSize(division, city, 3);
        }
        // force employee count to be multiples of 9 
        else if (corp.getOfficeSizeUpgradeCost(division, city, 9) < getFunds() * 0.7)
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
        if (corp.getUpgradeWarehouseCost(division, city, 1) < getFunds())
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
        if (investOffer.funds + getFunds() < desiredInvestFunds) return;
        corp.acceptInvestmentOffer();
        isTrickingInvestor = false; // enables purchasing materials again after accepting Investment
        Object.values(ns.enums.CityName).forEach(city => {
          corp.sellMaterial(agricultureName, city, 'Real Estate', '0', '0');
        });
        break;
      case 2:
        desiredInvestFunds = 25e12;
        if (investOffer.funds + getFunds() < desiredInvestFunds) return;
        corp.acceptInvestmentOffer();
        break;
      // placeholder for now
      case 3:
        desiredInvestFunds = 1e15;
        if (investOffer.funds + getFunds() < desiredInvestFunds) return;
        corp.acceptInvestmentOffer();
        break;
      case 4:
        desiredInvestFunds = 25e15;
        if (investOffer.funds + getFunds() < desiredInvestFunds) return;
        corp.acceptInvestmentOffer();
        break;
    }
  }

  /**
   * * Handles the Investment fraud at the beginning to quickly get money.
   * * Might expand if Investment fraud is also useful afterwards.
   */
  function handleInvestFraud() {
    const division = agricultureName;
    Object.values(ns.enums.CityName).forEach(city => {
      // check for Real Estate
      const warehouseSize = corp.getWarehouse(division, city).size;
      const stored = corp.getMaterial(division, city, 'Real Estate').stored;
      if (stored === Enums.BoostMaterial.Agriculture[3] * warehouseSize * 200) {
        isTrickingInvestor = true;
        corp.sellMaterial(agricultureName, city, 'Real Estate', 'MAX', 'MP');
      }
    });
  }

  /** Log the current Corp state. */
  // Might change how it log divisions when all planned divisions have been expanded to.
  function log(state) {
    ns.clearLog();
    const lines = [];
    const investFunds = corp.getInvestmentOffer().funds;
    const profit = (corpInfo().revenue - corpInfo().expenses) * 10;

    lines.push(` sCurrent Stage: v${stage[0]}`);
    lines.push(` sCurrent State: v${state}`);
    lines.push(` sFunds: v$${ns.formatNumber(getFunds(), 3)}`);
    lines.push(` sProfit: ` + (profit > 0 ? `g` : `r`) + `$${ns.formatNumber(profit, 3)} v/ cycle`);
    lines.push(` sInvestment`);
    lines.push(`  m Round:    v${corp.getInvestmentOffer().round}`);
    lines.push(`  m Current:  v$${ns.formatNumber(investFunds, 3)} / $${ns.formatNumber(desiredInvestFunds, 3)}`);
    lines.push(`  l Progress: v${progressBar(investFunds, desiredInvestFunds)}\n`);

    getDivisions().forEach(div => {
      const info = corp.getDivision(div);
      lines.push(` sDivision: v${div}`);
      const dProfit = (info.lastCycleRevenue - info.lastCycleExpenses) * 10;

      lines.push(`  m AdVert:   v${info.numAdVerts}`);
      lines.push(`  m Research: v${ns.formatNumber(info.researchPoints, 3)}`);
      lines.push(`  l Profit:   ` + (dProfit > 0 ? `g` : `r`) + `$${ns.formatNumber(dProfit, 3)} v/ cycle`);
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