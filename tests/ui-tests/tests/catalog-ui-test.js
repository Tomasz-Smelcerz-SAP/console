import config from '../config';
import {
  configExampleServiceClassName,
  configExampleServiceClassNameAndProvider,
  configExampleServiceClassButton,
  configInstanceTitle,
  configInstanceTitle2,
  configInstanceLabel,
  configInstancePlan,
  configInstancePlan2,
  configAdditionalData,
  configPlanName,
  configCatalogExpectedHeader,
  configInstancesExpectedHeader,
  configRegExpData,
  configUncorrectRegExpData,
} from '../utils/catalogConfig';
import kymaConsole from '../commands/console';
import catalog from '../commands/catalog';
import common from '../commands/common';
import address from '../utils/address';
import { NamespaceManager } from '../setup/namespace-manager';

import { retry } from '../utils/retry';
import {
  testPluggable,
  isModuleEnabled,
  logModuleDisabled,
} from '../setup/test-pluggable';

const TEST_NAMESPACE = 'service-catalog-ui-test';
const REQUIRED_MODULE = 'servicecatalog';

const namespaceInstaller = new NamespaceManager(TEST_NAMESPACE);

let page, browser;

const waitForCatalogFrame = page => {
  return kymaConsole.waitForAppFrameAttached(
    page,
    address.console.getCatalogFrameUrl(),
  );
};

const waitForInstancesFrame = (page, waitForLoaded) => {
  const instancesFrameUrl = address.console.getInstancesFrameUrl();
  if (waitForLoaded) {
    return kymaConsole.waitForAppFrameLoaded(page, instancesFrameUrl);
  } else {
    return kymaConsole.waitForAppFrameAttached(page, instancesFrameUrl);
  }
};

