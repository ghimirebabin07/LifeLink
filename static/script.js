let currentAssignment = null;
let currentHospitalRecommendations = [];
let routeMap = null;
let voiceRecognition = null;
let isVoiceListening = false;
let routeMapState = {
    driverLocation: null,
    destinationLocation: null,
    routeLayer: null,
    driverMarker: null,
    destinationMarker: null,
    locationWatchId: null,
    lastRouteRefresh: 0
};

function resetRouteMap() {
    stopLiveRouteTracking();

    routeMapState = {
        driverLocation: null,
        destinationLocation: null,
        routeLayer: null,
        driverMarker: null,
        destinationMarker: null,
        locationWatchId: null,
        lastRouteRefresh: 0
    };

    if (routeMap) {
        routeMap.remove();
        routeMap = null;
    }
}

function buildMapsDirectionsUrl(locationName) {
    const destination = encodeURIComponent(locationName || '');
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

// NEW FEATURE ADDED
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// NEW FEATURE ADDED
async function fetchEmergencyAiInsights(emergencyData) {
    const response = await fetch('/api/ai/emergency-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emergencyData)
    });

    if (!response.ok) {
        throw new Error('Unable to load emergency insights');
    }

    return response.json();
}

// NEW FEATURE ADDED
async function fetchHospitalAiInsights(hospitals) {
    const response = await fetch('/api/ai/hospital-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hospitals })
    });

    if (!response.ok) {
        throw new Error('Unable to load hospital insights');
    }

    return response.json();
}

// NEW FEATURE ADDED
function getEmergencyFormData() {
    const transcriptBox = document.getElementById('voice-transcript');
    const transcriptText = transcriptBox ? transcriptBox.dataset.rawTranscript : '';
    const injuryText = transcriptText
        ? transcriptText
        : (document.getElementById('injury-type') ? document.getElementById('injury-type').value : '');

    return {
        reporter_name: document.getElementById('reporter-name') ? document.getElementById('reporter-name').value : '',
        location_name: document.getElementById('location') ? document.getElementById('location').value : '',
        severity: document.getElementById('severity') ? document.getElementById('severity').value : 'moderate',
        injury_type: injuryText
    };
}

// NEW FEATURE ADDED
function getRiskClass(score) {
    if (score >= 75) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
}

// NEW FEATURE ADDED
function renderEmergencyAiPanel(container, insights, title) {
    if (!container || !insights) return;

    const checklist = Array.isArray(insights.first_aid_checklist)
        ? insights.first_aid_checklist.map(item => `<li>${escapeHtml(item)}</li>`).join('')
        : '';
    const riskClass = getRiskClass(insights.risk_score || 0);
    const confidence = insights.triage_confidence || 'low';
    const priorityLabel = insights.priority_label || 'Monitor closely';

    container.style.display = 'block';
    container.innerHTML = `
        <div class="ai-panel risk-border-${riskClass}">
            <div class="ai-panel-title">
                <span>${escapeHtml(title || 'AI assistance')}</span>
                <span class="ai-confidence confidence-${escapeHtml(confidence)}">${escapeHtml(confidence)} confidence</span>
            </div>
            <p class="ai-summary ai-understood"><strong>AI understood this as:</strong> ${escapeHtml(insights.summary)}</p>
            <div class="ai-grid">
                <div><strong>Detected severity</strong><span>${escapeHtml(insights.detected_severity)}</span></div>
                <div><strong>Injury category</strong><span>${escapeHtml(insights.injury_category)}</span></div>
                <div><strong>Risk score</strong><span class="risk-${riskClass}">${escapeHtml(insights.risk_score)}/100</span></div>
                <div><strong>Priority</strong><span class="risk-${riskClass}">${escapeHtml(priorityLabel)}</span></div>
            </div>
            <p class="ai-summary"><strong>Why:</strong> ${escapeHtml(insights.severity_reason)}</p>
            <p class="ai-summary"><strong>Route advice:</strong> ${escapeHtml(insights.route_decision)}</p>
            ${checklist ? `<div class="first-aid-box"><strong>First-aid guidance while waiting:</strong><ul class="ai-checklist">${checklist}</ul></div>` : ''}
        </div>
    `;
}

