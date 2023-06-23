/** Version 2.3.1
 * Sell excess production boost materials as much as possible per cycle
 * Fixed Market-TA handling for divisions/industries that doesn't produce materials
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
  const boostMaterialRatio = [100 / 6, 2, 10, 200];
  const agricultureName = 'BFarm',
    chemicalName = 'BChem',
    tobaccoName = 'Bigarette',
    miningName = 'BMiner',
    refineName = 'BRefine',
    hardwareName = 'BHardware',
    waterName = 'BWater';

  let desiredInvestFunds = 2e12;

  const Enums = {
    BoostMaterial: {
      Agriculture: [0, 0, 0, 0.5],
      Chemical: [0, 0.1, 0, 0.5],
      Tobacco: [0, 0.3, 0, 0.2],
      Mining: [0, 0.15, 0.15, 0.2],
      Refine: [0.2, 0, 0, 0.3],
      Computer: [0, 0.3, 0, 0.2],
      WaterUtil: [0, 0, 0, 0.6],
    },
    IndustryType: {
      Agriculture: 'Agriculture',
      Chemical: 'Chemical',
      Tobacco: 'Tobacco',
      Mining: 'Mining',
      Refinery: 'Refinery',
      Computers: 'Computer Hardware',
      WaterUtil: 'Water Utilities',
      // Healthcare: 'Healthcare',
      // SpringWater: 'Spring Water',
      // Fishing: 'Fishing',
      // Restaurant: 'Restaurant',
      // Pharmaceutical: 'Pharmaceutical',
      // Robotics: 'Robotics',
      // Software: 'Software',
      // RealEstate: 'Real Estate',
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
      Unassigned: 'Unassigned',
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
      ProjectInsight: 'Project Insight',
      SmartStorage: 'Smart Storage',
      WilsonAnalytics: 'Wilson Analytics',
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
      AutoBrew: new Research('AutoBrew', 'Hi-Tech R&D Laboratory'),
      AutoPartyManager: new Research('AutoPartyManager', 'Hi-Tech R&D Laboratory'),
      // AutoDrugAdmin: new Research('Automatic Drug Administration', 'Hi-Tech R&D Laboratory'),
      // GoJuice: new Research('Go-Juice', 'Automatic Drug Administration'),
      // CPH4: new Research('CPH4 Injections', 'Automatic Drug Administration'),
      // uDashboard: new Research('uPgrade: Dashboard', 'uPgrade: Fulcrum'),
      // HRRecruit: new Research('HRBuddy-Recruitment', 'Hi-Tech R&D Laboratory'),
      // HRTraining: new Research('HRBuddy-Training', 'HRBuddy-Recruitment'),
    },
  };

  if (!corp.hasCorporation()) {
    try {
      corp.createCorporation('BillCorp', false);
    } catch { }
    try {
      if (!(await ns.prompt(
        'Create a new Corporation?\n' +
        `You have $${ns.formatNumber(ns.getServerMoneyAvailable('home'))} / $150b`
      )))
        ns.exit();
      if (ns.getServerMoneyAvailable('home') < 150e9) {
        ns.alert('Not enough money');
        ns.closeTail();
        ns.exit();
      }
      corp.createCorporation('BillCorp', true);
    } catch { }
  }

  const corpInfo = () => corp.getCorporation();
  const getDivisions = () => corpInfo().divisions;
  const getFunds = () => corpInfo().funds;

  // [current stage, limits some purchases of the stage]
  let stage = 0;
  if (getDivisions().includes(chemicalName)) stage = 2;
  if (getDivisions().includes(waterName)) stage = 4;

  let isTrickingInvestor = false;
  let prevCycleInvestment = 0;

  const researches = Object.values(Enums.Research);
  const upgrades = Object.values(Enums.Upgrade);

  try { corp.purchaseUnlock(Enums.Unlock.SmartSupply); } catch { }

  while (true) {
    ns.clearLog();

    handleInvestFraud();
    checkInvestment();
    checkStage();

    // * current: start
    if (corpInfo().state === Enums.CorpState.Purchase) {
      handleProduct();
      log(Enums.CorpState.Start);
    }
    while (corpInfo().state === Enums.CorpState.Purchase) await ns.sleep(10);

    checkProductionMaterials();
    // * current: purchase
    if (corpInfo().state === Enums.CorpState.Production) {
      upgradeOffices();
      log(Enums.CorpState.Purchase);
    }
    while (corpInfo().state === Enums.CorpState.Production) await ns.sleep(10);

    // * current: production
    if (corpInfo().state === Enums.CorpState.Export) {
      hireNewEmployees();
      handleIntern();
      log(Enums.CorpState.Production);
    }
    while (corpInfo().state === Enums.CorpState.Export) await ns.sleep(10);

    // * current: export
    if (corpInfo().state === Enums.CorpState.Sale) {
      handleMarketTA();
      log(Enums.CorpState.Export);
    }
    while (corpInfo().state === Enums.CorpState.Sale) await ns.sleep(10);

    // * current: sale
    if (corpInfo().state === Enums.CorpState.Start) {
      handleWarehouse();
      handleResearch();
      log(Enums.CorpState.Sale);
    }
    while (corpInfo().state === Enums.CorpState.Start) await ns.sleep(10);

  }

  /** * Does stage-specific management tasks. Currently has 6 stages: ```[0, 1, 2, 3, 4, 5]```.
   * * Tasks include: new division, upgrades, AdVert, import & export.
   */
  function checkStage() {
    switch (stage) {
      case 0: // expands to agriculture
        initDivision(Enums.IndustryType.Agriculture, agricultureName);
        buyFirstUpgrades();
        Object.values(ns.enums.CityName).forEach(city => {
          corp.sellMaterial(agricultureName, city, 'Plants', 'MAX', 'MP');
          corp.sellMaterial(agricultureName, city, 'Food', 'MAX', 'MP');
        });

        stage = 1;
        break;
      case 1: // more upgrades
        upgrades.slice(0, 5).forEach(upgrade => {
          if (corp.getUpgradeLevel(upgrade) < 10)
            try { corp.levelUpgrade(upgrade); } catch { }
        });

        if (corp.getDivision(agricultureName).numAdVerts < 10)
          try { corp.hireAdVert(agricultureName); } catch { }

        if (getFunds() > 1e12)
          stage = 2;
        break;
      case 2: // expand to chemical & tobacco
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

        stage = 3;
        break;
      case 3: // more upgrades
        upgrades.slice(0, 7).forEach(upgrade => {
          if (corp.getUpgradeLevel(upgrade) < 20)
            try { corp.levelUpgrade(upgrade); } catch { }
        });

        getDivisions().forEach(div => {
          if (corp.getDivision(div).numAdVerts < 20)
            try { corp.hireAdVert(div); } catch { }
        });

        if (getFunds() > 20e12)
          stage = 4;
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
            corp.exportMaterial(refineName, city, hardwareName, city, 'Metal', '-IPROD');
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

        stage = 5;
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
        break;
    }
  }

  /** Purchases Materials to boost production. */
  function checkProductionMaterials() {
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
          if (i === 0 && (division === hardwareName || division === waterName || division === miningName)) continue; // hardware
          const stored = corp.getMaterial(division, city, boostMaterials[i]).stored;
          if (stored < boostMaterialCount[i]) {
            // 10 -> buy all in 1 cycle
            corp.buyMaterial(division, city, boostMaterials[i], (boostMaterialCount[i] - stored) / 10);
            corp.sellMaterial(division, city, boostMaterials[i], '0', '0');
          }
          else {
            corp.buyMaterial(division, city, boostMaterials[i], 0);
            if (stored > boostMaterialCount[i])
              corp.sellMaterial(division, city, boostMaterials[i], ((stored - boostMaterialCount[i]) / 10).toString(), 'MP');
            else
              corp.sellMaterial(division, city, boostMaterials[i], '0', '0');
          }
        }
      }
    });
  }

  /** The first round of upgrade when starting the 1st division. */
  function buyFirstUpgrades() {
    const upgradesStage1 = upgrades.slice(0, 5);
    for (let i = 0; i < 2; i++)
      upgradesStage1.forEach(up => {
        if (corp.getUpgradeLevel(up) < 2 && getFunds() > corp.getUpgradeLevelCost(up))
          try { corp.levelUpgrade(up); } catch { }
      });
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
        if (!corp.getDivision(division).cities.includes(city) && getFunds() >= 4e9)
          corp.expandCity(division, city);
        if (!corp.hasWarehouse(division, city) && getFunds() >= 5e9) {
          corp.purchaseWarehouse(division, city);
        }
        corp.setSmartSupply(division, city, true);
        if (corp.getWarehouse(division, city).level < 2)
          corp.upgradeWarehouse(division, city, 2);
      });
    } catch { }
  }

  /** Handles the Researches of every division. */
  function handleResearch() {
    getDivisions().forEach(division => {
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
    });
  }

  /** Handles the Market TA toggling of every division. */
  function handleMarketTA() {
    getDivisions().forEach(div => {
      const ta1 = corp.hasResearched(div, Enums.Research.MarketTA1.name),
        ta2 = corp.hasResearched(div, Enums.Research.MarketTA2.name),
        makeProduct = corp.getDivision(div).makesProducts;
      const materials = corp.getIndustryData(corp.getDivision(div).type).producedMaterials;
      const products = corp.getDivision(div).products;

      if (ta1) {
        if (materials) Object.values(ns.enums.CityName).forEach(city => materials.forEach(m => corp.setMaterialMarketTA1(div, city, m, true)));
        if (makeProduct) products.forEach(p => {
          if (corp.getProduct(div, ns.enums.CityName.Aevum, p).developmentProgress >= 100)
            corp.setProductMarketTA1(div, p, true);
        });
      }
      if (ta2) {
        if (materials) Object.values(ns.enums.CityName).forEach(city => materials.forEach(m => corp.setMaterialMarketTA2(div, city, m, true)));
        if (makeProduct) products.forEach(p => {
          if (corp.getProduct(div, ns.enums.CityName.Aevum, p).developmentProgress >= 100)
            corp.setProductMarketTA2(div, p, true);
        });
      }
    });
  }

  /** * Upgrades office size of all cities of every division if the fund is sufficient.
   * * Forces the size to be multiples of 9.
   * * Forces the size to be balanced.
   */
  function upgradeOffices() {
    getDivisions().forEach(division => {
      try {
        Object.values(ns.enums.CityName).forEach(city => {
          const office = corp.getOffice(division, city);
          // get min size of all cities of every division
          const minSize = Math.min(
            ...new Set(
              getDivisions().map(
                d => Object.values(ns.enums.CityName).map(c => corp.getOffice(d, c).size)
              ).reduce((acc, e) => [...acc, ...e], [])
            )
          );
          if (office.size > minSize) return;
          // before employee count reaches 9
          if (office.size < 9) {
            if (corp.getOfficeSizeUpgradeCost(division, city, 3) < getFunds() * 0.7)
              corp.upgradeOfficeSize(division, city, 3);
          }
          // force employee count to be multiples of 9 
          else if (corp.getOfficeSizeUpgradeCost(division, city, 9) < getFunds() * 0.7)
            corp.upgradeOfficeSize(division, city, 9);
        });
      } catch { }
    });
  }

  /** * Hires new employees for cities of every division if there's enough empty space.
   * * Employment cycle is 9. Meaning the assigned jobs will loop after 9 employees have been hired.
   */
  function hireNewEmployees() {
    getDivisions().forEach(division => {
      Object.values(ns.enums.CityName).forEach(city => {
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
              if (corp.hasResearched(division, Enums.Research.AutoBrew.name) && corp.hasResearched(division, Enums.Research.AutoPartyManager.name)) {
                corp.hireEmployee(division, city, Enums.Job.Business);
                break;
              }
            case 8:
              if (corp.hasResearched(division, Enums.Research.AutoBrew.name) && corp.hasResearched(division, Enums.Research.AutoPartyManager.name)) {
                corp.hireEmployee(division, city, Enums.Job.Management);
                break;
              }
              corp.hireEmployee(division, city, Enums.Job.Intern);
              break;
          }
        }
      });
    });
  }

  /** * Handles the amount of Intern of all cities of every division.
   * * No Intern if automatic Morale & Energy is researched.
  */
  function handleIntern() {
    getDivisions().forEach(division => {
      if (corp.hasResearched(division, Enums.Research.AutoBrew.name) && corp.hasResearched(division, Enums.Research.AutoPartyManager.name)) {
        Object.values(ns.enums.CityName).forEach(city => {
          const info = corp.getOffice(division, city);
          if (info.employeeJobs.Intern === 0) return;
          corp.setAutoJobAssignment(division, city, Enums.Job.Intern, 0);

          corp.setAutoJobAssignment(division, city, Enums.Job.Business, info.size * (2 / 9));
          corp.setAutoJobAssignment(division, city, Enums.Job.Management, info.size * (2 / 9));
        });
      }
    });
  }

  /** Handles the warehouse size upgrade of every division. */
  function handleWarehouse() {
    if (isTrickingInvestor) return;
    getDivisions().forEach(division => {
      Object.values(ns.enums.CityName).forEach(city => {
        const info = corp.getWarehouse(division, city);

        const minSize = Math.min(
          ...new Set(
            getDivisions().map(
              d => Object.values(ns.enums.CityName).map(c => corp.getWarehouse(d, c).size)
            ).reduce((acc, e) => [...acc, ...e], [])
          )
        );
        // if storage won't be full soon or total size exceeds minSize, skips
        if (info.sizeUsed < info.size * 0.99 && info.size > minSize) return;

        if (corp.getUpgradeWarehouseCost(division, city, 1) < getFunds() * 0.6)
          corp.upgradeWarehouse(division, city, 1);
      });
    });
  }

  /** Handles the creation of new product for any division that can make product. */
  function handleProduct() {
    const designInvest = 5e8,
      advInvest = 1e8;
    getDivisions().forEach(division => {
      if (!corp.getDivision(division).makesProducts) return;
      let divProducts = corp.getDivision(division).products;
      // 1st product
      if (divProducts.length <= 0 && getFunds() < designInvest + advInvest) return;
      // later products
      if (divProducts.length > 0) {
        // only start next product if previous product is fully developed
        if (corp.getProduct(division, ns.enums.CityName.Aevum, divProducts.slice(-1)[0]).developmentProgress < 100) return;
        Object.values(ns.enums.CityName).forEach(city => {
          corp.sellProduct(division, city, divProducts.slice(-1)[0], 'MAX', 'MP', true);
        });
        // limit how often a product is created
        if (getFunds() < (designInvest + advInvest) * 8) return;
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

      corp.makeProduct(division, ns.enums.CityName.Aevum, newProduct, designInvest, advInvest);
    });
  }

  /** Check if Investment funds, accept if good. */
  function checkInvestment() {
    const investOffer = corp.getInvestmentOffer();
    switch (investOffer.round) { // the round currently in, not done
      case 1:
        desiredInvestFunds = 2e12;
        break;
      case 2:
        desiredInvestFunds = 25e12;
        break;
      case 3:
        desiredInvestFunds = 1e15;
        break;
      // case 4:
      //   desiredInvestFunds = 25e15;
      //   break;
    }

    // if resulting funds is less than desired, returns
    if (investOffer.funds + getFunds() < desiredInvestFunds) return;

    // only continue waiting if gain/cycle is ok (>0.1%)
    if (prevCycleInvestment - investOffer.funds > prevCycleInvestment * 0.001) {
      prevCycleInvestment = investOffer.funds;
      return;
    }

    corp.acceptInvestmentOffer();
    isTrickingInvestor = false;
    prevCycleInvestment = 0;

    // after accepting the investment
    if (!isTrickingInvestor)
      getDivisions().forEach(division => {
        Object.values(ns.enums.CityName).forEach(city => {
          const info = corp.getOffice(division, city);
          switch (info.size) {
            case 3:
              corp.setAutoJobAssignment(division, city, Enums.Job.Business, 1);
              corp.setAutoJobAssignment(division, city, Enums.Job.Operations, 1);
              corp.setAutoJobAssignment(division, city, Enums.Job.Engineer, 1);
              break;
            case 6:
              corp.setAutoJobAssignment(division, city, Enums.Job.Business, 1);
              corp.setAutoJobAssignment(division, city, Enums.Job.Operations, 2);
              corp.setAutoJobAssignment(division, city, Enums.Job.Engineer, 1);
              corp.setAutoJobAssignment(division, city, Enums.Job.Management, 1);
              corp.setAutoJobAssignment(division, city, Enums.Job.RandD, 1);
              break;
            default:
              corp.setAutoJobAssignment(division, city, Enums.Job.Business, info.size * (1 / 9));
              corp.setAutoJobAssignment(division, city, Enums.Job.Operations, info.size * (2 / 9));
              corp.setAutoJobAssignment(division, city, Enums.Job.Engineer, info.size * (2 / 9));
              corp.setAutoJobAssignment(division, city, Enums.Job.Management, info.size * (1 / 9));
              corp.setAutoJobAssignment(division, city, Enums.Job.RandD, info.size * (1 / 9));
              corp.setAutoJobAssignment(division, city, Enums.Job.Intern, info.size * (2 / 9));
          }
        });
      });

    // updates desired funds for next round
    switch (investOffer.round) { // the round currently in, not done
      case 2:
        desiredInvestFunds = 25e12;
        break;
      case 3:
        desiredInvestFunds = 1e15;
        break;
      // case 4:
      //   desiredInvestFunds = 25e15;
      //   break;
    }
  }

  /**
   * * Handles the Investment fraud at the beginning to quickly get money.
   * * Might expand if Investment fraud is also useful afterwards.
   */
  function handleInvestFraud() {
    if (stage !== 1 && stage !== 3) return;

    let divisions = getDivisions();
    // if there're no product when can produce or not yet developed at least 1, skip
    if (stage === 3)
      for (const div of divisions)
        if (corp.getDivision(div).makesProducts) {
          const allProducts = corp.getDivision(div).products;
          if (allProducts.length === 0) return;
          if (allProducts.length === 1 && corp.getProduct(div, ns.enums.CityName.Aevum, allProducts[0]).developmentProgress < 100) return;
        }

    for (const division of divisions) {
      // if boost material purchase is not done, skip fraud this cycle
      for (const city of Object.values(ns.enums.CityName)) {
        const warehouseSize = corp.getWarehouse(division, city).size;
        for (const m of boostMaterials) {
          const index = boostMaterials.indexOf(m);
          const stored = corp.getMaterial(division, city, m).stored;
          if (stored < Enums.BoostMaterial[corp.getDivision(division).type][index] * warehouseSize * boostMaterialRatio[index])
            return;
        }
      }

      Object.values(ns.enums.CityName).forEach(city => {
        const info = corp.getOffice(division, city);

        if (info.numEmployees !== 0) {
          corp.setAutoJobAssignment(division, city, Enums.Job.Operations, 0);
          corp.setAutoJobAssignment(division, city, Enums.Job.Engineer, 0);
          corp.setAutoJobAssignment(division, city, Enums.Job.Management, 0);
          corp.setAutoJobAssignment(division, city, Enums.Job.RandD, 0);
          corp.setAutoJobAssignment(division, city, Enums.Job.Intern, 0);
          corp.setAutoJobAssignment(division, city, Enums.Job.Business, info.size);
        }

        isTrickingInvestor = true;
        boostMaterials.forEach(m => {
          // if div doesn't need the material, sell it
          if (!Object.keys(corp.getIndustryData(corp.getDivision(division).type).requiredMaterials).includes(m))
            corp.sellMaterial(division, city, m, 'MAX', 'MP');
        });
      });
    }
  }

  /** Log the current Corp state. */
  // Might change how it log divisions when all planned divisions have been expanded to.
  function log(state) {
    ns.clearLog();
    const lines = [];
    const investFunds = corp.getInvestmentOffer().funds;
    const profit = (corpInfo().revenue - corpInfo().expenses) * 10;

    lines.push(` sCurrent Stage: v${stage}`);
    lines.push(` sCurrent State: v${state}`);
    lines.push(` sFunds: v$${ns.formatNumber(getFunds(), 3)}`);
    lines.push(` sShares: v${ns.formatNumber(corpInfo().numShares, 3)}`);
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

    ns.resizeTail((maxWidth) * 10, lines.length * 25 + 25);
  }

  function getColor(colorHex = '#ffffff') {
    if (!colorHex.includes('#')) return '\u001b[38;2;255;255;255m';
    const r = parseInt(colorHex.substring(1, 3), 16);
    const g = parseInt(colorHex.substring(3, 5), 16);
    const b = parseInt(colorHex.substring(5, 7), 16);
    return `\u001b[38;2;${r};${g};${b}m`;
  }

  function progressBar(currentProgress, fullProgress, maxChar = 10) {
    const progress = Math.min(maxChar, Math.trunc(currentProgress / (fullProgress / maxChar)));
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