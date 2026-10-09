# DNEM Field Capture (first version, 2026-10-09)

Two tools that share one rules table.

| What | File | Who uses it |
|---|---|---|
| Phone app | https://amaes-director.github.io/dnem-field-app/ (source: `docs/` folder, published by GitHub Pages) | Consultants on site |
| Report builder | `DNEM Field Report Builder.html` (one file; open in Chrome or Edge) | Amy, at the desk |
| Rules review | `Rules review - Michigan citations to verify.xlsx` | A consultant confirming Michigan citations |
| Samples | `samples/` (made-up test data) | Anyone trying it out |

## Consultant, on site
1. Open https://amaes-director.github.io/dnem-field-app/ on the phone and choose **Add to Home Screen** (iPhone: Share > Add to Home Screen; Android: menu > Install app).
2. Tap **New site visit**. Enter the site, your name, and the building status if you know it.
3. Follow the big button at the top of each screen. It walks you in order: **Parking**, **Route to the entrance**, **Entrance**, then **Rooms**. On each screen, tap each item you can see (for example "Accessible parking space"), take photos, and fill in the measurements. Each field shows its requirement, and anything left blank is marked "Needs manual input". Inches are the default unit; cm, degrees and newtons are converted.
   - In **Rooms**, tap **Add a room**, pick the room type, and add a number and a name if useful (for example Meeting / conference room 2, "Board of Directors room"). The room then shows its usual items. Use **Something else** for anything not listed.
4. Everything saves on the phone, including with no signal.
5. When you finish, tap **Send visit**. The phone's share sheet opens. Choose **Drive** (the Google Drive app must be installed and signed in), then pick the shared DNEM field-visits folder and tap Upload.

## Amy, at the desk
1. Double-click `DNEM Field Report Builder.html`. It opens in your browser and nothing is uploaded anywhere.
2. Choose the visit ZIPs, or choose the whole field-visits folder. With Google Drive for desktop installed, it shows up as a drive (usually G:) under My Drive or Shared drives. Otherwise download the ZIPs from drive.google.com first.
3. Tick the visits to include. Several visits to one site combine into one report.
4. Click **Create Word report**. The .docx goes to Downloads. It follows the walk order: a list of problems to fix, then Parking, Route, Entrance and each room.

## How the report decides
- Each check compares the measurement with the 2010 ADA Standards and with the 2021 Michigan Building Code, which adopts ICC A117.1-2017 (R 408.30427 excludes A117.1 sections 611 and 707). Where both set a limit, the stricter one is used and cited.
- Some A117.1-2017 sizes apply only to new buildings (the 67 in turning circle and the 30 x 52 in clear floor space). These are used when the visit says the building was built or altered under the 2021 MBC. If the status is unknown and only the older size is met, the item is marked "Needs manual input".
- Michigan citations are marked † until someone confirms them against the printed code. Use the rules review workbook for that, and send corrections back so the rules table can be updated.

## For whoever maintains it
- Source lives in `src/`: `rules.js` (rules table), `engine.js` (checks), `phone/` (app), `report/` (builder).
- Rebuild with `node src/build.js`. It writes the phone app (`docs/` in the GitHub repo, `phone-app/` elsewhere) and the builder HTML. Pushing to the repo's main branch updates the live app.
- When the phone app changes, bump `VERSION` in `src/phone/sw.js` so phones pick up the update.