// NEW FEATURE ADDED
function updateReporterTracking(insights) {
    const eta = document.getElementById('reporter-eta');
    const trackingCard = document.getElementById('reporter-tracking-card');
    if (!eta || !trackingCard || !insights) return;

    const riskScore = Number(insights.risk_score || 0);
    const estimatedEta = riskScore >= 80 ? '~4 min' : (riskScore >= 55 ? '~6 min' : '~8 min');
    eta.textContent = `ETA ${estimatedEta}`;
    trackingCard.className = `reporter-tracking-card risk-border-${getRiskClass(riskScore)}`;
}

// NEW FEATURE ADDED
async function updateEmergencyAiPreview() {
    const preview = document.getElementById('emergency-ai-preview');
    if (!preview) return;

    try {
        const insights = await fetchEmergencyAiInsights(getEmergencyFormData());
        renderEmergencyAiPanel(preview, insights, 'AI emergency preview');
    } catch (error) {
        console.error('Error loading AI preview:', error);
    }
}

// NEW FEATURE ADDED
function getSpeechRecognition() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// NEW FEATURE ADDED
function setVoiceReportStatus(message, transcript) {
    const status = document.getElementById('voice-report-status');
    const transcriptBox = document.getElementById('voice-transcript');

    if (status) {
        status.textContent = message;
    }

    if (transcriptBox && transcript) {
        transcriptBox.style.display = 'block';
        transcriptBox.textContent = transcript;
    }
}

// NEW FEATURE ADDED
function renderVoiceUnderstanding(transcript, insights) {
    const transcriptBox = document.getElementById('voice-transcript');
    if (!transcriptBox || !insights) return;

    const riskClass = getRiskClass(insights.risk_score || 0);
    transcriptBox.dataset.rawTranscript = transcript;
    transcriptBox.style.display = 'block';
    transcriptBox.innerHTML = `
        <strong>Recognized speech:</strong> ${escapeHtml(transcript)}
        <div class="voice-understanding">
            <span>Severity: ${escapeHtml(insights.detected_severity)}</span>
            <span>Category: ${escapeHtml(insights.injury_category)}</span>
            <span class="risk-${riskClass}">Risk: ${escapeHtml(insights.risk_score)}/100</span>
        </div>
        <div class="voice-understanding-reason">${escapeHtml(insights.severity_reason)}</div>
    `;
}

// NEW FEATURE ADDED
function setSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select || !value) return;

    Array.from(select.options).forEach(option => {
        if (option.value.toLowerCase() === value.toLowerCase()) {
            select.value = option.value;
        }
    });
}

// NEW FEATURE ADDED
function extractLocationFromSpeech(text) {
    const emergencyText = (text || '').trim();
    const locationPatterns = [
        /\b(?:at|near|in|around)\s+(.+?)(?:,|\.|\b(?:with|and|there|one|someone|person|patient|is|has)\b|$)/i,
        /\blocation\s+(.+?)(?:,|\.|$)/i,
    ];

    for (const pattern of locationPatterns) {
        const match = emergencyText.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    return '';
}

// NEW FEATURE ADDED
function detectInjuryOptionFromSpeech(text) {
    const emergencyText = (text || '').toLowerCase();

    if (emergencyText.includes('fracture') || emergencyText.includes('broken bone') || emergencyText.includes('bone broken')) {
        return 'Bone fracture';
    }
    if (emergencyText.includes('burn') || emergencyText.includes('fire') || emergencyText.includes('scald')) {
        return 'Burns';
    }
    if (emergencyText.includes('bleeding') || emergencyText.includes('blood')) {
        return 'Internal bleeding';
    }
    if (emergencyText.includes('spinal') || emergencyText.includes('spine') || emergencyText.includes('back injury')) {
        return 'Spinal injury';
    }
    if (emergencyText.includes('chest') || emergencyText.includes('heart') || emergencyText.includes('breathing')) {
        return 'Chest injury';
    }
    if (emergencyText.includes('head') || emergencyText.includes('unconscious') || emergencyText.includes('seizure')) {
        return 'Head trauma';
    }
    return 'Unknown';
}

// NEW FEATURE ADDED
function applyVoiceReportToForm(transcript) {
    const emergencyText = transcript || '';
    const location = extractLocationFromSpeech(emergencyText);
    const injuryOption = detectInjuryOptionFromSpeech(emergencyText);
    const locationInput = document.getElementById('location');

    if (locationInput && location) {
        locationInput.value = location;
    }

    setSelectValue('injury-type', injuryOption);

    fetchEmergencyAiInsights({
        location_name: location,
        severity: document.getElementById('severity') ? document.getElementById('severity').value : 'moderate',
        injury_type: emergencyText,
        description: emergencyText
    }).then(insights => {
        setSelectValue('severity', insights.detected_severity || 'moderate');
        renderVoiceUnderstanding(emergencyText, insights);
        updateEmergencyAiPreview();
    }).catch(error => {
        console.error('Error applying voice insights:', error);
        updateEmergencyAiPreview();
    });
}

// NEW FEATURE ADDED
function stopVoiceReport() {
    if (voiceRecognition && isVoiceListening) {
        voiceRecognition.stop();
    }
}

// NEW FEATURE ADDED
function startVoiceReport() {
    const Recognition = getSpeechRecognition();
    const button = document.getElementById('voice-report-btn');

    if (!Recognition) {
        setVoiceReportStatus('Voice reporting is not supported in this browser. Try Chrome or Edge.');
        return;
    }

    if (isVoiceListening) {
        stopVoiceReport();
        return;
    }

    voiceRecognition = new Recognition();
    voiceRecognition.lang = 'en-US';
    voiceRecognition.interimResults = true;
    voiceRecognition.continuous = false;

    voiceRecognition.onstart = () => {
        isVoiceListening = true;
        if (button) {
            button.textContent = 'Stop Listening';
            button.classList.add('listening');
        }
        setVoiceReportStatus('Listening... speak the emergency, location, and injury.');
    };

    voiceRecognition.onresult = event => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) {
            transcript += event.results[index][0].transcript;
        }
        setVoiceReportStatus('Listening... review the recognized text below.', transcript.trim());

        if (event.results[event.results.length - 1].isFinal) {
            applyVoiceReportToForm(transcript.trim());
        }
    };

    voiceRecognition.onerror = event => {
        setVoiceReportStatus(`Voice reporting error: ${event.error}`);
    };

    voiceRecognition.onend = () => {
        isVoiceListening = false;
        if (button) {
            button.textContent = 'Speak Emergency';
            button.classList.remove('listening');
        }
        const transcriptBox = document.getElementById('voice-transcript');
        if (transcriptBox && transcriptBox.textContent.trim()) {
            setVoiceReportStatus('Voice report applied. Check the form before sending.');
        } else {
            setVoiceReportStatus('Voice reporting stopped.');
        }
    };

    voiceRecognition.start();
}