describe('Catalog basic tests', () => {
  beforeAll(async () => {
    if (!(await isModuleEnabled(REQUIRED_MODULE))) {
      logModuleDisabled(REQUIRED_MODULE, 'beforeAll');
      return;
    }

    jest.setTimeout(240 * 1000);
    try {
      await namespaceInstaller.createIfDoesntExist();
    } catch (err) {
      await namespaceInstaller.deleteIfExists();
      throw new Error('Failed to create a namespace:', err);
    }
    await retry(async () => {
      const data = await common.beforeAll(null, 80);
      browser = data.browser;
      page = data.page;
    });
  });

  afterAll(async () => {
    if (!(await isModuleEnabled(REQUIRED_MODULE))) {
      logModuleDisabled(REQUIRED_MODULE, 'afterAll');
      return;
    }
    await namespaceInstaller.deleteIfExists();
    if (browser) {
      await browser.close();
    }
  });

  testPluggable(
    REQUIRED_MODULE,
    'Check if `Testing addon` is on the list and has details',
    async () => {
      // Hardcodes for specific test
      const exampleServiceClassNameAndProvider = configExampleServiceClassNameAndProvider;
      const exampleServiceClassButton = configExampleServiceClassButton;
      const catalogExpectedHeader = configCatalogExpectedHeader;

      // consts
      const catalogHeaderSelector = catalog.prepareSelector('toolbar-header');
      const filterDropdownButton = catalog.prepareSelector('toggle-filter');
      const activeFiltersWrapper = catalog.prepareSelector(
        'active-filters-wrapper',
      );
      const clearAllFiltersButton = catalog.prepareSelector(
        'clear-all-filters',
      );

      const showcaseButton = catalog.prepareSelector(
        'filter-item-basic-showcase',
      );
      const showcaseButtonName = 'showcase';
      const exampleServiceClassTitle = catalog.prepareSelector(
        'toolbar-header',
      );
      const exampleServiceClassDescription = catalog.prepareSelector(
        'service-description',
      );
      const exampleServiceClassLastUpdate = catalog.prepareSelector(
        'service-last-update',
      );

      console.log('Check if `Testing addon` is on the list');
      let frame;
      await Promise.all([
        page.goto(address.console.getCatalog(TEST_NAMESPACE)),
        page.waitForNavigation({
          waitUntil: ['domcontentloaded'],
        }),
        (frame = await waitForCatalogFrame(page)),
      ]);
      await frame.waitForSelector(catalogHeaderSelector);
      const catalogHeader = await frame.$eval(
        catalogHeaderSelector,
        item => item.innerHTML,
      );
      expect(catalogHeader).toContain(catalogExpectedHeader);

      const currentServices = await catalog.getServices(frame);
      expect(currentServices).toContain(exampleServiceClassNameAndProvider);

      // Check if `Testing bundle` is on the list after applying basic `showcase` filter and make sure information about what filters are applied are visible
      await frame.click(filterDropdownButton);

      await frame.click(showcaseButton);
      await frame.waitFor(activeFiltersWrapper);
      const currectActiveFilters = await catalog.getActiveFilters(frame);
      expect(currectActiveFilters).toContain(showcaseButtonName);
      expect(currectActiveFilters.length).toEqual(1);

      const searchedLocalServices = await catalog.getServices(frame);
      expect(searchedLocalServices).toContain(
        exampleServiceClassNameAndProvider,
      );
      await frame.click(clearAllFiltersButton);
      const currectActiveFiltersAfterClear = await catalog.getActiveFilters(
        frame,
      );
      expect(currectActiveFiltersAfterClear.length).toEqual(0);
      // Collapse filter is it never hovers over the cards in further tests
      await frame.click(filterDropdownButton);

      // See details of the class and confirm all necessary fields  are there
      const testingBundle = await frame.$(exampleServiceClassButton);
      await Promise.all([
        testingBundle.click(),
        frame.waitForNavigation({
          waitUntil: ['domcontentloaded', 'networkidle0'],
        }),
      ]);
      const frame2 = await waitForCatalogFrame(page);
      await frame2.waitForSelector(exampleServiceClassTitle);
      const title = await frame2.$(exampleServiceClassTitle);
      const description = await frame2.$(exampleServiceClassDescription);
      const lastUpdate = await frame2.$(exampleServiceClassLastUpdate);
      const labels = await catalog.getLabels(frame);
      expect(title.toString()).not.toBeNull();
      expect(description.toString()).not.toBeNull();
      expect(lastUpdate.toString()).not.toBeNull();
      expect(labels).toContain(showcaseButtonName);
    },
  );

  testPluggable(
    REQUIRED_MODULE,
    'Provision `Testing addon` with `Minimal` plan and check confirmation link',
    async () => {
      // Hardcodes for specific test
      const instancePlan = configInstancePlan;
      const instanceTitle = configInstanceTitle;
      const exampleServiceClassName = configExampleServiceClassName;
      const catalogExpectedHeader = configCatalogExpectedHeader;

      // consts
      const notificationLink = `a[${config.catalogTestingAtribute}="notification-success"]`;
      const exampleInstanceServiceClass = catalog.prepareSelector(
        'instance-service-class',
      );
      const addInstanceButton = catalog.prepareSelector('add-instance');
      const instancesUrl = address.console.getInstancesList(TEST_NAMESPACE);
      const catalogHeaderSelector = catalog.prepareSelector('toolbar-header');

      console.log('Provision `Testing bundle` with `Minimal` plan');
      await retry(async () => {
        await page.reload({ waitUntil: ['domcontentloaded', 'networkidle0'] });
        await catalog.createInstance(page, instancePlan, instanceTitle);
      });

      const frame = await waitForCatalogFrame(page);

      console.log(
        'Click on the provision confirmation link and confirm you were redirected to instance details page directly',
      );
      const notification = await frame.waitForSelector(notificationLink, {
        visible: true,
      });

      let frame2;
      await Promise.all([
        notification.click(),
        page.waitForNavigation({
          waitUntil: ['domcontentloaded', 'networkidle0'],
        }),
        (frame2 = await waitForInstancesFrame(page, true)),
      ]);

      const serviceClassElement = await frame2.waitForSelector(
        exampleInstanceServiceClass,
      );
      const serviceClass = await frame2.evaluate(
        element => element.textContent,
        serviceClassElement,
      );

      expect(serviceClass).toContain(exampleServiceClassName);

      console.log(
        'Go to main Instances list view and click `Add Instance` link and confirm you went to catalog',
      );

      let frame3;
      await Promise.all([
        page.goto(instancesUrl),
        page.waitForNavigation({
          waitUntil: ['domcontentloaded', 'networkidle0'],
        }),
        (frame3 = await waitForInstancesFrame(page, true)),
      ]);

      const goToCatalog = await frame3.waitForSelector(addInstanceButton);

      await Promise.all([
        goToCatalog.click(),
        page.waitForNavigation({
          waitUntil: ['domcontentloaded', 'networkidle0'],
        }),
      ]);

      const frame4 = await waitForCatalogFrame(page);
      const catalogHeaderElement = await frame4.waitForSelector(
        catalogHeaderSelector,
      );
      const catalogHeader = await frame4.evaluate(
        element => element.textContent,
        catalogHeaderElement,
      );

      expect(catalogHeader).toContain(catalogExpectedHeader);

      console.log('Confirm that indicator of provisioned instances shows 1');
      const numberOfInstances = await catalog.getNumberOfInstancesStatus(
        frame4,
      );
      expect(numberOfInstances).toContain('1');
    },
  );

  testPluggable(
    REQUIRED_MODULE,
    'Provision `Testing addon` with `Full` plan and check confirmation link',
    async () => {
      // Hardcodes for specific test
      const exampleServiceClassButton = configExampleServiceClassButton;
      const instancesExpectedHeader = configInstancesExpectedHeader;
      const instancePlan = configInstancePlan2;
      const instanceTitle = configInstanceTitle2;
      const instanceLabel = configInstanceLabel;
      const additionalData = configAdditionalData;
      const planName = configPlanName;

      // consts
      const instancesUrl = address.console.getInstancesList(TEST_NAMESPACE);

      const labelButton = catalog.prepareSelector(`filter-${instanceLabel}`);
      const exampleServiceClassTitleAndProvider = catalog.prepareSelector(
        'toolbar-header',
      );
      const instancesHeaderSelector = catalog.prepareSelector('toolbar-header');
      const filterDropdownButton = catalog.prepareSelector('toggle-filter');
      const servicePlanButton = catalog.prepareSelector('service-plan');
      const servicePlanContentSelector = catalog.prepareSelector(
        'service-plan-content',
      );
      const closeModalSelector = '.fd-modal__close';

      const exampleInstanceLink = catalog.prepareSelector(
        `instance-name-${instanceTitle}`,
      );

      const frame = await waitForCatalogFrame(page);
      const testingBundle = await frame.waitForSelector(
        exampleServiceClassButton,
      );
      await Promise.all([
        testingBundle.click(),
        frame.waitForNavigation({
          waitUntil: ['domcontentloaded', 'networkidle0'],
        }),
      ]);
      const frame2 = await waitForCatalogFrame(page);
      await frame2.waitForSelector(exampleServiceClassTitleAndProvider);

      console.log('Provision `Testing bundle` with `Full` plan');
      await catalog.createInstance(
        page,
        instancePlan,
        instanceTitle,
        instanceLabel,
        additionalData,
        planName,
        configRegExpData,
        configUncorrectRegExpData,
      );

      await Promise.all([
        page.goto(instancesUrl),
        page.waitForNavigation({
          waitUntil: ['domcontentloaded', 'networkidle0'],
        }),
      ]);

      const frame3 = await waitForInstancesFrame(page);
      const instancesHeaderElement = await frame3.waitForSelector(
        instancesHeaderSelector,
      );
      const instancesHeader = await frame3.evaluate(
        element => element.textContent,
        instancesHeaderElement,
      );

      expect(instancesHeader).toContain(instancesExpectedHeader);

      await frame3.waitForSelector(exampleInstanceLink, {
        visible: true,
      });

      console.log('Validate instances list');
      const allInstances = await catalog.getInstances(frame3);
      expect(allInstances.length).toEqual(2);

      await frame3.click(filterDropdownButton);
      await frame3.click(labelButton);

      const filteredInstances = await catalog.getInstances(frame3);
      expect(filteredInstances.length).toEqual(1);

      await frame3.waitForSelector(servicePlanButton);
      await frame3.click(servicePlanButton);

      const servicePlanContentSelectorElement = await frame3.waitForSelector(
        servicePlanContentSelector,
      );
      const servicePlanContent = await frame3.evaluate(
        element => element.textContent,
        servicePlanContentSelectorElement,
      );

      expect(servicePlanContent).toContain(additionalData);
      expect(servicePlanContent).toContain(planName);

      const closeModalButton = await frame3.$(closeModalSelector);
      await closeModalButton.click();

      await frame3.click(filterDropdownButton);
      await frame3.click(labelButton);
    },
  );

  testPluggable(REQUIRED_MODULE, 'Check `minimal` plan details', async () => {
    // Hardcodes for specific test
    const instanceTitle = configInstanceTitle;
    const exampleInstanceLink = catalog.prepareSelector(
      `instance-name-${instanceTitle}`,
    );

    // consts
    const exampleInstanceServiceClass = catalog.prepareSelector(
      'instance-service-class',
    );
    const exampleInstanceServicePlan = catalog.prepareSelector(
      'instance-service-plan',
    );
    const exampleInstanceStatusType = catalog.prepareSelector(
      'instance-status-type',
    );

    console.log('Go to details of instance created with `minimal` plan');

    const frame = await waitForInstancesFrame(page);
    const minimalPlanInstance = await frame.waitForSelector(
      exampleInstanceLink,
      { visible: true },
    );

    await Promise.all([
      minimalPlanInstance.click(),
      frame.waitForNavigation({
        waitUntil: ['domcontentloaded'],
      }),
    ]);

    console.log('Confirm all necessary fields');
    await frame.waitForSelector(exampleInstanceServiceClass);
    const serviceClass = await frame.$(exampleInstanceServiceClass);
    const servicePlan = await frame.$(exampleInstanceServicePlan);
    const statusType = await frame.$(exampleInstanceStatusType);

    expect(serviceClass.toString()).not.toBeNull();
    expect(servicePlan.toString()).not.toBeNull();
    expect(statusType.toString()).not.toBeNull();
  });

  testPluggable(REQUIRED_MODULE, 'Check `full` plan details', async () => {
    // Hardcodes for specific test
    const instanceTitle = configInstanceTitle2;
    const exampleInstanceLink = catalog.prepareSelector(
      `instance-name-${instanceTitle}`,
    );
    const instanceLabel = configInstanceLabel;

    const instancesUrl = address.console.getInstancesList(TEST_NAMESPACE);

    // consts
    const exampleInstanceServiceClass = catalog.prepareSelector(
      'instance-service-class',
    );
    const exampleInstanceServicePlan = catalog.prepareSelector(
      'instance-service-plan',
    );
    const exampleInstanceStatusType = catalog.prepareSelector(
      'instance-status-type',
    );

    console.log('Go to details of instance created with `full` plan');
    let frame;
    await Promise.all([
      page.goto(instancesUrl),
      page.waitForNavigation({
        waitUntil: ['domcontentloaded', 'networkidle0'],
      }),
      (frame = await waitForInstancesFrame(page, true)),
    ]);

    const fullPlanInstance = await frame.waitForSelector(exampleInstanceLink, {
      visible: true,
    });
    await fullPlanInstance.click();

    console.log('Confirm all necessary fields');
    await frame.waitForSelector(exampleInstanceServiceClass);
    const serviceClass = await frame.$(exampleInstanceServiceClass);
    const servicePlan = await frame.$(exampleInstanceServicePlan);
    const statusType = await frame.$(exampleInstanceStatusType);
    const labels = await catalog.getLabels(frame);

    expect(serviceClass.toString()).not.toBeNull();
    expect(servicePlan.toString()).not.toBeNull();
    expect(statusType.toString()).not.toBeNull();

    expect(labels).toContain(instanceLabel);
  });
});
