# LifeLink

LifeLink is an AI-assisted emergency coordination platform for connecting accident reporters, ambulance drivers, and hospitals in one fast response workflow.

## Hackathon Pitch

During an emergency, people lose time explaining the situation, finding an ambulance, and checking which hospital can accept the patient. LifeLink reduces that delay by turning a spoken emergency report into structured triage information, assigning ambulance support, recommending hospitals, and showing live route guidance.

> LifeLink helps emergency teams understand, prioritize, dispatch, and route faster.

## Main Users

- **Reporter:** speaks or submits an emergency report and receives AI first-aid guidance.
- **Ambulance Driver:** receives prioritized emergency alerts with AI risk score and live route tracking.
- **Hospital:** updates capacity so ambulances can route patients to hospitals with beds, ICU, doctors, and trauma support.

## AI-Assisted Features

### AI Voice Reporting

The reporter can click `Speak Emergency` and describe the incident naturally.

Example:

```text
There is an accident near Chabahil Chowk. One person is unconscious and bleeding.
```

LifeLink then:

- shows the recognized speech transcript
- detects severity
- detects injury category
- fills emergency form fields
- generates AI triage guidance

### AI Triage Decision Panel

The reporter and driver can see:

- detected severity
- injury category
- risk score
- priority label
- confidence label
- reason for severity detection
- first-aid checklist
- route advice

### Smart Ambulance Selection

The `/api/emergency` route selects the nearest free ambulance when coordinates are available.

- Uses Euclidean distance
- Supports `lat/lng` and `latitude/longitude`
- Falls back to first available ambulance when coordinates are unavailable

### Live Ambulance Route Tracking

The driver route panel uses browser geolocation to:

- show the ambulance marker
- update driver position
- refresh route line
- show route distance and ETA
- open Google Maps directions

### Hospital Recommendation Scoring

Hospitals are ranked using:

```text
score = (available_beds * 2) + (icu_available * 5) + (doctors_available * 3)
```

Trauma support adds:

```text
+10 if has_trauma is true
```

The UI also explains why each hospital was recommended.

## Demo Flow

1. Open LifeLink and choose `Report Emergency`.
2. Click `Speak Emergency`.
3. Say: `There is an accident near Chabahil Chowk. One person is unconscious and bleeding.`
4. Watch LifeLink auto-fill details and show the AI triage panel.
5. Submit the emergency.
6. Open `Ambulance Driver`.
7. View AI priority, risk score, and reason.
8. Accept the case.
9. View live route tracking and hospital recommendations with AI explanations.

## Core Modules

### Emergency Reporting

Users report an emergency with name, location, severity, and injury type. AI voice reporting and triage guidance make the report faster and clearer.

### Ambulance Driver Dashboard

Drivers view emergency alerts, AI priority, risk score, route advice, hospital recommendations, and live route tracking.

### Hospital Capacity Dashboard

Hospitals update beds, ICU availability, doctors, trauma support, neurosurgeon support, burn unit, and blood bank status.

## Tech Stack

- Backend: Python, Flask
- Database: PostgreSQL
- Frontend: HTML, CSS, JavaScript
- Maps: Leaflet, OpenStreetMap, OSRM routing
- Voice Input: Browser SpeechRecognition API
- Database Driver: psycopg2
- Environment Variables: python-dotenv

## Project Structure

```text
LifeLink/
├── Main/
│   ├── app.py
│   ├── ai_features.py
│   ├── database.py
│   └── .env
├── static/
│   ├── script.js
│   └── style.css
├── templates/
│   ├── index.html
│   ├── user.html
│   ├── driver.html
│   └── hospital.html
└── README.md
```

## Environment Variables

Create or update `Main/.env`:

```env
DB_HOST=localhost
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

## Run The Project

```bash
cd Main
python3 app.py
```

Open:

```text
http://127.0.0.1:5000
```

## Validation

```bash
python3 -m py_compile Main/app.py Main/ai_features.py
node --check static/script.js
```

## Notes

- Voice reporting works best in Chrome or Edge.
- Browser location permission is required for live route tracking.
- Current AI features are rule-based and demo-friendly, with no model training required.