function renderRoutePanel() {
    const panel = document.getElementById('route-panel');
    if (!panel) return;

    if (!currentAssignment) {
        panel.style.display = 'none';
        panel.innerHTML = '';
        return;
    }

    const recommendedHospital = currentHospitalRecommendations[0];
    const routeTarget = currentAssignment.phase === 'to_hospital'
        ? (recommendedHospital ? recommendedHospital.location : currentAssignment.hospitalLocation)
        : currentAssignment.locationName;
    const routeUrl = buildMapsDirectionsUrl(routeTarget);
    const routeTitle = currentAssignment.phase === 'to_hospital' ? 'Route to hospital' : 'Route to accident spot';
    const routeLabel = currentAssignment.phase === 'to_hospital' ? 'Hospital destination' : 'Accident spot';
    const actionLabel = currentAssignment.phase === 'to_hospital' ? 'Reached hospital' : 'Reached accident spot';

    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="route-card">
            <h3>${routeTitle}</h3>
            <div class="route-summary">
                <p class="info-text"><strong>${routeLabel}:</strong> ${routeTarget || 'Not available'}</p>
                <p class="info-text"><strong>Recommended hospital:</strong> ${recommendedHospital ? recommendedHospital.name : 'Waiting for recommendation'}</p>
                <p id="live-route-status" class="info-text"><strong>Live route:</strong> waiting for driver location</p>
            </div>
            <div id="route-map" class="route-map">
                <div class="muted" style="padding:1.5rem">Loading route map...</div>
            </div>
            <div class="route-actions">
                <button class="btn btn-green" onclick="window.open('${routeUrl}', '_blank', 'noopener')">Open route</button>
                <button class="btn btn-red" onclick="markRouteReached()">${actionLabel}</button>
            </div>
        </div>
    `;
}

// PAGE SWITCHING LOGIC 
function switchRole(role) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(role + '-page');
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Update role indicator
    const roleLabels = {
        'home': 'Home',
        'user': 'Reporter',
        'driver': 'Driver',
        'hospital': 'Hospital'
    };
    document.getElementById('current-role').textContent = roleLabels[role] || role;

    // Load data if needed
    if (role === 'driver') {
        loadAlerts();
    } else if (role === 'hospital') {
        loadHospitals();
    }

    // Close mobile menu
    const navMenu = document.getElementById('nav-menu');
    if (navMenu) {
        navMenu.classList.remove('active');
    }
}

// USER EMERGENCY REPORTING 
function validateEmergencyForm() {
    const name = document.getElementById('reporter-name').value.trim();
    const location = document.getElementById('location').value.trim();

    if (!name) {
        alert('Please enter your name');
        return false;
    }
    if (!location) {
        alert('Please enter the location of the emergency');
        return false;
    }
    if (name.length < 3) {
        alert('Name should be at least 3 characters long');
        return false;
    }
    if (location.length < 3) {
        alert('Location should be at least 3 characters long');
        return false;
    }
    return true;
}

async function submitEmergency() {
    if (!validateEmergencyForm()) return;

    const name = document.getElementById('reporter-name').value;
    const location = document.getElementById('location').value;
    const severity = document.getElementById('severity').value;
    const injury = document.getElementById('injury-type').value;
    const emergencyData = {
        reporter_name: name,
        location_name: location,
        severity: severity,
        injury_type: injury
    };

    try {
        const response = await fetch('/api/emergency', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emergencyData)
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('step-form').style.display = 'none';
            document.getElementById('step-status').style.display = 'block';
            document.getElementById('emergency-id').textContent = data.emergency_id;
            document.getElementById('ambulance-info').textContent =
                    `Ambulance assigned: ${data.ambulance.driver_name} (${data.ambulance.vehicle_no})`;

            // NEW FEATURE ADDED
            try {
                const insights = await fetchEmergencyAiInsights(emergencyData);
                renderEmergencyAiPanel(document.getElementById('submitted-ai-insights'), insights, 'AI response guidance');
                updateReporterTracking(insights);
            } catch (insightError) {
                console.error('Error loading submitted AI insights:', insightError);
            }
        } else {
                alert((data.message || 'No ambulance available right now. Please call 102.'));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting emergency. Please try again.');
    }
}

// DRIVER DASHBOARD 
async function loadAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const alerts = await response.json();
        const container = document.getElementById('alerts-list');

        if (!container) return;

        if (currentAssignment) {
            container.innerHTML = `
                <div class="alert-card active-case">
                    <div class="alert-title">
                        <strong>Active case in progress</strong>
                        <span class="badge badge-red">${currentAssignment.phase === 'to_hospital' ? 'To hospital' : 'En route'}</span>
                    </div>
                    <p class="alert-info"><strong>Accident spot:</strong> ${currentAssignment.locationName || 'Not available'}</p>
                    <p class="alert-info"><strong>Hospital:</strong> ${currentAssignment.hospitalLocation || (currentHospitalRecommendations[0] ? currentHospitalRecommendations[0].location : 'Pending')}</p>
                </div>
            `;
            return;
        }

        if (alerts.length === 0) {
            container.innerHTML = '<div class="muted">✓ No active alerts. All emergencies handled!</div>';
            return;
        }

        // NEW FEATURE ADDED
        const alertInsights = await Promise.all(alerts.map(alert => {
            return fetchEmergencyAiInsights({
                location_name: alert.location_name,
                severity: alert.severity,
                injury_type: alert.injury_type
            }).catch(() => null);
        }));

        container.innerHTML = alerts.map((alert, index) => {
            const severityColor = alert.severity === 'critical' ? 'red' : (alert.severity === 'moderate' ? 'yellow' : 'green');
            const severityLabel = alert.severity === 'critical' ? 'Critical' : (alert.severity === 'moderate' ? 'Moderate' : 'Mild');
            const insight = alertInsights[index];
            const riskClass = insight ? getRiskClass(insight.risk_score || 0) : 'medium';
            
            return `
                <div class="alert-card" data-emergency-id="${alert.id}" data-severity="${alert.severity}" data-injury="${alert.injury_type}" data-location="${alert.location_name}">
                    <div class="alert-title">
                        <strong>New Emergency</strong>
                        <span class="badge badge-${severityColor}">
                            ${severityLabel}
                        </span>
                    </div>
                    <p class="alert-info"><strong>Location:</strong> ${alert.location_name}</p>
                    <p class="alert-info"><strong>Injury:</strong> ${alert.injury_type}</p>
                    <p class="alert-info"><strong>Reported by:</strong> ${alert.reporter_name}</p>
                    ${insight ? `
                        <div class="ai-mini risk-border-${riskClass}">
                            <div class="ai-mini-title">
                                <strong>AI priority:</strong>
                                <span class="risk-${riskClass}">${escapeHtml(insight.priority_label)} (${insight.risk_score}/100)</span>
                            </div>
                            <div>${escapeHtml(insight.driver_alert)}</div>
                            <div><strong>Why:</strong> ${escapeHtml(insight.severity_reason)}</div>
                        </div>
                    ` : ''}
                    <div class="alert-buttons">
                        <button class="btn btn-green accept-alert-btn">
                            Accept case
                        </button>
                        <button class="btn decline-alert-btn" style="border-color:#c41e3a;color:#8B0000">
                            Decline
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners using event delegation
        container.querySelectorAll('.accept-alert-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const alertCard = this.closest('.alert-card');
                const emergencyId = parseInt(alertCard.dataset.emergencyId);
                const severity = alertCard.dataset.severity;
                const injury = alertCard.dataset.injury;
                const locationName = alertCard.dataset.location || '';
                acceptAlert(emergencyId, severity, injury, locationName);
            });
        });

        container.querySelectorAll('.decline-alert-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                declineAlert();
            });
        });
    } catch (error) {
        console.error('Error loading alerts:', error);
        document.getElementById('alerts-list').innerHTML = '<div class="muted">Error loading alerts</div>';
    }
}

