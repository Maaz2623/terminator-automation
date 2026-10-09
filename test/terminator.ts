import { Desktop } from "@mediar-ai/terminator";

const desktop = new Desktop();

await desktop.openUrl("https://www.google.com");

const browser = await desktop.getCurrentBrowserWindow();

// ============================================================
// 1. Find Google search box
// ============================================================

const search = await browser.locator("role:ComboBox");
const searchElement = await search.first(5000);

console.log("Search element:", await searchElement.name());

// ============================================================
// 2. Type search query
// ============================================================

await searchElement.typeText("Terminator desktop automation");

// ============================================================
// 3. Press Enter
// ============================================================

await searchElement.pressKey("ENTER");

// ============================================================
// 4. Find the Google Document
// ============================================================

const documents = await browser.locator("role:Document");
const docs = await documents.all(5000);

console.log("\nDocuments:", docs.length);

const googlePage = docs[0];

// ============================================================
// 5. Find buttons inside the Google page
// ============================================================

const buttons = await googlePage.locator("role:Button");
const buttonElements = await buttons.all(5000);

console.log("\nGoogle page buttons:");

for (let i = 0; i < buttonElements.length; i++) {
  console.log(i, await buttonElements[i].name());
}

// ============================================================
// 6. Click Settings
// ============================================================

const settingsButton = buttonElements[3];

console.log("\nClicking:", await settingsButton.name());

await settingsButton.click();

// ============================================================
// 7. Wait for UI to update
// ============================================================

await desktop.delay(500);

// ============================================================
// 8. IMPORTANT:
//    Re-acquire the Document after the page changed
// ============================================================

const documentsAfter = await browser.locator("role:Document");
const docsAfter = await documentsAfter.all(5000);

console.log("\nDocuments after Settings:", docsAfter.length);

const googlePageAfter = docsAfter[0];

// ============================================================
// 9. Find buttons using the NEW Document element
// ============================================================

const buttonsAfter = await googlePageAfter.locator("role:Button");
const elementsAfter = await buttonsAfter.all(5000);

console.log("\nGoogle page buttons AFTER Settings:");

for (let i = 0; i < elementsAfter.length; i++) {
  console.log(i, await elementsAfter[i].name());
}
