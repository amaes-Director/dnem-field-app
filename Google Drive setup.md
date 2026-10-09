# Send visits straight to DNEM's Google Drive

Do this once, signed in to Google with your DNEM account. It takes about 10 minutes. After it's done, **Send visit** on the phone uploads the visit straight into one DNEM folder. Consultants don't need a Google account or the Drive app.

## 1. Create the upload service

1. Go to **script.google.com** and make sure the account in the top right is your DNEM account.
2. Click **New project**. Click "Untitled project" at the top and rename it **DNEM ADA Lens upload**.
3. Delete everything in the editor. Paste in the whole of `src/drive/Code.gs` from the field-app folder, then click **Save** (the disk icon).

## 2. Run the setup once

1. In the toolbar, pick **setup** from the function list, then click **Run**.
2. Google asks for permission. Click **Review permissions** and choose your DNEM account.
   - If you see "Google hasn't verified this app", click **Advanced**, then **Go to DNEM ADA Lens upload**. This warning appears because you wrote the script yourself.
3. Click **Allow**.
4. The log at the bottom shows two things:
   - the **folder** where visits will be saved, called "DNEM ADA Lens field visits" in your My Drive;
   - the 6-digit **team code**.
5. Write the team code down. Give it to consultants in person or by text. Don't post it anywhere public.

**To use a folder in a shared drive instead:**
1. Open that folder in Drive and copy the long id at the end of its web address.
2. In the script, paste the id where it says `PASTE_FOLDER_ID_HERE`.
3. Pick **useFolder** from the function list and click **Run**.

## 3. Publish it as a web app

1. Click **Deploy**, then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as** to **Me**.
4. Set **Who has access** to **Anyone**.
   - Volunteers don't have DNEM accounts, so access can't be limited to dnemichigan.org.
   - If "Anyone" isn't offered, your Google Workspace admin has turned it off. Ask them to allow web apps for anyone.
5. Click **Deploy**, then copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends with `/exec`.

## 4. Send me the web app URL

Paste the URL in the thread, but **not** the team code. I'll add the URL to the phone app and publish it when you say so.

## What consultants see

- **The first time they send**, the phone asks for the team code. It never asks again on that phone.
- **When it works**, the phone says "Sent to the DNEM Google Drive".
- **Sending the same visit again** replaces the earlier copy, so a report never counts a visit twice.
- **With no signal**, the visit stays on the phone and they can try again later. They can also save or share the file the old way.

## At the desk

- Install **Google Drive for desktop**, and the "DNEM ADA Lens field visits" folder appears in File Explorer.
- In the report builder, click **Choose a folder** and pick it.
- Ignore the folder called "_incoming (do not use)". It holds pieces of large visits while they upload.

## If you need to change the team code

1. In the script editor, open **Project Settings** (the gear icon), then **Script properties**.
2. Edit **TEAM_CODE**.
3. Each phone asks for the new code the next time it sends.