async function acceptAlert(emergencyId, severity, injuryType, locationName) {
    const ambulanceId = 1; // In production, this comes from logged-in driver

    try {
        // Disable button and show loading state
        const buttons = document.querySelectorAll('.accept-alert-btn');
        buttons.forEach(btn => btn.disabled = true);

        const response = await fetch(`/api/accept/${emergencyId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ambulance_id: ambulanceId })
        });

        if (!response.ok) {
            throw new Error('Failed to accept alert');
        }

        const data = await response.json();

        currentAssignment = {
            emergencyId,
            severity,
            injuryType,
            locationName: data.location_name || locationName || 'Unknown location',
            hospitalLocation: data.assigned_hospital ? data.assigned_hospital.location : '',
            phase: 'to_scene'
        };

        currentHospitalRecommendations = Array.isArray(data.hospital_recommendations) ? data.hospital_recommendations : [];

        // Hide other requests and show the active route only
        document.getElementById('hospital-suggestions').style.display = 'none';
        await loadHospitalSuggestions(severity, injuryType);
        renderRoutePanel();
        await initializeRouteMap(currentAssignment.locationName);
        
        // Update driver status
        document.getElementById('driver-status').textContent = 'On scene';
        document.getElementById('driver-status').className = 'badge badge-red';

        // Remove accepted alert from list
        const alertCards = document.querySelectorAll('.alert-card');
        alertCards.forEach(card => {
            if (parseInt(card.dataset.emergencyId) === emergencyId) {
                card.style.opacity = '0.5';
            } else {
                card.remove();
            }
        });

        const alertsList = document.getElementById('alerts-list');
        if (alertsList) {
            alertsList.insertAdjacentHTML('beforeend', '<div class="muted" style="padding-top:0">Other requests are hidden until the active case is completed.</div>');
        }

        // Re-enable buttons
        buttons.forEach(btn => btn.disabled = false);

    } catch (error) {
        console.error('Error accepting alert:', error);
        alert('Error accepting alert. Please try again.');
        
        // Re-enable buttons on error
        const buttons = document.querySelectorAll('.accept-alert-btn');
        buttons.forEach(btn => btn.disabled = false);
    }
}

function declineAlert() {
    alert('Alert will be offered to the next available driver.');
}

async function loadHospitalSuggestions(severity, injuryType) {
    try {
        const response = await fetch('/api/suggest-hospital', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ severity: severity, injury_type: injuryType })
        });

        let hospitals = await response.json();
        const container = document.getElementById('hospitals-list');

        if (!hospitals || hospitals.length === 0) {
            container.innerHTML = '<div class="muted">No hospitals available</div>';
            currentHospitalRecommendations = [];
            renderRoutePanel();
            return;
        }

        // NEW FEATURE ADDED
        try {
            hospitals = await fetchHospitalAiInsights(hospitals);
        } catch (insightError) {
            console.error('Error loading hospital AI insights:', insightError);
        }

        currentHospitalRecommendations = hospitals;

        container.innerHTML = hospitals.map((h, index) => `
            <div class="hospital-card ${index === 0 ? 'best' : ''}">
                ${index === 0 ? '<span class="badge badge-green" style="margin-bottom:10px;display:inline-block">Best match</span>' : ''}
                <div class="hospital-name">${h.name}</div>
                <div class="hospital-info">
                    <strong>${h.location}</strong>
                </div>
                <div class="hospital-info" style="margin-top:10px">
                    <strong>${h.available_beds}</strong> beds available &nbsp;|&nbsp;
                    <strong>${h.icu_available}</strong> ICU beds &nbsp;|&nbsp;
                    <strong>${h.doctors_available}</strong> doctors
                </div>
                <div class="hospital-info" style="margin-top:10px;padding:10px;background:#f8f9fa;border-radius:6px;">
                    ${h.has_trauma ? 'Trauma bay available' : 'No trauma bay'} &nbsp;
                    ${h.has_neurosurgeon ? 'Neurosurgeon available' : 'No neurosurgeon'}<br/>
                    ${h.has_burn_unit ? 'Burn unit available' : 'No burn unit'} &nbsp;
                    ${h.has_blood_bank ? 'Blood bank available' : 'No blood bank'}
                </div>
                ${h.match_explanation ? `
                    <div class="ai-mini hospital-ai-reason">
                        <div class="ai-mini-title">
                            <strong>AI hospital score:</strong>
                            <span>${escapeHtml(h.ai_score)}</span>
                        </div>
                        <div>${escapeHtml(h.match_explanation)}</div>
                        <div><strong>Capacity status:</strong> <span class="capacity-${escapeHtml(h.capacity_status)}">${escapeHtml(h.capacity_status)}</span></div>
                    </div>
                ` : ''}
            </div>
        `).join('');

        renderRoutePanel();
    } catch (error) {
        console.error('Error loading hospitals:', error);
        document.getElementById('hospitals-list').innerHTML = '<div class="muted">Error loading hospital suggestions</div>';
    }
}

async function markRouteReached() {
    if (!currentAssignment) {
        return;
    }

    if (currentAssignment.phase === 'to_scene') {
        currentAssignment.phase = 'to_hospital';
        renderRoutePanel();
        await initializeRouteMap(currentHospitalRecommendations[0] ? currentHospitalRecommendations[0].location : currentAssignment.hospitalLocation);
        document.getElementById('driver-status').textContent = 'Transporting patient';
        document.getElementById('driver-status').className = 'badge badge-yellow';
        return;
    }

    try {
        const response = await fetch(`/api/reach-hospital/${currentAssignment.emergencyId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Unable to complete case');
        }

        currentAssignment = null;
        currentHospitalRecommendations = [];
        resetRouteMap();
        renderRoutePanel();
        document.getElementById('hospital-suggestions').style.display = 'none';
        document.getElementById('driver-status').textContent = 'Available';
        document.getElementById('driver-status').className = 'badge badge-green';
        loadAlerts();
    } catch (error) {
        console.error('Error completing case:', error);
        alert('Unable to mark the case as reached. Please try again.');
    }
}

async function geocodeLocation(locationName) {
    const query = encodeURIComponent(locationName);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${query}`, {
        headers: {
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Unable to geocode location');
    }

    const results = await response.json();
    if (!results || results.length === 0) {
        throw new Error('Location not found');
    }

    return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        label: results[0].display_name || locationName
    };
}

function getDriverLocation() {
    return new Promise(resolve => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    label: 'Current location'
                });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 7000, maximumAge: 10000 }
        );
    });
}

// NEW FEATURE ADDED
function updateLiveRouteStatus(message) {
    const status = document.getElementById('live-route-status');
    if (status) {
        status.innerHTML = `<strong>Live route:</strong> ${escapeHtml(message)}`;
    }
}

// NEW FEATURE ADDED
function updateDriverMarker(location) {
    if (!routeMap || !location) {
        return;
    }

    routeMapState.driverLocation = location;

    if (!routeMapState.driverMarker) {
        routeMapState.driverMarker = L.marker([location.lat, location.lng], {
            title: 'Ambulance live location'
        }).addTo(routeMap).bindPopup('Ambulance live location');
        return;
    }

    routeMapState.driverMarker.setLatLng([location.lat, location.lng]);
}

// NEW FEATURE ADDED
async function refreshLiveRouteLine() {
    const driverLocation = routeMapState.driverLocation;
    const destination = routeMapState.destinationLocation;

    if (!routeMap || !driverLocation || !destination) {
        return;
    }

    const now = Date.now();
    if (now - routeMapState.lastRouteRefresh < 8000) {
        return;
    }
    routeMapState.lastRouteRefresh = now;

    try {
        const routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${driverLocation.lng},${driverLocation.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`);
        if (!routeResponse.ok) {
            return;
        }

        const routeData = await routeResponse.json();
        const route = routeData.routes && routeData.routes[0];
        if (!route || !route.geometry) {
            return;
        }

        if (routeMapState.routeLayer) {
            routeMap.removeLayer(routeMapState.routeLayer);
        }

        routeMapState.routeLayer = L.geoJSON(route.geometry, {
            style: {
                color: '#8B0000',
                weight: 5,
                opacity: 0.9
            }
        }).addTo(routeMap);

        const etaMinutes = route.duration ? Math.max(1, Math.round(route.duration / 60)) : null;
        const distanceKm = route.distance ? (route.distance / 1000).toFixed(1) : null;
        if (etaMinutes && distanceKm) {
            updateLiveRouteStatus(`tracking active, ${distanceKm} km away, ETA ${etaMinutes} min`);
        } else {
            updateLiveRouteStatus('tracking active');
        }
    } catch (routeError) {
        console.error('Live route refresh failed:', routeError);
    }
}

