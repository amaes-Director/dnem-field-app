# DNEM ADA Lens (2026-10-09)

Two tools that share one rules table.

| What | File | Who uses it |
|---|---|---|
| Phone app | https://amaes-director.github.io/dnem-field-app/ (source: `docs/` folder, published by GitHub Pages) | Consultants on site |
| Report builder | `DNEM ADA Lens Report Builder.html` (one file; open in Chrome or Edge) | Amy, at the desk |
| Rules review | `Rules review - Michigan citations to verify.xlsx` | A consultant confirming Michigan citations |
| Samples | `samples/` (made-up test data) | Anyone trying it out |

## Consultant, on site
1. Open https://amaes-director.github.io/dnem-field-app/ on the phone and choose **Add to Home Screen** (iPhone: Share > Add to Home Screen; Android: menu > Install app).
2. Tap **New site visit**. Enter the site and your name. Choose the **type of visit** (building or site, or polling place), and the building status and **federal funds** if you know them.
   - **Polling place** visits follow the DOJ ADA Checklist for Polling Places: **Parking and drop-off**, **Route to the entrance**, **Voter entrance**, **Route to the voting area**, then **Voting area**. Record any temporary fix (cones, mats, portable ramps, propped doors) with **Temporary fix**.
   - **Federal funds** decides how trail and park items count: **Yes** means the federal ABA rules are required, **No** means they are best practice, and **Not known** flags them for review.
3. Follow the big button at the top of each screen. It walks you in order: **Parking**, **Route to the entrance**, **Entrance**, **Rooms**, then **Outdoor and recreation areas**. On each screen, tap each item you can see (for example "Accessible parking space"), take photos, and fill in the measurements. Each field shows its requirement, and anything left blank is marked "Needs manual input". Inches are the default unit; cm, degrees and newtons are converted.
   - In **Rooms**, tap **Add a room**, pick the room type, and add a number and a name if useful (for example Meeting / conference room 2, "Board of Directors room"). The room then shows its usual items. Use **Something else** for anything not listed.
   - When the rooms are finished, tap **Next: Outdoor and recreation areas**. Add each playground, pool or spa, park or picnic area, sports field or bleachers, fishing pier or boat dock, golf or mini golf course, outdoor fitness area, trail or wetland boardwalk, campground, beach, festival or event area, or bus stop the same way. Skip it if the site has none. **Send visit** is at the bottom of this screen and on the visit overview.
4. Everything saves on the phone, including with no signal.
5. When you finish, tap **Send visit**. Once DNEM's upload service is set up (see `Google Drive setup.md`), the visit goes straight into the DNEM Google Drive folder. The first time, the phone asks for the team code. Until then, the phone's share sheet opens: choose **Drive**, pick the shared DNEM field-visits folder and tap Upload.

## Amy, at the desk
1. Double-click `DNEM ADA Lens Report Builder.html`. It opens in your browser and nothing is uploaded anywhere.
2. Choose the visit ZIPs, or choose the whole field-visits folder. With Google Drive for desktop installed, it shows up as a drive (usually G:) under My Drive or Shared drives. Otherwise download the ZIPs from drive.google.com first.
3. Tick the visits to include. Several visits to one site combine into one report.
4. Click **Create Word report**. The .docx goes to Downloads. It follows the walk order: a list of problems to fix, then Parking, Route, Entrance, each room and each outdoor area.

## How the report decides
- Each check compares the measurement with the 2010 ADA Standards and with the 2021 Michigan Building Code, which adopts ICC A117.1-2017 (R 408.30427 excludes A117.1 sections 611 and 707). Where both set a limit, the stricter one is used and cited.
- Some A117.1-2017 sizes apply only to new buildings (the 67 in turning circle and the 30 x 52 in clear floor space). These are used when the visit says the building was built or altered under the 2021 MBC. If the status is unknown and only the older size is met, the item is marked "Needs manual input".
- Michigan citations are marked † until someone confirms them against the printed code. Use the rules review workbook for that, and send corrections back so the rules table can be updated.

## For whoever maintains it
- Branding (logo, colors, Calibri 14 pt report text) follows the desktop Access Lens tools. Logos are in `src/brand/`.
- Source lives in `src/`: `rules.js` (rules table), `engine.js` (checks), `phone/` (app), `report/` (builder).
- Rebuild with `node src/build.js`. It writes the phone app (`docs/` in the GitHub repo, `phone-app/` elsewhere) and the builder HTML. Pushing to the repo's main branch updates the live app.
- When the phone app changes, bump `VERSION` in `src/phone/sw.js` so phones pick up the update.

## What it checks

Site and building: parking and loading zones, curb ramps, routes, ramps, stairs, protruding objects, doors and entrance signs, restrooms, operable parts, signs, counters, work surfaces and drinking fountains.

Outdoor and recreation (ADA 2010 sections 240-242 and 1003-1009; ICC A117.1-2017 Chapter 11): play areas (component counts, routes, surfacing, ramps, transfer systems, play components), pools, wading pools and spas (number of entries, lifts, sloped entries, transfer walls), bleachers and outdoor assembly seating, fishing piers, boat docks, golf and mini golf, exercise equipment, bus stops and picnic areas.

Trails and parks (federal ABA standards, Chapter 10): trails and wetland boardwalks, park paths (outdoor recreation access routes), beach access routes, picnic tables, fire rings and grills, benches, campsites, and overlooks. Required when federal money applies; otherwise reported as best practice.

Polling places (DOJ ADA Checklist for Polling Places, Help America Vote Act, Michigan Election Law): parking and drop-off, routes, voter entrance, voting area, accessible voting station, and temporary fixes.

Festivals and events: tents, booths and vendor spaces (space inside, reach, counters), event paths and cable covers, and portable toilets.

Not checked automatically: amusement rides, shooting facilities, saunas, EV chargers, and equipment safety under Michigan's Playground Equipment Safety Act. Record these with **Something else** and they are flagged "Needs manual input".

Every Michigan citation, the ADA sub-sections for recreation, and every ABA citation is marked † in the report until checked. Use `Rules review - Michigan citations to verify.xlsx` to confirm them.
