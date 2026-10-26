import { expect } from '@playwright/test';
import { test, openPage, expectCanvas, expectLayout } from './fixtures.mjs';

const chapter = 'simulations/sp015/07-simple-harmonic-motion/';

async function openSimulation(page, health, topic, alias = 'index.html') {
  await openPage(page, health, `${chapter}${topic}/${alias}`, new RegExp(`${topic}/index\\.html$`));
  await expect(page).toHaveURL(new RegExp(`${topic}/index\\.html$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

async function readTime(page, selector) {
  return Number((await page.locator(selector).textContent()).match(/[\d.]+/)[0]);
}

async function expectAdvanced(page, selector, initial = 0) {
  await expect.poll(() => readTime(page, selector)).toBeGreaterThan(initial);
}

async function playback(page, button, time, reset, zero) {
  const initial = await readTime(page, time);
  await page.locator(button).click();
  await expect(page.locator(button)).toContainText('Pause');
  await expectAdvanced(page, time, initial);
  await page.locator(button).click();
  await expect(page.locator(button)).toContainText('Play');
  await page.locator(reset).click();
  await expect(page.locator(time)).toHaveText(zero);
}

test('SHM Kinematics spring, pendulum, reference, slider, and playback', async ({ page, health }) => {
  await openSimulation(page, health, '7.1-kinematics-of-shm');
  await expectCanvas(page);
  await expect(page.locator('#timeValue')).toHaveText('0.00 s');
  const mass = await page.locator('#massOutput').textContent();
  await page.locator('#massControl').press('End');
  await expect(page.locator('#massOutput')).not.toHaveText(mass);
  await page.locator('#stepButton').click();
  await expectAdvanced(page, '#timeValue');
  await playback(page, '#playPauseButton', '#timeValue', '#resetButton', '0.00 s');
  for (const mode of ['pendulumSystemButton', 'referenceSystemButton', 'springSystemButton']) {
    await page.locator(`#${mode}`).click();
    await expect(page.locator(`#${mode}`)).toHaveAttribute('aria-pressed', 'true');
    await expectCanvas(page);
    await expectLayout(page);
  }
});

test('SHM Graphs initial plots, amplitude, playback, and phase mode', async ({ page, health }) => {
  await openSimulation(page, health, '7.2-graphs-shm');
  for (const holder of ['oscillator', 'xt', 'vt', 'at', 'ex']) await expectCanvas(page, `#${holder}-holder canvas`);
  await page.locator('#amplitude-slider').press('End');
  await expect(page.locator('#amplitude-value')).toHaveText('0.30 m');
  await page.locator('#check-ek').uncheck();
  await expect(page.locator('#check-ek')).not.toBeChecked();
  await page.locator('#btn-step').click();
  await expectAdvanced(page, '#time-label');
  await playback(page, '#btn-play', '#time-label', '#btn-reset', 't = 0.00 s');
  await expectLayout(page);
  await page.locator('#phaseShiftModeButton').click();
  await expect(page.locator('#phaseShiftModeButton')).toHaveAttribute('aria-pressed', 'true');
  await expectCanvas(page, '#phase-holder canvas');
  const initialPhase = await page.locator('#phase-label').textContent();
  await page.locator('#btn-phase-plus').click();
  await expect(page.locator('#phase-label')).not.toHaveText(initialPhase);
  await page.locator('#btn-phase-minus').click();
  await expect(page.locator('#phase-label')).toHaveText(initialPhase);
  await expectLayout(page);
});