// NEW FEATURE ADDED
function stopLiveRouteTracking() {
    if (routeMapState.locationWatchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(routeMapState.locationWatchId);
    }
    routeMapState.locationWatchId = null;
}

// NEW FEATURE ADDED
function startLiveRouteTracking() {
    stopLiveRouteTracking();

    if (!navigator.geolocation) {
        updateLiveRouteStatus('not supported by this browser');
        return;
    }

    routeMapState.locationWatchId = navigator.geolocation.watchPosition(
        position => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                label: 'Live ambulance location'
            };

            updateDriverMarker(location);
            refreshLiveRouteLine();
        },
        () => {
            updateLiveRouteStatus('location permission needed');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    updateLiveRouteStatus('tracking started');
}

async function initializeRouteMap(locationName) {
    const mapContainer = document.getElementById('route-map');
    if (!mapContainer || typeof L === 'undefined') {
        return;
    }

    mapContainer.innerHTML = '<div class="muted" style="padding:1.5rem">Loading route map...</div>';

    try {
        const destination = await geocodeLocation(locationName);
        const driverLocation = await getDriverLocation();

        routeMapState.destinationLocation = destination;
        routeMapState.driverLocation = driverLocation;

        mapContainer.innerHTML = '';
        if (routeMap) {
            routeMap.remove();
        }

        routeMap = L.map('route-map', {
            zoomControl: true,
            scrollWheelZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(routeMap);

        routeMapState.destinationMarker = L.marker([destination.lat, destination.lng])
            .addTo(routeMap)
            .bindPopup(currentAssignment.phase === 'to_hospital'
                ? `Hospital: ${currentHospitalRecommendations[0] ? currentHospitalRecommendations[0].name : 'Destination'}`
                : `Accident spot: ${currentAssignment.locationName}`)
            .openPopup();

        const points = [];
        points.push([destination.lat, destination.lng]);

        if (driverLocation) {
            routeMapState.driverMarker = L.marker([driverLocation.lat, driverLocation.lng], {
                title: 'Ambulance location'
            }).addTo(routeMap).bindPopup('Ambulance current location');
            points.push([driverLocation.lat, driverLocation.lng]);

            await refreshLiveRouteLine();
        }

        if (points.length === 1) {
            routeMap.setView(points[0], 14);
        } else {
            routeMap.fitBounds(L.latLngBounds(points).pad(0.2));
        }

        startLiveRouteTracking();
    } catch (error) {
        console.error('Error loading route map:', error);
        mapContainer.innerHTML = '<div class="muted" style="padding:1.5rem">Map preview unavailable. Open the route for directions.</div>';
        updateLiveRouteStatus('map preview unavailable');
    }
}

//  HOSPITAL MANAGEMENT 
async function loadHospitals() {
    try {
        const response = await fetch('/api/hospitals');
        const hospitals = await response.json();
        const select = document.getElementById('hospital-select');
        if (!select) return;

        // Clear existing options (keep the placeholder)
        select.innerHTML = '<option value="">-- Select Your Hospital --</option>';

        hospitals.forEach(h => {
            const option = document.createElement('option');
            option.value = h.id;
            option.textContent = h.name;
            option.dataset.info = JSON.stringify(h);
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading hospitals:', error);
    }
}

function loadHospitalData() {
    const select = document.getElementById('hospital-select');
    const selected = select.options[select.selectedIndex];
    if (!selected.value || !selected.dataset.info) return;

    const h = JSON.parse(selected.dataset.info);
    document.getElementById('inp-beds').value = h.available_beds;
    document.getElementById('inp-icu').value = h.icu_available;
    document.getElementById('inp-docs').value = h.doctors_available;
    document.getElementById('chk-trauma').checked = h.has_trauma;
    document.getElementById('chk-neuro').checked = h.has_neurosurgeon;
    document.getElementById('chk-burn').checked = h.has_burn_unit;
    document.getElementById('chk-blood').checked = h.has_blood_bank;
}

function validateHospitalForm() {
    const hospitalId = document.getElementById('hospital-select').value;
    if (!hospitalId) { 
        alert('Please select a hospital');
        return false;
    }

    const beds = parseInt(document.getElementById('inp-beds').value);
    const icu = parseInt(document.getElementById('inp-icu').value);
    const docs = parseInt(document.getElementById('inp-docs').value);

    if (isNaN(beds) || beds < 0) {
        alert('Please enter a valid number of beds');
        return false;
    }
    if (isNaN(icu) || icu < 0) {
        alert('Please enter a valid number of ICU beds');
        return false;
    }
    if (isNaN(docs) || docs < 0) {
        alert('Please enter a valid number of doctors');
        return false;
    }

    return true;
}

async function saveHospital() {
    if (!validateHospitalForm()) return;

    const hospitalId = document.getElementById('hospital-select').value;
    const data = {
        hospital_id: parseInt(hospitalId),
        available_beds: parseInt(document.getElementById('inp-beds').value) || 0,
        icu_available: parseInt(document.getElementById('inp-icu').value) || 0,
        doctors_available: parseInt(document.getElementById('inp-docs').value) || 0,
        has_trauma: document.getElementById('chk-trauma').checked,
        has_neurosurgeon: document.getElementById('chk-neuro').checked,
        has_burn_unit: document.getElementById('chk-burn').checked,
        has_blood_bank: document.getElementById('chk-blood').checked
    };

    try {
        const response = await fetch('/api/hospital/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            const msg = document.getElementById('save-msg');
            msg.style.display = 'block';
            setTimeout(() => { msg.style.display = 'none'; }, 3000);
        } else {
            alert('Error updating hospital');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving hospital data');
    }
}

//  INITIALIZE ON PAGE LOAD 
document.addEventListener('DOMContentLoaded', function() {
    // Show home page by default
    switchRole('home');

    // NEW FEATURE ADDED
    const emergencyForm = document.getElementById('step-form');
    const reporterInput = document.getElementById('reporter-name');
    if (emergencyForm && reporterInput && !document.getElementById('voice-report-box')) {
        reporterInput.insertAdjacentHTML('beforebegin', `
            <div id="voice-report-box" class="voice-report-box">
                <button id="voice-report-btn" type="button" class="btn btn-outline btn-full">Speak Emergency</button>
                <p id="voice-report-status" class="voice-report-status">Use voice to fill emergency details faster.</p>
                <div id="voice-transcript" class="voice-transcript" style="display:none"></div>
            </div>
        `);

    }

    // NEW FEATURE ADDED
    const voiceButton = document.getElementById('voice-report-btn');
    if (voiceButton) {
        voiceButton.addEventListener('click', startVoiceReport);
    }

    // NEW FEATURE ADDED
    const injurySelect = document.getElementById('injury-type');
    if (injurySelect && !document.getElementById('emergency-ai-preview')) {
        injurySelect.insertAdjacentHTML('afterend', '<div id="emergency-ai-preview" class="ai-preview" style="display:none"></div>');
    }

    // NEW FEATURE ADDED
    const statusSteps = document.querySelector('#step-status .status-steps');
    if (statusSteps && !document.getElementById('submitted-ai-insights')) {
        statusSteps.insertAdjacentHTML('afterend', '<div id="submitted-ai-insights" class="ai-preview" style="display:none"></div>');
    }

    // NEW FEATURE ADDED
    ['severity', 'injury-type', 'location'].forEach(id => {
        const field = document.getElementById(id);
        if (field) {
            field.addEventListener('change', updateEmergencyAiPreview);
            field.addEventListener('input', updateEmergencyAiPreview);
        }
    });
    updateEmergencyAiPreview();

    // Setup mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Auto-refresh driver alerts every 10 seconds
    setInterval(function() {
        if (document.getElementById('driver-page').classList.contains('active')) {
            loadAlerts();
        }
    }, 10000);
});
