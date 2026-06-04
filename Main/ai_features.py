# NEW FEATURE ADDED
def detect_severity(text):
    emergency_text = (text or '').lower()

    critical_keywords = [
        'bleeding',
        'unconscious',
        'not breathing',
        'accident severe',
    ]
    moderate_keywords = [
        'fracture',
        'pain',
        'injury',
    ]
    mild_keywords = [
        'small injury',
        'minor pain',
    ]

    if any(keyword in emergency_text for keyword in critical_keywords):
        return 'critical'
    if any(keyword in emergency_text for keyword in mild_keywords):
        return 'mild'
    if any(keyword in emergency_text for keyword in moderate_keywords):
        return 'moderate'
    return 'moderate'


# NEW FEATURE ADDED
def explain_severity_detection(text, severity=None):
    emergency_text = (text or '').lower()
    detected_severity = severity or detect_severity(emergency_text)
    severity_reasons = {
        'critical': ['bleeding', 'unconscious', 'not breathing', 'accident severe'],
        'moderate': ['fracture', 'pain', 'injury'],
        'mild': ['small injury', 'minor pain'],
    }

    matched_keywords = [
        keyword
        for keyword in severity_reasons.get(detected_severity, [])
        if keyword in emergency_text
    ]

    if matched_keywords:
        return f"Marked {detected_severity} because the report mentions {', '.join(matched_keywords)}."
    return f"Marked {detected_severity} from the selected emergency details."


# NEW FEATURE ADDED
def get_triage_confidence(text, severity=None):
    emergency_text = (text or '').lower()
    detected_severity = severity or detect_severity(emergency_text)
    keyword_groups = {
        'critical': ['bleeding', 'unconscious', 'not breathing', 'accident severe'],
        'moderate': ['fracture', 'pain', 'injury'],
        'mild': ['small injury', 'minor pain'],
    }
    matches = sum(
        1
        for keyword in keyword_groups.get(detected_severity, [])
        if keyword in emergency_text
    )

    if matches >= 2:
        return 'high'
    if matches == 1:
        return 'medium'
    return 'low'


# NEW FEATURE ADDED
def generate_emergency_summary(emergency_data):
    emergency_data = emergency_data or {}
    severity = emergency_data.get('severity', 'Moderate')
    location = emergency_data.get('location') or emergency_data.get('location_name', 'unknown location')
    injury_type = emergency_data.get('injury_type', 'unknown')

    return f"{severity.capitalize()} emergency at {location}, injury type {injury_type}. Ambulance assigned."


# NEW FEATURE ADDED
def detect_injury_category(text):
    emergency_text = (text or '').lower()
    category_keywords = {
        'burn': ['burn', 'fire', 'scald'],
        'fracture': ['fracture', 'broken bone', 'bone broken'],
        'cardiac': ['heart attack', 'chest pain', 'cardiac'],
        'breathing': ['not breathing', 'breathing issue', 'shortness of breath'],
        'trauma': ['accident', 'crash', 'trauma', 'bleeding'],
        'neurological': ['unconscious', 'seizure', 'stroke'],
    }

    for category, keywords in category_keywords.items():
        if any(keyword in emergency_text for keyword in keywords):
            return category
    return 'general'


# NEW FEATURE ADDED
def calculate_emergency_risk_score(emergency_data):
    emergency_data = emergency_data or {}
    severity = (emergency_data.get('severity') or 'moderate').lower()
    injury_type = (
        emergency_data.get('injury_type')
        or emergency_data.get('description')
        or ''
    ).lower()

    score = {
        'critical': 80,
        'moderate': 50,
        'mild': 20,
    }.get(severity, 50)

    high_risk_keywords = ['bleeding', 'unconscious', 'not breathing', 'heart attack']
    medium_risk_keywords = ['fracture', 'burn', 'injury', 'pain']

    if any(keyword in injury_type for keyword in high_risk_keywords):
        score += 20
    elif any(keyword in injury_type for keyword in medium_risk_keywords):
        score += 10

    return min(score, 100)


# NEW FEATURE ADDED
def get_priority_label(risk_score):
    try:
        score = int(risk_score)
    except (TypeError, ValueError):
        score = 50

    if score >= 80:
        return 'Immediate dispatch'
    if score >= 55:
        return 'High priority'
    if score >= 30:
        return 'Monitor closely'
    return 'Low priority'


