import { expect } from '@playwright/test';
import { test, openPage, expectCanvas, expectLayout } from './fixtures.mjs';

const chapter = 'simulations/sp015/09-kinetic-theory-and-thermodynamics/';
const gasTopic = '9.1-9.2-molecular-gas-lab';
const workbenchTopic = '9.3-9.5-thermodynamics-workbench';
const values = (page) => page.locator('[data-readout-value]');
const number = async (page, index) => parseFloat(await values(page).nth(index).textContent());

async function expectDimensions(page, density) {
  // Workbench intentionally uses pixelDensity(2), even in a DPR=1 project.
  await expect.poll(() => page.locator('#canvas-holder canvas').evaluate((canvas, ratio) => (
    canvas.width === canvas.parentElement.clientWidth * ratio
    && canvas.height === canvas.parentElement.clientHeight * ratio
  ), density)).toBe(true);
}

async function openSimulation(page, health, topic, density) {
  await openPage(page, health, `${chapter}${topic}/index.html`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#play-button')).toContainText('Play');
  const canvas = await expectCanvas(page);
  await expectDimensions(page, density);
  return canvas;
}

async function resizeRoundTrip(page, density) {
  const original = page.viewportSize();
  const canvas = page.locator('#canvas-holder canvas');
  const width = await canvas.evaluate((element) => element.width);
  await expectLayout(page);
  await page.setViewportSize({ ...original, width: original.width === 800 ? 460 : 800 });
  await expect.poll(() => canvas.evaluate((element) => element.width)).not.toBe(width);
  await expectDimensions(page, density);
  await expectCanvas(page);
  await expectLayout(page);
  await page.setViewportSize(original);
  await expect.poll(() => canvas.evaluate((element) => element.width)).toBe(width);
  await expectDimensions(page, density);
  await expectCanvas(page);
  await expectLayout(page);
}

test('Molecular Gas modes, parameters, category/focus, playback, and retained settings', async ({ page, health }) => {
  const canvas = await openSimulation(page, health, gasTopic, 1);
  await expect(page.locator('#stage-status')).toContainText('Paused');
  await expect(page.locator('#canvas-summary')).toContainText('Representative 2D projection');
  await expect(values(page).nth(6)).toHaveText(await values(page).nth(7).textContent());
  const initialRms = await number(page, 5);
  await page.locator('#temperature').press('End');
  expect(await number(page, 5)).toBeGreaterThan(initialRms);
  await page.locator('#amount').press('End');
  await page.locator('#volume').press('End');
  const warmRms = await number(page, 5);
  await page.locator('#molar-mass').press('End');
  expect(await number(page, 5)).toBeLessThan(warmRms);
  await expect(values(page).nth(6)).toHaveText(await values(page).nth(7).textContent());
  // Fence the paused redraw before comparing the effect of Step.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const paused = await canvas.evaluate((element) => element.toDataURL());
  await page.locator('#step-button').click();
  await expect.poll(() => canvas.evaluate((element) => element.toDataURL())).not.toBe(paused);
  const stepped = await canvas.evaluate((element) => element.toDataURL());
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Pause');
  await expect.poll(() => canvas.evaluate((element) => element.toDataURL())).not.toBe(stepped);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await page.locator('#reset-button').click();
  for (const [id, value] of [['temperature', '1000'], ['amount', '2'], ['volume', '50'], ['molar-mass', '60']]) {
    await expect(page.locator(`#${id}`)).toHaveValue(value);
  }
  await expectLayout(page);

  await page.locator('[data-gas-mode="energy"]').click();
  await expect(page.locator('[data-gas-mode="energy"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-molecule-category="monatomic"]').click();
  await expect(values(page).nth(1)).toHaveText('3');
  await expect(page.locator('[data-degree-focus="rotate-r1"]')).toBeDisabled();
  await page.locator('[data-molecule-category="polyatomic"]').click();
  await expect(values(page).nth(1)).toHaveText('6');
  await page.locator('[data-degree-focus="rotate-r3"]').click();
  await page.locator('#step-button').click();
  await page.locator('#reset-button').click();
  await expect(page.locator('[data-molecule-category="polyatomic"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-degree-focus="rotate-r3"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#temperature')).toHaveValue('1000');
  await page.locator('[data-molecule-category="diatomic"]').click();
  await expect(values(page).nth(1)).toHaveText('5');
  await expect(page.locator('[data-degree-focus="rotate-r3"]')).toBeDisabled();
  await expect(page.locator('[data-degree-focus="all"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-degree-focus="rotate-r2"]').click();
  await page.locator('[data-gas-mode="motion"]').click();
  await page.locator('[data-gas-mode="energy"]').click();
  await expect(page.locator('[data-degree-focus="rotate-r2"]')).toHaveAttribute('aria-pressed', 'true');
  await resizeRoundTrip(page, 1);
});

test('Workbench Energy Transfers signed inputs, First Law, recovery, playback, and retained targets', async ({ page, health }) => {
  await openSimulation(page, health, workbenchTopic, 2);
  for (const scenario of ['heating', 'expansion', 'compression', 'cooling']) {
    await page.locator(`[data-scenario="${scenario}"]`).click();
    await expect(page.locator(`[data-scenario="${scenario}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#step-button').click();
    expect(await number(page, 2)).toBe((await number(page, 0)) - (await number(page, 1)));
    if (scenario === 'heating') expect(await number(page, 0)).toBeGreaterThan(0);
    if (scenario === 'expansion') expect(await number(page, 1)).toBeGreaterThan(0);
    if (scenario === 'compression') expect(await number(page, 1)).toBeLessThan(0);
    if (scenario === 'cooling') expect(await number(page, 0)).toBeLessThan(0);
  }
  await page.locator('#heat').press('End');
  await page.locator('#work').press('Home');
  await page.locator('#reset-button').click();
  await expect(page.locator('#heat')).toHaveValue('1500');
  await expect(page.locator('#work')).toHaveValue('-1500');
  await page.locator('#step-button').click();
  expect(await number(page, 2)).toBe((await number(page, 0)) - (await number(page, 1)));

  await page.locator('[data-scenario="heating"]').click();
  await page.locator('[data-category="monatomic"]').click();
  await page.locator('#initial-temperature').press('Home');
  await page.locator('#amount').press('Home');
  await page.locator('#heat').press('Home');
  await expect(page.locator('#validation-message')).toBeVisible();
  await expect(page.locator('#heat')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#heat')).toHaveValue('600');
  await page.locator('#heat').press('End');
  await expect(page.locator('#validation-message')).toBeHidden();
  await expect(page.locator('#heat')).toHaveAttribute('aria-invalid', 'false');
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Pause');
  await expect.poll(() => number(page, 0)).toBeGreaterThan(0);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await page.locator('#reset-button').click();
  for (const index of [0, 1, 2]) await expect(values(page).nth(index)).toHaveText('+0 J');
  for (const [id, value] of [['heat', '1500'], ['work', '0'], ['amount', '0.5'], ['initial-temperature', '200']]) {
    await expect(page.locator(`#${id}`)).toHaveValue(value);
  }
  await expect(page.locator('[data-category="monatomic"]')).toHaveAttribute('aria-pressed', 'true');
  await resizeRoundTrip(page, 2);
});

test('Workbench P-V processes, signed work, validation, playback, and mode isolation', async ({ page, health }) => {
  await openSimulation(page, health, workbenchTopic, 2);
  await page.locator('#heat').press('End');
  await page.locator('#work').press('Home');
  await page.locator('[data-thermodynamics-mode="pvProcesses"]').click();
  await expect(page.locator('[data-thermodynamics-mode="pvProcesses"]')).toHaveAttribute('aria-pressed', 'true');
  for (const process of ['isothermal', 'isobaric']) {
    await page.locator(`[data-process="${process}"]`).click();
    await expect(page.locator(`[data-process="${process}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#target-volume').press('End');
    await page.locator('#reset-button').click();
    const invariantIndex = process === 'isothermal' ? 2 : 0;
    const initial = await values(page).nth(invariantIndex).textContent();
    await page.locator('#step-button').click();
    expect(await number(page, 6)).toBeGreaterThan(0);
    await expect(values(page).nth(invariantIndex)).toHaveText(initial);
    await page.locator('#target-volume').press('Home');
    await page.locator('#reset-button').click();
    await page.locator('#step-button').click();
    expect(await number(page, 6)).toBeLessThan(0);
    await expect(page.locator('#canvas-summary')).toContainText('Compression');
    await expectCanvas(page);
    await expectLayout(page);
  }
  await page.locator('#target-volume').press('Home');
  for (let i = 0; i < 10; i += 1) await page.locator('#target-volume').press('ArrowRight');
  await expect(page.locator('#validation-message')).toBeVisible();
  await expect(page.locator('#target-volume')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#target-volume')).toHaveValue('9.5');
  await page.locator('#target-volume').press('End');
  await expect(page.locator('#validation-message')).toBeHidden();

  await page.locator('[data-process="isochoric"]').click();
  await expect(page.locator('#target-volume-row')).toBeHidden();
  await expect(page.locator('#target-pressure-row')).toBeVisible();
  await page.locator('#target-pressure').press('End');
  await page.locator('#reset-button').click();
  const volume = await values(page).nth(1).textContent();
  await page.locator('#step-button').click();
  await expect(values(page).nth(1)).toHaveText(volume);
  await expect(values(page).nth(6)).toHaveText('+0 J');
  await expectLayout(page);
  await page.locator('[data-process="adiabatic"]').click();
  await page.locator('[data-process-category="monatomic"]').click();
  await page.locator('#reset-button').click();
  await page.locator('#step-button').click();
  await expect(values(page).nth(6)).toHaveText('Not required by SP015 9.5');
  await expect(page.locator('#canvas-summary')).toContainText('supporting context');
  const initialVolume = await number(page, 1);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Pause');
  await expect.poll(() => number(page, 1)).toBeGreaterThan(initialVolume);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await page.locator('#reset-button').click();
  await expect(page.locator('#target-pressure')).toHaveValue('300');
  await expect(page.locator('[data-process="adiabatic"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-process-category="monatomic"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-thermodynamics-mode="energyTransfers"]').click();
  await expect(page.locator('#heat')).toHaveValue('1500');
  await expect(page.locator('#work')).toHaveValue('-1500');
  await expect(values(page).nth(1)).toHaveText('+0 J');
  await page.locator('#play-button').click();
  await page.locator('[data-thermodynamics-mode="pvProcesses"]').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await expect(values(page).nth(1)).toHaveText('10.0 L');
  await expect(page.locator('[data-process="adiabatic"]')).toHaveAttribute('aria-pressed', 'true');
  await resizeRoundTrip(page, 2);
});
