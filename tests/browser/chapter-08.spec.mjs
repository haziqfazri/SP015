import { expect } from '@playwright/test';
import { test, openPage, expectCanvas, expectLayout } from './fixtures.mjs';

const chapter = 'simulations/sp015/08-physics-of-matter/';

async function openSimulation(page, health, topic, entry = 'index.html') {
  await openPage(page, health, `${chapter}${topic}/${entry}`, new RegExp(`${topic}/index\\.html$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#play-button')).toContainText('Play');
  return expectCanvas(page);
}

async function numberText(page, selector) {
  return parseFloat(await page.locator(selector).textContent());
}

async function expectResize(page) {
  const original = page.viewportSize();
  const canvas = page.locator('#canvas-holder canvas');
  const initialWidth = await canvas.evaluate((element) => element.width);
  await page.setViewportSize({ ...original, width: original.width === 800 ? 460 : 800 });
  await expect.poll(() => canvas.evaluate((element) => element.width)).not.toBe(initialWidth);
  await expectCanvas(page);
  await expectLayout(page);
  await page.setViewportSize(original);
  await expect.poll(() => canvas.evaluate((element) => element.width)).toBe(initialWidth);
  await expectCanvas(page);
  await expectLayout(page);
}

test('Materials Testing alias, loading, compression, presets, automatic pause, and playback', async ({ page, health }) => {
  await openSimulation(page, health, '8.1-8.2-materials-testing', 'materials-testing.html');
  await expect(page.locator('#loading-progress-value')).toHaveText('0%');
  await page.locator('#step-button').click();
  await expect(page.locator('#loading-progress-value')).toHaveText('5%');
  expect(await numberText(page, '#readout-stress')).toBeGreaterThan(0);
  await page.locator('#compression-type').click();
  await expect(page.locator('#compression-type')).toHaveAttribute('aria-pressed', 'true');
  expect(await numberText(page, '#readout-stress')).toBeLessThan(0);
  expect(await numberText(page, '#readout-energy')).toBeGreaterThan(0);
  await page.locator('#tension-type').click();
  expect(await numberText(page, '#readout-stress')).toBeGreaterThan(0);
  await page.locator('#original-length').press('End');
  await expect(page.locator('#original-length-value')).toHaveText('2.00 m');
  await page.locator('#loading-progress').press('End');
  await expect(page.locator('#loading-progress-value')).toHaveText('100%');
  await page.locator('#reset-button').click();
  await expect(page.locator('#loading-progress-value')).toHaveText('0%');
  await expect(page.locator('#original-length')).toHaveValue('2');
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Pause');
  await expect.poll(() => page.locator('#loading-progress').inputValue()).not.toBe('0');
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await page.locator('#reset-button').click();
  await expectLayout(page);

  await page.locator('#comparison-mode').click();
  await expect(page.locator('#comparison-mode')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#comparison-readouts')).toBeVisible();
  await expect(page.locator('#elastic-controls')).toBeHidden();
  await page.locator('#brittle-preset').click();
  await expect(page.locator('#brittle-preset')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#stage-status')).toContainText('Brittle');
  await page.locator('#ductile-preset').click();
  await expect(page.locator('#ductile-preset')).toHaveAttribute('aria-pressed', 'true');
  // Start just before A using the range control; wait for its semantic stop,
  // rather than assuming a particular frame rate or sleeping for an animation.
  await page.locator('#loading-progress').press('Home');
  for (let i = 0; i < 17; i += 1) await page.locator('#loading-progress').press('ArrowRight');
  await expect(page.locator('#loading-progress-value')).toHaveText('17%');
  await page.locator('#play-button').click();
  await expect(page.locator('#loading-progress-value')).toHaveText('18%');
  await expect(page.locator('#play-button')).toContainText('Play');
  await expect(page.locator('[data-characteristic-point="A"]')).toHaveClass(/is-active/);
  await page.locator('#reset-button').click();
  await expect(page.locator('#loading-progress-value')).toHaveText('0%');
  await expect(page.locator('#comparison-mode')).toHaveAttribute('aria-pressed', 'true');
  await expectResize(page);
});

test('Heat Conduction rods, validation, side loss, tracers, and configuration-preserving reset', async ({ page, health }) => {
  const canvas = await openSimulation(page, health, '8.3-heat-conduction');
  await expect(page.locator('#readout-arrangement')).toHaveText('One rod');
  await page.locator('#two-rods').click();
  await expect(page.locator('#two-rods')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#readout-interface')).toContainText('°C');
  await page.locator('#select-rod-b').click();
  const initialRate = await page.locator('#readout-heat-rate').textContent();
  await page.locator('#active-conductivity').press('End');
  await expect(page.locator('#active-conductivity')).toHaveValue('400');
  await expect(page.locator('#readout-heat-rate')).not.toHaveText(initialRate);

  const validRate = await page.locator('#readout-heat-rate').textContent();
  await page.locator('#hot-temperature').press('Home');
  await expect(page.locator('#temperature-error')).toContainText('Hot temperature must remain greater');
  await expect(page.locator('#hot-temperature')).toHaveValue('100');
  await expect(page.locator('#readout-heat-rate')).toHaveText(validRate);
  await page.locator('#hot-temperature').press('End');
  await expect(page.locator('#temperature-error')).toBeEmpty();
  await expect(page.locator('#hot-temperature')).toHaveValue('150');

  await page.locator('#non-insulated-mode').click();
  await expect(page.locator('#readout-heat-rate')).toHaveText('Not calculated');
  await expect(page.locator('#readout-interface')).toHaveText('Not calculated — side loss');
  for (const [button, label] of [['both-exposed', 'both exposed'], ['a-insulated', 'A insulated'], ['b-insulated', 'B insulated']]) {
    await page.locator(`#${button}`).click();
    await expect(page.locator(`#${button}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#readout-model')).toHaveText(`Schematic — ${label}`);
    await expectLayout(page);
  }

  // Let the requested paused redraw finish before recording the reset scene.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const resetScene = await canvas.evaluate((element) => element.toDataURL());
  await page.locator('#step-button').click();
  await expect.poll(() => canvas.evaluate((element) => element.toDataURL())).not.toBe(resetScene);
  const steppedScene = await canvas.evaluate((element) => element.toDataURL());
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Pause');
  await expect.poll(() => canvas.evaluate((element) => element.toDataURL())).not.toBe(steppedScene);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await page.locator('#reset-button').click();
  await expect.poll(() => canvas.evaluate((element) => element.toDataURL())).toBe(resetScene);
  await expect(page.locator('#two-rods')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#select-rod-b')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#b-insulated')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#active-conductivity')).toHaveValue('400');
  await expect(page.locator('#hot-temperature')).toHaveValue('150');
  await expect(page.locator('#readout-heat-rate')).toHaveText('Not calculated');
  await expectResize(page);
  await page.locator('#insulated-mode').click();
  await expect(page.locator('#readout-heat-rate')).toHaveText(/W$/);
});

test('Thermal Expansion modes, heating, cooling, overflow, and parameter-preserving reset', async ({ page, health }) => {
  await openSimulation(page, health, '8.4-thermal-expansion');
  await expect(page.locator('#readout-delta-t')).toHaveText('+0.0 K');
  await page.locator('#alpha').press('End');
  await expect(page.locator('#alpha')).toHaveValue('30');
  await page.locator('#target-delta-t').press('End');
  await page.locator('#step-button').click();
  await expect(page.locator('#readout-delta-t')).toHaveText('+15.0 K');
  expect(await numberText(page, '#readout-change')).toBeGreaterThan(0);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Pause');
  await expect.poll(() => numberText(page, '#readout-delta-t')).toBeGreaterThan(15);
  await page.locator('#play-button').click();
  await expect(page.locator('#play-button')).toContainText('Play');
  await page.locator('#reset-button').click();
  await expect(page.locator('#readout-delta-t')).toHaveText('+0.0 K');
  await page.locator('#target-delta-t').press('Home');
  await page.locator('#step-button').click();
  await expect(page.locator('#readout-delta-t')).toHaveText('-5.0 K');
  expect(await numberText(page, '#readout-change')).toBeLessThan(0);
  await expectLayout(page);

  for (const [mode, controls] of [['area', 'area-controls'], ['volume', 'volume-controls'], ['liquid-container', 'liquid-size-controls']]) {
    await page.locator(`[data-expansion-mode="${mode}"]`).click();
    await expect(page.locator(`[data-expansion-mode="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`#${controls}`)).toBeVisible();
    expect(await numberText(page, '#readout-change')).toBeLessThan(0);
    await expectCanvas(page);
    await expectLayout(page);
  }
  await page.locator('#liquid-gamma').press('End');
  await page.locator('#target-delta-t').press('End');
  expect(await numberText(page, '#readout-overflow')).toBeGreaterThan(0);
  await page.locator('#fill-percent').press('Home');
  await expect(page.locator('#readout-overflow')).toHaveText('0.00 mL');
  await page.locator('#fill-percent').press('End');
  expect(await numberText(page, '#readout-overflow')).toBeGreaterThan(0);
  await page.locator('#reset-button').click();
  await expect(page.locator('#readout-delta-t')).toHaveText('+0.0 K');
  await expect(page.locator('#readout-overflow')).toHaveText('0.00 mL');
  await expect(page.locator('[data-expansion-mode="liquid-container"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#alpha')).toHaveValue('30');
  await expect(page.locator('#target-delta-t')).toHaveValue('150');
  await expect(page.locator('#fill-percent')).toHaveValue('100');
  await expect(page.locator('#liquid-gamma')).toHaveValue('1.2');
  await page.locator('#step-button').click();
  expect(await numberText(page, '#readout-overflow')).toBeGreaterThan(0);
  await expectResize(page);
});