# NEW FEATURE ADDED
def estimate_ambulance_eta(distance_km, average_speed_kmph=30):
    try:
        distance = float(distance_km)
        speed = float(average_speed_kmph)
    except (TypeError, ValueError):
        return None

    if distance < 0 or speed <= 0:
        return None

    return round((distance / speed) * 60)


# NEW FEATURE ADDED
def is_possible_duplicate_emergency(new_emergency, existing_emergencies):
    new_emergency = new_emergency or {}
    existing_emergencies = existing_emergencies or []
    new_location = (new_emergency.get('location_name') or '').strip().lower()
    new_injury = (new_emergency.get('injury_type') or '').strip().lower()

    if not new_location:
        return False

    for emergency in existing_emergencies:
        location = (emergency.get('location_name') or '').strip().lower()
        injury = (emergency.get('injury_type') or '').strip().lower()

        if location == new_location and (not new_injury or injury == new_injury):
            return True
    return False


# NEW FEATURE ADDED
def explain_hospital_match(hospital):
    hospital = hospital or {}
    reasons = []

    if hospital.get('available_beds', 0) > 0:
        reasons.append('available beds')
    if hospital.get('icu_available', 0) > 0:
        reasons.append('ICU availability')
    if hospital.get('doctors_available', 0) > 0:
        reasons.append('doctors available')
    if hospital.get('has_trauma'):
        reasons.append('trauma support')
    if hospital.get('has_blood_bank'):
        reasons.append('blood bank')

    if not reasons:
        return 'Recommended as the closest available hospital record.'
    return 'Recommended because it has ' + ', '.join(reasons) + '.'


# NEW FEATURE ADDED
def calculate_hospital_score(hospital):
    hospital = hospital or {}
    score = (
        ((hospital.get('available_beds', 0) or 0) * 2) +
        ((hospital.get('icu_available', 0) or 0) * 5) +
        ((hospital.get('doctors_available', 0) or 0) * 3)
    )

    if hospital.get('has_trauma'):
        score += 10
    return score


# NEW FEATURE ADDED
def get_hospital_capacity_status(hospital):
    hospital = hospital or {}
    beds = hospital.get('available_beds', 0) or 0
    icu = hospital.get('icu_available', 0) or 0
    doctors = hospital.get('doctors_available', 0) or 0

    if beds <= 0 or doctors <= 0:
        return 'low'
    if beds < 5 or icu <= 0:
        return 'medium'
    return 'good'


# NEW FEATURE ADDED
def generate_driver_alert_message(emergency_data):
    emergency_data = emergency_data or {}
    severity = (emergency_data.get('severity') or 'moderate').capitalize()
    location = emergency_data.get('location_name') or 'unknown location'
    injury_type = emergency_data.get('injury_type') or 'unknown injury'

    return f"{severity} emergency reported at {location}. Possible {injury_type}."


# NEW FEATURE ADDED
def suggest_route_decision(emergency_data):
    emergency_data = emergency_data or {}
    severity = (emergency_data.get('severity') or 'moderate').lower()
    injury_text = (
        emergency_data.get('injury_type')
        or emergency_data.get('description')
        or ''
    ).lower()

    urgent_keywords = ['not breathing', 'unconscious', 'bleeding', 'heart attack']
    if severity == 'critical' or any(keyword in injury_text for keyword in urgent_keywords):
        return 'Go directly to the best available hospital.'
    return 'Reach patient first, then proceed to recommended hospital.'


# NEW FEATURE ADDED
def generate_first_aid_checklist(injury_type):
    injury_text = (injury_type or '').lower()

    if 'bleeding' in injury_text:
        return [
            'Apply firm pressure to the wound.',
            'Keep the injured area raised if possible.',
            'Do not remove soaked cloth; add another layer.',
        ]
    if 'fracture' in injury_text or 'broken' in injury_text:
        return [
            'Keep the injured limb still.',
            'Avoid moving the patient unless necessary.',
            'Support the injured area with padding.',
        ]
    if 'burn' in injury_text:
        return [
            'Cool the burn with clean running water.',
            'Do not apply ice directly.',
            'Cover loosely with clean cloth.',
        ]
    if 'unconscious' in injury_text or 'not breathing' in injury_text:
        return [
            'Call emergency services immediately.',
            'Check breathing and pulse.',
            'Begin CPR if trained and needed.',
        ]

    return [
        'Keep the patient calm.',
        'Avoid unnecessary movement.',
        'Wait for medical help to arrive.',
    ]