test('Progressive Wave both canvases, direction, slider, and playback', async ({ page, health }) => {
  await openSimulation(page, health, '7.4-progressive-wave-shm');
  await expectCanvas(page, '#canvas-holder-yx canvas');
  await expectCanvas(page, '#canvas-holder-yt canvas');
  const amplitude = await page.locator('#value-amplitude').textContent();
  await page.locator('#slider-amplitude').press('End');
  await expect(page.locator('#value-amplitude')).not.toHaveText(amplitude);
  await page.locator('[data-direction="negative"]').click();
  await expect(page.locator('[data-direction="negative"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-direction="positive"]')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#btn-step').click();
  await expectAdvanced(page, '#time-readout');
  await playback(page, '#btn-play-pause', '#time-readout', '#btn-reset', 't = 0.00 s');
  await expectLayout(page);
});

test('Superposition alias, pulse, interference, directions, and playback', async ({ page, health }) => {
  await openSimulation(page, health, '7.5-superposition-shm', 'wave-superposition.html');
  await expectCanvas(page);
  await expect(page.locator('#time-label')).toHaveText('t = 0.00 s');
  await page.locator('#amp-a-group [data-value="0.2"]').click();
  await expect(page.locator('#val-amp-a')).toHaveText('+0.20 m');
  await page.locator('#time-scrubber').press('Home');
  await page.locator('#time-scrubber').press('ArrowRight');
  await expectAdvanced(page, '#time-label');
  await playback(page, '#btn-play', '#time-label', '#btn-reset', 't = 0.00 s');
  await expectLayout(page);
  await page.locator('#interferenceModeButton').click();
  await expect(page.locator('#interferenceModeButton')).toHaveAttribute('aria-pressed', 'true');
  for (const holder of ['wave-a', 'wave-b', 'resultant']) await expectCanvas(page, `#canvas-holder-${holder} canvas`);
  const opposite = page.locator('#interference-direction-switch [data-relationship="opposite"]');
  const same = page.locator('#interference-direction-switch [data-relationship="same"]');
  await opposite.click();
  await expect(opposite).toHaveAttribute('aria-pressed', 'true');
  await expect(same).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#wave-b-direction-label')).toHaveText('WAVE B · −x');
  await page.locator('#btn-step-interference').click();
  await expect(page.locator('#time-label-interference')).toHaveText('t = 0.05 s');
  await playback(page, '#btn-play-interference', '#time-label-interference', '#btn-reset-interference', 't = 0.00 s');
  await expect(opposite).toHaveAttribute('aria-pressed', 'true');
  await same.click();
  await expect(page.locator('#wave-b-direction-label')).toHaveText('WAVE B · +x');
  await expectLayout(page);
  await page.locator('#pulseModeButton').click();
  await expect(page.locator('#pulseStage')).toBeVisible();
  await expectCanvas(page);
});

test('Standing Waves alias, string harmonic, air columns, and playback', async ({ page, health }) => {
  await openSimulation(page, health, '7.6-application-of-standing-waves', 'standing-waves.html');
  await expectCanvas(page);
  await page.locator('#string-harmonic-group [data-value="2"]').click();
  await expect(page.locator('#val-harmonic-label')).toContainText('2nd');
  const frequency = await page.locator('#val-frequency').textContent();
  await page.locator('#string-length-slider').press('End');
  await expect(page.locator('#val-frequency')).not.toHaveText(frequency);
  await page.locator('#btn-play').click();
  await expect(page.locator('#btn-play')).toContainText('Pause');
  await page.locator('#btn-play').click();
  await expect(page.locator('#btn-play')).toContainText('Play');
  await page.locator('#btn-reset').click();
  await expectCanvas(page);
  await expectLayout(page);
  for (const [mode, controls] of [['openModeButton', 'openControls'], ['closedModeButton', 'closedControls']]) {
    await page.locator(`#${mode}`).click();
    await expect(page.locator(`#${mode}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`#${controls}`)).toBeVisible();
    await expectCanvas(page);
    await expectLayout(page);
  }
  await page.locator('#closed-harmonic-group [data-value="3"]').click();
  await expect(page.locator('#val-harmonic-label')).toContainText('3rd');
});

test('Doppler alias, observer mode, frequency, step, and playback', async ({ page, health }) => {
  await openSimulation(page, health, '7.7-doppler-effect', 'doppler-effect.html');
  await expectCanvas(page);
  await expect(page.locator('#time-label')).toHaveText('t = 0.00 s');
  await page.locator('#observerModeButton').click();
  await expect(page.locator('#observerModeButton')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#speed-mover-word')).toHaveText('Observer');
  await page.locator('#freq-slider').press('End');
  await expect(page.locator('#freq-live')).toHaveText('1000 Hz');
  await page.locator('#btn-step').click();
  await expectAdvanced(page, '#time-label');
  await playback(page, '#btn-play', '#time-label', '#btn-reset', 't = 0.00 s');
  await expect(page.locator('#chk-play-sound')).not.toBeChecked();
  await expectLayout(page);
});
