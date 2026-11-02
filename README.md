# Workshop Participants’ Fooding & Lodging Feedback

A mobile-friendly KVS/ZIET participant feedback portal.

## Feedback scale
1 – Poor · 2 – Fair · 3 – Good · 4 – Very Good · 5 – Excellent

## Included questions
1. Overall comfort of the hostel room
2. Cleanliness of bedsheets and pillows
3. Cleanliness of mattress
4. Comfort of mattress
5. Cleanliness of toilet pan
6. Working condition of washroom taps
7. Working condition of bathroom geyser
8. Cooling performance of air conditioner
9. Cleanliness of water jugs and glasses
10. Cleanliness of bathroom buckets and mugs
11. Condition and usability of mirror
12. Overall cleanliness and hygiene of room
13. Effectiveness of mosquito repellent
14. Open-ended suggestion for additional facilities or improvements

## PDF storage integration
The intended Google Drive folder is:
https://drive.google.com/drive/folders/16W9tBw5FYz4s4C-plc0oYqyyBQR4Sfx3

GitHub Pages is a static host. To save each submission as a PDF in the Drive folder, deploy a Google Apps Script Web App that accepts the JSON payload, generates a PDF, stores it in the folder, and returns JSON containing `success`, `message`, and `pdfUrl`. Then set `APPS_SCRIPT_URL` at the top of `app.js` to that deployed Web App URL. Until that endpoint is configured, the form intentionally does not claim to submit or save responses.

## Publish
Enable GitHub Pages for the `main` branch using the repository root as the publishing source.
