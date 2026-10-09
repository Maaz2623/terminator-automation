import { Desktop } from "@mediar-ai/terminator";

const desktop = new Desktop();

async function main() {
  // ============================================================
  // 1. OPEN YOUTUBE
  // ============================================================
  await desktop.openUrl("https://www.youtube.com");
  await desktop.delay(5000);

  // ============================================================
  // 2. GET BROWSER
  // ============================================================
  const browser = await desktop.getCurrentBrowserWindow();

  console.log("\nBrowser:", await browser.name());

  // ============================================================
  // 3. SEARCH FOR HERA PHERI
  // ============================================================
  const search = await browser.locator("role:ComboBox");
  const searchElement = await search.first(5000);

  await searchElement.typeText("Hera Pheri 2000 full movie");
  await searchElement.pressKey("ENTER");

  await desktop.delay(5000);

  // ============================================================
  // 4. FIND FULL MOVIE
  // ============================================================
  const links = await browser.locator("role:Hyperlink");
  const linkElements = await links.all(5000);

  let movie = null;

  for (const link of linkElements) {
    const name = await link.name();

    if (
      name &&
      name.toLowerCase().includes("hera pheri") &&
      name.toLowerCase().includes("full") &&
      !name.toLowerCase().includes("shorts")
    ) {
      console.log("Found movie:", name);
      movie = link;
      break;
    }
  }

  if (!movie) {
    console.log("Could not find movie.");
    return;
  }

  // ============================================================
  // 5. OPEN MOVIE
  // ============================================================
  await movie.click();
  await desktop.delay(5000);

  console.log("\nMovie opened.");

  // ============================================================
  // 6. FIND SEEK SLIDER
  // ============================================================
  const sliders = await browser.locator("role:Slider");
  const sliderElements = await sliders.all(5000);

  let seekSlider = null;

  for (const slider of sliderElements) {
    const name = await slider.name();

    console.log("Slider:", name, "| value:", await slider.getRangeValue());

    if (name === "Seek slider") {
      seekSlider = slider;
    }
  }

  if (!seekSlider) {
    console.log("Could not find Seek slider.");
    return;
  }

  // ============================================================
  // 7. FOCUS SEEK SLIDER
  // ============================================================
  await seekSlider.focus();
  await desktop.delay(500);

  // ============================================================
  // 8. TARGET = 30 MINUTES
  // ============================================================
  const targetSeconds = 30 * 60;
  const secondsPerPress = 5;
  const presses = targetSeconds / secondsPerPress;

  console.log("\n========================================");
  console.log("SEEKING TO 30 MINUTES");
  console.log("========================================");
  console.log("Target:", targetSeconds, "seconds");
  console.log("Seconds per RIGHT:", secondsPerPress);
  console.log("RIGHT presses:", presses);

  // ============================================================
  // 9. PRESS RIGHT 360 TIMES
  // ============================================================
  for (let i = 0; i < presses; i++) {
    await seekSlider.pressKey("RIGHT");

    // Small batches keep this fast without hammering the UI.
    if (i % 20 === 0) {
      await desktop.delay(50);
    }
  }

  // Give YouTube time to update the player.
  await desktop.delay(1500);

  // ============================================================
  // 10. READ FINAL SLIDER VALUE
  // ============================================================
  const finalValue = await seekSlider.getRangeValue();

  console.log("\n========================================");
  console.log("RESULT");
  console.log("========================================");
  console.log("Final slider value:", finalValue);

  // ============================================================
  // 11. READ PLAYER TIMESTAMP
  // ============================================================
  const buttons = await browser.locator("role:Button");
  const buttonElements = await buttons.all(5000);

  for (const button of buttonElements) {
    const name = await button.name();

    if (name && name.includes("Minutes") && name.includes("Seconds")) {
      console.log("Player timestamp:", name);
    }
  }

  console.log("\nDone.");
}

main().catch(console.error);
