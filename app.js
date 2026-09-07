/**
 * ResQAI — Main Frontend Application Logic & Router
 * Built for Northeast India Landslide Early Warning System
 */

const ResQApp = (function () {
  let mapInstance = null;
  let mapMarkers = [];
  let monitoringCharts = {};
  let reportsCharts = {};
  let currentStationId = "AS-01";
  let currentActiveView = "home";

  // Init on DOM ready
  document.addEventListener("DOMContentLoaded", async function () {
    initAuth();
    initNavigation();
    initGlobalSearch();
    await loadHomeDashboard();
    initMap();
    await initRiskMonitoring();
    await initAlerts();
    await initResponseCenter();
    await initReports();
    initSettings();
    initModals();

    // Check URL hash for initial route
    const hash = window.location.hash.replace("#", "");
    if (hash && ["home", "live-map", "risk-monitoring", "alerts", "response-center", "reports", "settings"].includes(hash)) {
      navigateTo(hash);
    }
  });

  /* ==========================================================
     0. SUPABASE OFFICER LOGIN & TELEMETRY SYNCHRONIZATION
     ========================================================== */
  const SUPABASE_CONFIG = {
    url: "https://tzosballctbzqtblwldm.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6b3NiYWxsY3RienF0Ymx3bGRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3OTQyNzAsImV4cCI6MjEwNDM3MDI3MH0.4cRVDcNlmgmjyIy67luRyCWPPlz9JvFhrGAbLYg41TM",
    tableName: "user_logins",
    storageKey: "resqai_authenticated_officer"
  };

  async function saveLoginToSupabase(userData) {
    try {
      const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_CONFIG.tableName}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_CONFIG.anonKey,
          "Authorization": `Bearer ${SUPABASE_CONFIG.anonKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          officer_name: userData.name,
          email: userData.email,
          role: userData.role,
          agency: userData.agency,
          phone: userData.phone,
          operational_region: userData.region,
          session_id: "SESS-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
          status: "ACTIVE"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("Supabase response status:", response.status, errorText);
      } else {
        const insertedData = await response.json();
        console.log("Officer login synced to Supabase:", insertedData);
      }
      return true;
    } catch (err) {
      console.error("Supabase sync error:", err);
      return true;
    }
  }

  function applyUserProfile(user) {
    const topbarProfileName = document.getElementById("topbarProfileName");
    if (topbarProfileName && user.name) {
      topbarProfileName.textContent = user.name;
    }

    const editName = document.getElementById("editProfileName");
    const editRole = document.getElementById("editProfileRole");
    const editAgency = document.getElementById("editProfileAgency");
    const editEmail = document.getElementById("editProfileEmail");
    const editPhone = document.getElementById("editProfilePhone");

    if (editName && user.name) editName.value = user.name;
    if (editRole && user.role) editRole.value = user.role;
    if (editAgency && user.agency) editAgency.value = user.agency;
    if (editEmail && user.email) editEmail.value = user.email;
    if (editPhone && user.phone) editPhone.value = user.phone;
  }

  function initAuth() {
    const loginScreen = document.getElementById("loginScreen");
    const loginCard = document.getElementById("loginCard");
    const loginForm = document.getElementById("loginForm");
    const nameInput = document.getElementById("officerNameInput");
    const emailInput = document.getElementById("officerEmailInput");
    const roleInput = document.getElementById("officerRoleInput");
    const agencyInput = document.getElementById("officerAgencyInput");
    const phoneInput = document.getElementById("officerPhoneInput");
    const regionInput = document.getElementById("officerRegionInput");
    const autoFillBtn = document.getElementById("autoFillDemoBtn");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const loginBtnText = document.getElementById("loginBtnText");
    const loginBtnIcon = document.getElementById("loginBtnIcon");
    const errorBanner = document.getElementById("loginError");
    const errorText = document.getElementById("loginErrorText");
    const topLogoutBtn = document.getElementById("topLogoutBtn");

    // Check cached session
    try {
      const stored = localStorage.getItem(SUPABASE_CONFIG.storageKey);
      if (stored) {
        const user = JSON.parse(stored);
        if (user && user.email) {
          if (loginScreen) {
            loginScreen.classList.add("auth-hidden");
            loginScreen.style.display = "none";
          }
          applyUserProfile(user);
        }
      }
    } catch (e) {
      console.warn("Storage check:", e);
    }

    // Auto-fill demo button
    if (autoFillBtn) {
      autoFillBtn.addEventListener("click", function () {
        if (nameInput) nameInput.value = "Capt. Rajesh Saikia";
        if (emailInput) emailInput.value = "r.saikia@sdma.assam.gov.in";
        if (roleInput) roleInput.value = "Disaster Response Coordinator";
        if (agencyInput) agencyInput.value = "State Disaster Management Authority (SDMA Assam)";
        if (phoneInput) phoneInput.value = "+91 94350 12345";
        if (regionInput) regionInput.value = "Assam - Brahmaputra & Barak Valleys";
        if (errorBanner) errorBanner.style.display = "none";
      });
    }

    async function handleLogin() {
      const name = (nameInput ? nameInput.value : "").trim();
      const email = (emailInput ? emailInput.value : "").trim();
      const role = (roleInput ? roleInput.value : "Disaster Response Coordinator");
      const agency = (agencyInput ? agencyInput.value : "").trim();
      const phone = (phoneInput ? phoneInput.value : "").trim();
      const region = (regionInput ? regionInput.value : "All 8 States (North East Region)");

      if (!name) {
        showError("Please enter your Officer / Team Name.");
        if (nameInput) nameInput.focus();
        return;
      }
      if (!email || !email.includes("@")) {
        showError("Please enter a valid official email address.");
        if (emailInput) emailInput.focus();
        return;
      }

      if (errorBanner) errorBanner.style.display = "none";
      if (submitBtn) {
        submitBtn.classList.add("loading");
        if (loginBtnText) loginBtnText.textContent = "Authenticating & Logging Session...";
        if (loginBtnIcon) loginBtnIcon.className = "fa-solid fa-spinner fa-spin";
      }

      const userData = { name, email, role, agency, phone, region, loginTime: new Date().toISOString() };

      // Save to Supabase table in background
      await saveLoginToSupabase(userData);

      // Save session to localStorage
      localStorage.setItem(SUPABASE_CONFIG.storageKey, JSON.stringify(userData));

      // Update UI
      applyUserProfile(userData);

      // Success animation
      if (submitBtn) {
        submitBtn.classList.remove("loading");
        submitBtn.classList.add("success");
        if (loginBtnText) loginBtnText.textContent = "Access Granted ✓";
        if (loginBtnIcon) loginBtnIcon.className = "fa-solid fa-check";
      }

      setTimeout(() => {
        if (loginScreen) {
          loginScreen.classList.add("auth-hidden");
          setTimeout(() => {
            loginScreen.style.display = "none";
            if (submitBtn) {
              submitBtn.classList.remove("success");
              if (loginBtnText) loginBtnText.textContent = "Sign In & Enter Command Center";
              if (loginBtnIcon) loginBtnIcon.className = "fa-solid fa-arrow-right-to-bracket";
            }
          }, 400);
        }
      }, 500);
    }

    function showError(msg) {
      if (errorBanner) {
        if (errorText) errorText.textContent = msg;
        errorBanner.style.display = "flex";
      }
      if (loginCard) {
        loginCard.classList.add("shake");
        setTimeout(() => loginCard.classList.remove("shake"), 500);
      }
    }

    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        handleLogin();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", function (e) {
        e.preventDefault();
        handleLogin();
      });
    }

    // Logout button
    if (topLogoutBtn) {
      topLogoutBtn.addEventListener("click", function () {
        localStorage.removeItem(SUPABASE_CONFIG.storageKey);
        if (loginScreen) {
          loginScreen.style.display = "flex";
          void loginScreen.offsetWidth;
          loginScreen.classList.remove("auth-hidden");
        }
      });
    }
  }

  /* ==========================================================
     1. NAVIGATION & SPA ROUTER
     ========================================================== */
  function initNavigation() {
    const navItems = document.querySelectorAll(".side-nav .nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const view = this.getAttribute("data-view");
        navigateTo(view);
      });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");
    if (menuToggle && sidebar) {
      menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
      });
    }

    // Topbar notification & profile buttons
    const topNotif = document.getElementById("topNotificationBtn");
    if (topNotif) {
      topNotif.addEventListener("click", () => navigateTo("alerts"));
    }

    const userProfile = document.getElementById("userProfileBtn");
    if (userProfile) {
      userProfile.addEventListener("click", () => navigateTo("settings"));
    }
  }

  function navigateTo(viewName) {
    if (!viewName) return;
    currentActiveView = viewName;
    window.location.hash = viewName;

    // Update active class on nav links
    document.querySelectorAll(".side-nav .nav-item").forEach(item => {
      if (item.getAttribute("data-view") === viewName) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Update active view section
    document.querySelectorAll(".dashboard-view").forEach(section => {
      section.classList.remove("active");
    });

    const targetSection = document.getElementById(`view-${viewName}`);
    if (targetSection) {
      targetSection.classList.add("active");
    }

    // Close mobile menu if open
    const sidebar = document.querySelector(".sidebar");
    if (sidebar && sidebar.classList.contains("open")) {
      sidebar.classList.remove("open");
    }

    // Leaflet map needs size invalidation when shown from hidden tab
    if (viewName === "live-map" && mapInstance) {
      setTimeout(() => {
        mapInstance.invalidateSize();
      }, 150);
    }
  }

  /* ==========================================================
     2. HOME DASHBOARD
     ========================================================== */
  async function loadHomeDashboard() {
    const summary = await ResQDataService.getDashboardSummary();
    const alerts = await ResQDataService.getAlerts();

    // Populate State Matrix Cards
    const stateMatrixContainer = document.getElementById("homeStateMatrix");
    if (stateMatrixContainer && summary.stateSummaries) {
      stateMatrixContainer.innerHTML = summary.stateSummaries.map(s => {
        const riskLower = s.risk.toLowerCase();
        return `
          <div class="state-matrix-card ${riskLower}" onclick="ResQApp.openStateOnMap('${s.state}')" title="Click to view ${s.state} sensor nodes on Live Map">
            <div class="state-matrix-head">
              <strong>${s.state}</strong>
              <span class="state-risk-tag" style="background: ${s.color}18; color: ${s.color}; border: 1px solid ${s.color}40;">${s.risk}</span>
            </div>
            <div class="state-matrix-progress">
              <div class="state-progress-bar" style="width: ${s.avgProb}%; background: ${s.color};"></div>
            </div>
            <div class="state-matrix-body">
              <span><i class="fa-solid fa-satellite-dish"></i> ${s.activeSensors} Nodes</span>
              <span>Risk: <strong>${s.avgProb}%</strong></span>
            </div>
          </div>
        `;
      }).join("");
    }

    // Populate Active Alerts list
    const alertsMiniContainer = document.getElementById("homeAlertsMiniList");
    if (alertsMiniContainer && alerts) {
      const topAlerts = alerts.slice(0, 3);
      alertsMiniContainer.innerHTML = topAlerts.map(a => `
        <div class="alert-home-card ${a.severity}" onclick="ResQApp.viewAlertOnMap('${a.sensorId}')">
          <div class="alert-home-header">
            <span class="alert-home-badge ${a.severity}">
              <i class="fa-solid ${a.severity === 'critical' ? 'fa-triangle-exclamation' : 'fa-bell'}"></i> ${a.severity.toUpperCase()} ALERT
            </span>
            <span class="alert-home-time"><i class="fa-regular fa-clock"></i> ${a.timestamp}</span>
          </div>
          <h5 class="alert-home-title">${a.title}</h5>
          <div class="alert-home-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${a.location}</span>
            <span class="alert-home-prob">Risk: <strong>${a.probability}%</strong></span>
          </div>
          <div class="alert-home-footer">
            <p class="alert-home-directive"><i class="fa-solid fa-shield-halved"></i> ${a.recommendedAction.substring(0, 85)}...</p>
            <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ResQApp.viewAlertOnMap('${a.sensorId}')">
              View Details <i class="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      `).join("");
    }
  }

  /* ==========================================================
     3. LIVE MAP (LEAFLET.JS FOR NORTHEAST INDIA)
     ========================================================== */
  async function initMap() {
    const mapElement = document.getElementById("leafletMap");
    if (!mapElement) return;

    // Northeast India geographic center coordinates
    const neCenter = [26.2006, 92.9376];
    mapInstance = L.map("leafletMap", {
      zoomControl: true,
      attributionControl: false
    }).setView(neCenter, 7);

    // High clarity CartoDB Voyager map tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
    }).addTo(mapInstance);

    // Fetch stations and create markers
    const stations = await ResQDataService.getStations();
    renderMapMarkers(stations);

    // State filter dropdown
    const stateSelect = document.getElementById("mapStateFilter");
    if (stateSelect) {
      stateSelect.addEventListener("change", function () {
        filterMapMarkers();
      });
    }

    // Risk level filter pills
    const riskPills = document.querySelectorAll(".risk-filter-pills .risk-pill");
    riskPills.forEach(pill => {
      pill.addEventListener("click", function () {
        riskPills.forEach(p => p.classList.remove("active"));
        this.classList.add("active");
        filterMapMarkers();
      });
    });

    // Close inspection drawer handler
    const closeDrawerBtn = document.getElementById("closeDrawerBtn");
    if (closeDrawerBtn) {
      closeDrawerBtn.addEventListener("click", () => {
        document.getElementById("drawerContent").style.display = "none";
        document.getElementById("drawerPlaceholder").style.display = "flex";
        // Clear active marker rings
        document.querySelectorAll(".marker-pin").forEach(p => p.classList.remove("selected"));
      });
    }

    // Reset View Button
    const resetBtn = document.getElementById("mapResetViewBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const stateSelect = document.getElementById("mapStateFilter");
        if (stateSelect) stateSelect.value = "all";

        const riskPills = document.querySelectorAll(".risk-filter-pills .risk-pill");
        riskPills.forEach(p => p.classList.remove("active"));
        if (riskPills[0]) riskPills[0].classList.add("active");

        filterMapMarkers();
        mapInstance.flyTo(neCenter, 7, { duration: 1 });
        showToast("Reset map view to Northeast India region.");
      });
    }

    // Drawer deep analysis button
    const drawerAnalyzeBtn = document.getElementById("drawerAnalyzeBtn");
    if (drawerAnalyzeBtn) {
      drawerAnalyzeBtn.addEventListener("click", () => {
        selectMonitoringStation(currentStationId);
        navigateTo("risk-monitoring");
      });
    }
  }

  function renderMapMarkers(stations) {
    // Clear old markers
    mapMarkers.forEach(m => mapInstance.removeLayer(m.leafletMarker));
    mapMarkers = [];

    stations.forEach(station => {
      // Create custom SVG pulsing pin icon
      const markerHtml = `
        <div class="custom-leaflet-marker" id="pin-${station.id}">
          <div class="marker-pin ${station.riskLevel}">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: "leaflet-custom-pin-wrapper",
        html: markerHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

      const marker = L.marker(station.coordinates, { icon: customIcon }).addTo(mapInstance);

      // Popup Content
      const popupHtml = `
        <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 180px;">
          <strong style="font-size: 0.92rem; color: #0f172a; display: block; margin-bottom: 2px;">${station.name}</strong>
          <span style="font-size: 0.74rem; color: #64748b; display: block; margin-bottom: 6px;"><i class="fa-solid fa-location-dot"></i> ${station.district}, ${station.state}</span>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.76rem; margin-bottom: 8px; background: #f8fafc; padding: 4px 6px; border-radius: 4px;">
            <span>Risk Severity:</span>
            <strong style="color: ${station.riskLevel === 'critical' ? '#dc2626' : station.riskLevel === 'high' ? '#ea580c' : station.riskLevel === 'moderate' ? '#d97706' : '#059669'}; text-transform: uppercase;">${station.riskLevel} (${station.probability}%)</strong>
          </div>
          <button style="width: 100%; background: #059669; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; cursor: pointer; font-weight: 700; font-family: inherit;" onclick="ResQApp.inspectStationOnMap('${station.id}')">Inspect Telemetry &rarr;</button>
        </div>
      `;
      marker.bindPopup(popupHtml);

      // Click on marker directly inspects station in drawer
      marker.on("click", () => {
        inspectStation(station);
      });

      mapMarkers.push({
        data: station,
        leafletMarker: marker
      });
    });
  }

  function filterMapMarkers() {
    const selectedState = document.getElementById("mapStateFilter").value;
    const activeRiskPill = document.querySelector(".risk-filter-pills .risk-pill.active");
    const selectedRisk = activeRiskPill ? activeRiskPill.getAttribute("data-risk") : "all";

    let visibleMarkers = [];

    mapMarkers.forEach(item => {
      const stateMatch = selectedState === "all" || item.data.state === selectedState;
      const riskMatch = selectedRisk === "all" || item.data.riskLevel === selectedRisk;

      if (stateMatch && riskMatch) {
        if (!mapInstance.hasLayer(item.leafletMarker)) {
          mapInstance.addLayer(item.leafletMarker);
        }
        visibleMarkers.push(item);
      } else {
        if (mapInstance.hasLayer(item.leafletMarker)) {
          mapInstance.removeLayer(item.leafletMarker);
        }
      }
    });

    // If state filtered, pan to first matching station
    if (selectedState !== "all" && visibleMarkers.length > 0) {
      mapInstance.flyTo(visibleMarkers[0].data.coordinates, 8, { duration: 1.2 });
    }
  }

  function inspectStation(station) {
    currentStationId = station.id;
    document.getElementById("drawerPlaceholder").style.display = "none";
    const content = document.getElementById("drawerContent");
    content.style.display = "block";

    // Highlight active pin on map
    document.querySelectorAll(".marker-pin").forEach(p => p.classList.remove("selected"));
    const activePin = document.querySelector(`#pin-${station.id} .marker-pin`);
    if (activePin) activePin.classList.add("selected");

    // Populate drawer elements
    const badge = document.getElementById("drawerRiskBadge");
    badge.textContent = `${station.riskLevel.toUpperCase()} RISK`;
    badge.className = `drawer-badge ${station.riskLevel}`;

    document.getElementById("drawerStationName").textContent = station.name;
    document.getElementById("drawerStationLocation").innerHTML = `<i class="fa-solid fa-location-dot"></i> ${station.district}, ${station.state} &bull; ${station.elevation} &bull; Coordinates: ${station.coordinates[0]}° N, ${station.coordinates[1]}° E`;
    document.getElementById("drawerProbVal").textContent = `${station.probability}%`;
    document.getElementById("drawerProbFill").style.width = `${station.probability}%`;

    document.getElementById("drawerRainfall").textContent = `${station.rainfall24h} mm`;
    document.getElementById("drawerMoisture").textContent = `${station.soilMoisture}%`;
    document.getElementById("drawerDisplacement").textContent = `${station.groundDisplacement} mm/h`;
    document.getElementById("drawerSlope").textContent = station.slopeAngle;
    document.getElementById("drawerPore").textContent = station.porePressure;
    document.getElementById("drawerTemp").textContent = `${station.temperature}°C`;

    const updatedEl = document.getElementById("drawerLastUpdated");
    if (updatedEl) updatedEl.textContent = `${station.lastUpdated} (Node #${station.id})`;

    document.getElementById("drawerAdvisory").textContent = station.advisory;
  }

  function openStateOnMap(stateName) {
    navigateTo("live-map");
    const stateSelect = document.getElementById("mapStateFilter");
    if (stateSelect) {
      stateSelect.value = stateName;
      filterMapMarkers();
    }
  }

  /* ==========================================================
     4. RISK MONITORING & TELEMETRY CHARTS
     ========================================================== */
  async function initRiskMonitoring() {
    const stations = await ResQDataService.getStations();
    const selector = document.getElementById("monitoringStationSelect");
    if (selector) {
      selector.innerHTML = stations.map(s => `<option value="${s.id}">${s.name} (${s.district}, ${s.state})</option>`).join("");
      selector.addEventListener("change", function () {
        selectMonitoringStation(this.value);
      });
    }

    // Time pill filters
    const timePills = document.querySelectorAll(".monitoring-time-pills .time-pill");
    timePills.forEach(pill => {
      pill.addEventListener("click", function () {
        timePills.forEach(p => p.classList.remove("active"));
        this.classList.add("active");
        showToast(`Loaded ${this.textContent} telemetry window.`);
      });
    });

    // Populate High-Risk Locations Table
    renderMonitoringLocationsTable(stations);

    await selectMonitoringStation(stations[0].id);
  }

  function renderMonitoringLocationsTable(stations) {
    const tbody = document.getElementById("monitoringLocationsTableBody");
    if (!tbody) return;

    // Sort stations by probability descending
    const sorted = [...stations].sort((a, b) => b.probability - a.probability);

    tbody.innerHTML = sorted.map(s => {
      const riskBadgeClass = s.riskLevel === "critical" ? "badge-danger" : s.riskLevel === "high" ? "badge-warning" : s.riskLevel === "moderate" ? "badge-warning" : "badge-neutral";
      const riskColor = s.riskLevel === "critical" ? "#dc2626" : s.riskLevel === "high" ? "#ea580c" : s.riskLevel === "moderate" ? "#d97706" : "#059669";

      return `
        <tr onclick="ResQApp.inspectStationFromTable('${s.id}')" style="cursor: pointer;" class="${s.id === currentStationId ? 'active-station-row' : ''}">
          <td>
            <strong>${s.name}</strong>
            <small style="display: block; color: #64748b;"><i class="fa-solid fa-location-dot"></i> ${s.district} &bull; ${s.elevation}</small>
          </td>
          <td><strong>${s.state}</strong></td>
          <td><span class="kpi-badge ${riskBadgeClass}"><i class="fa-solid fa-circle" style="font-size: 0.5rem; color: ${riskColor};"></i> ${s.riskLevel.toUpperCase()}</span></td>
          <td><strong style="color: ${riskColor}; font-size: 0.95rem;">${s.probability}%</strong></td>
          <td><span style="font-size: 0.78rem; color: #475569;">${s.riskFactor || 'High soil moisture & steep slope'}</span></td>
          <td>
            <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); ResQApp.inspectStationFromTable('${s.id}')">
              Select <i class="fa-solid fa-arrow-right"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function selectMonitoringStation(stationId) {
    currentStationId = stationId;
    const station = await ResQDataService.getStationById(stationId);
    const telemetry = await ResQDataService.getTelemetryHistory(stationId);

    // Update station selector sync
    const selector = document.getElementById("monitoringStationSelect");
    if (selector && selector.value !== stationId) {
      selector.value = stationId;
    }

    // Highlight row in table
    const stations = await ResQDataService.getStations();
    renderMonitoringLocationsTable(stations);

    // Update Summary Banner
    const banner = document.getElementById("monitoringStationBanner");
    if (banner) {
      const riskColor = station.riskLevel === 'critical' ? '#dc2626' : station.riskLevel === 'high' ? '#ea580c' : station.riskLevel === 'moderate' ? '#d97706' : '#059669';
      const riskBadgeClass = station.riskLevel === 'critical' ? 'danger' : station.riskLevel === 'high' ? 'orange' : station.riskLevel === 'moderate' ? 'warning' : 'emerald';

      banner.innerHTML = `
        <div class="monitoring-station-topbar">
          <div class="station-meta-info">
            <span class="station-id-tag"><i class="fa-solid fa-satellite-dish"></i> Sensor Node #${station.id} &bull; Active Array</span>
            <h3 class="station-title">${station.name}</h3>
            <p class="station-sub"><i class="fa-solid fa-location-dot"></i> ${station.district}, ${station.state} &bull; Elevation: ${station.elevation} &bull; Slope Angle: ${station.slopeAngle} &bull; Status: <span class="live-status-txt"><span class="pulse-dot-sm"></span> Operational</span></p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="ResQApp.openStateOnMap('${station.state}')">
            <i class="fa-solid fa-map-location-dot"></i> View on Live Map
          </button>
        </div>

        <div class="monitoring-overview-grid">
          <!-- Big Risk Score Card -->
          <div class="monitoring-score-box ${station.riskLevel}">
            <div class="score-header">
              <span class="score-title">AI Landslide Risk Assessment</span>
              <span class="kpi-badge badge-danger" style="background: ${riskColor}18; color: ${riskColor}; border: 1px solid ${riskColor}40;">
                <i class="fa-solid fa-triangle-exclamation"></i> ${station.riskLevel.toUpperCase()} LEVEL
              </span>
            </div>
            <div class="score-val-row">
              <span class="score-big" style="color: ${riskColor};">${station.probability}%</span>
              <span class="score-status-desc">${station.probability >= 80 ? 'Imminent Threat &bull; Immediate Evacuation Alert' : station.probability >= 65 ? 'Elevated Hazard &bull; Active Monitoring' : 'Stable Geological Conditions'}</span>
            </div>
            <div class="score-progress-bar">
              <div class="score-progress-fill" style="width: ${station.probability}%; background: ${riskColor};"></div>
            </div>
            <p class="score-meta"><i class="fa-solid fa-shield-halved"></i> ${station.advisory}</p>
          </div>

          <!-- 4 Environmental Indicator Cards -->
          <div class="monitoring-metrics-strip">
            <div class="m-metric-card">
              <div class="m-metric-head">
                <span><i class="fa-solid fa-cloud-showers-heavy" style="color: #0284c7;"></i> 24h Rainfall</span>
                <span class="m-metric-trend danger">+42% Safe</span>
              </div>
              <strong class="m-metric-val">${station.rainfall24h} <small>mm</small></strong>
              <p class="m-metric-meta">Safe threshold: 100 mm</p>
            </div>

            <div class="m-metric-card">
              <div class="m-metric-head">
                <span><i class="fa-solid fa-droplet" style="color: #059669;"></i> Soil Moisture</span>
                <span class="m-metric-trend warning">Critical</span>
              </div>
              <strong class="m-metric-val">${station.soilMoisture}%</strong>
              <p class="m-metric-meta">Pore limit: 80.0%</p>
            </div>

            <div class="m-metric-card">
              <div class="m-metric-head">
                <span><i class="fa-solid fa-chart-line" style="color: #9333ea;"></i> Displacement</span>
                <span class="m-metric-trend danger">Creep</span>
              </div>
              <strong class="m-metric-val">${station.groundDisplacement} <small>mm/h</small></strong>
              <p class="m-metric-meta">Borehole Inclinometer</p>
            </div>

            <div class="m-metric-card">
              <div class="m-metric-head">
                <span><i class="fa-solid fa-temperature-half" style="color: #2563eb;"></i> Temp & Pore</span>
                <span class="m-metric-trend neutral">${station.temperature}°C</span>
              </div>
              <strong class="m-metric-val">${station.porePressure}</strong>
              <p class="m-metric-meta">Subsurface Piezometer</p>
            </div>
          </div>
        </div>
      `;
    }

    // Render 4 Telemetry Charts
    renderTelemetryCharts(telemetry);
  }

  function renderTelemetryCharts(data) {
    // 1. Rainfall Chart
    renderChart("rainfallChart", {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Cumulative Rainfall (mm)",
            data: data.rainfall,
            borderColor: "#0891b2",
            backgroundColor: "rgba(8, 145, 178, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
          },
          {
            label: "Safe Rainfall Threshold (100 mm)",
            data: data.rainfallThreshold,
            borderColor: "#ef4444",
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          }
        ]
      },
      options: getCommonChartOptions("Precipitation (mm)")
    });

    // 2. Soil Moisture Chart
    renderChart("soilMoistureChart", {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Soil Saturation (%)",
            data: data.soilMoisture,
            borderColor: "#059669",
            backgroundColor: "rgba(5, 150, 105, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
          },
          {
            label: "Critical Saturation Limit (80%)",
            data: data.moistureCriticalLevel,
            borderColor: "#f97316",
            borderDash: [6, 4],
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
          }
        ]
      },
      options: getCommonChartOptions("Moisture (%)")
    });

    // 3. Ground Displacement Chart
    renderChart("displacementChart", {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Inclinometer Drift Velocity (mm/h)",
            data: data.groundDisplacement,
            borderColor: "#9333ea",
            backgroundColor: "rgba(147, 51, 234, 0.15)",
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
          }
        ]
      },
      options: getCommonChartOptions("Velocity (mm/h)")
    });

    // 4. AI Probability Chart
    renderChart("probabilityChart", {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Landslide Risk Probability (%)",
            data: data.probability,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderWidth: 3,
            fill: true,
            tension: 0.35,
          }
        ]
      },
      options: getCommonChartOptions("Probability (%)")
    });
  }

  function renderChart(canvasId, config) {
    if (monitoringCharts[canvasId]) {
      monitoringCharts[canvasId].destroy();
    }
    const ctx = document.getElementById(canvasId);
    if (ctx) {
      monitoringCharts[canvasId] = new Chart(ctx, config);
    }
  }

  function getCommonChartOptions(yAxisTitle) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            boxWidth: 12,
            font: { family: "Inter", size: 11, weight: "600" },
            color: "#334155"
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleFont: { family: "Inter", size: 12, weight: "700" },
          bodyFont: { family: "Inter", size: 12 },
          padding: 10,
          cornerRadius: 8,
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(203, 213, 225, 0.35)" },
          ticks: { font: { family: "Inter", size: 11 }, color: "#64748b" }
        },
        y: {
          grid: { color: "rgba(203, 213, 225, 0.35)" },
          ticks: { font: { family: "Inter", size: 11 }, color: "#64748b" },
          title: { display: true, text: yAxisTitle, font: { family: "Inter", size: 11, weight: "600" }, color: "#64748b" }
        }
      }
    };
  }

  /* ==========================================================
     5. ALERTS CENTER
     ========================================================== */
  // Track which alerts have been "read"
  const readAlerts = new Set();

  async function initAlerts() {
    const alerts = await ResQDataService.getAlerts();

    // Populate summary KPI counts
    const criticalCount = alerts.filter(a => a.severity === "critical").length;
    const highCount = alerts.filter(a => a.severity === "high").length;
    const moderateCount = alerts.filter(a => a.severity === "moderate").length;
    const lowCount = alerts.filter(a => a.severity === "low").length;

    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setTxt("summCritical", criticalCount);
    setTxt("summHigh", highCount);
    setTxt("summModerate", moderateCount);
    setTxt("summTotal", alerts.length);

    // Update filter counts
    setTxt("countAllAlerts", alerts.length);
    setTxt("countCriticalAlerts", criticalCount);
    setTxt("countHighAlerts", highCount);
    setTxt("countModerateAlerts", moderateCount);
    setTxt("countLowAlerts", lowCount);

    renderAlertsFeed(alerts);

    // Filter buttons
    const filterBtns = document.querySelectorAll(".alert-severity-filters .alert-filter-btn");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", async function () {
        filterBtns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        const severity = this.getAttribute("data-severity");
        const query = document.getElementById("alertSearchInput").value;
        const filtered = await ResQDataService.getAlerts(severity, query);
        renderAlertsFeed(filtered);
      });
    });

    // Search input
    const searchInput = document.getElementById("alertSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", async function () {
        const activeBtn = document.querySelector(".alert-severity-filters .alert-filter-btn.active");
        const severity = activeBtn ? activeBtn.getAttribute("data-severity") : "all";
        const filtered = await ResQDataService.getAlerts(severity, this.value);
        renderAlertsFeed(filtered);
      });
    }
  }

  function renderAlertsFeed(alertsList) {
    const container = document.getElementById("alertsFeedContainer");
    if (!container) return;

    if (alertsList.length === 0) {
      container.innerHTML = `
        <div class="glass-card alerts-empty-state">
          <i class="fa-regular fa-bell-slash"></i>
          <h4>No Alerts Found</h4>
          <p>No active warnings match the current filter criteria. All monitored sensor arrays are within safe operational thresholds.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = alertsList.map((a, idx) => {
      const isUnread = !readAlerts.has(a.id);
      const statusClass = a.status ? a.status.toLowerCase().replace(/\s+/g, "") : "";
      return `
      <div class="alert-feed-card ${isUnread ? 'unread' : ''}" id="alert-card-${a.id}">
        <div class="alert-feed-stripe ${a.severity}"></div>
        
        <div class="alert-feed-main">
          <h4>${a.title}</h4>
          <div class="alert-feed-meta-row">
            <span><i class="fa-solid fa-location-dot"></i> ${a.location}</span>
            <span><i class="fa-solid fa-crosshairs"></i> ${a.coordinates}</span>
            <span><i class="fa-regular fa-clock"></i> ${a.timestamp}</span>
            <span class="alert-status-tag ${statusClass}">${a.status}</span>
          </div>
          <p class="alert-feed-desc">${a.recommendedAction}</p>
        </div>

        <div class="alert-feed-side">
          <span class="alert-prob-pill ${a.severity}">Risk: ${a.probability}%</span>
          <div class="alert-feed-btns">
            <button class="btn btn-sm btn-primary" onclick="ResQApp.viewAlertDetails('${a.id}')"><i class="fa-solid fa-eye"></i> Details</button>
            <button class="btn btn-sm btn-secondary" onclick="ResQApp.viewAlertOnMap('${a.sensorId}')"><i class="fa-solid fa-map"></i> Map</button>
          </div>
        </div>
      </div>
    `}).join("");
  }

  async function viewAlertDetails(alertId) {
    const alerts = await ResQDataService.getAlerts();
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    // Mark alert as read
    readAlerts.add(alertId);
    const card = document.getElementById(`alert-card-${alertId}`);
    if (card) card.classList.remove("unread");

    // Populate modal header
    const sevBadge = document.getElementById("alertModalSeverity");
    if (sevBadge) {
      sevBadge.textContent = alert.severity.toUpperCase();
      sevBadge.className = `severity-badge ${alert.severity}`;
    }
    const statusEl = document.getElementById("alertModalStatus");
    if (statusEl) statusEl.textContent = alert.status || "Active";

    // Populate body fields
    const setField = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setField("alertModalTitle", alert.title);
    setField("alertModalId", alert.id);
    setField("alertModalLocation", alert.location);
    setField("alertModalCoords", alert.coordinates);
    setField("alertModalTime", alert.timeExact || alert.timestamp);
    setField("alertModalProb", alert.probability + "%");

    // Get linked station telemetry
    const stations = await ResQDataService.getStations();
    const station = stations.find(s => s.id === alert.sensorId);
    if (station) {
      setField("alertTelRainfall", station.rainfall24h + " mm");
      setField("alertTelSoil", station.soilMoisture + "%");
      setField("alertTelDisplacement", station.groundDisplacement + " mm/h");
      setField("alertTelTemp", station.temperature + "°C");
    } else {
      setField("alertTelRainfall", "—");
      setField("alertTelSoil", "—");
      setField("alertTelDisplacement", "—");
      setField("alertTelTemp", "—");
    }

    // Recommended action
    const actionBox = document.getElementById("alertModalAction");
    if (actionBox) actionBox.textContent = alert.recommendedAction;

    // Wire up Map button
    const mapBtn = document.getElementById("alertModalMapBtn");
    if (mapBtn) {
      mapBtn.onclick = function () {
        closeAlertModal();
        viewAlertOnMap(alert.sensorId);
      };
    }

    // Show overlay
    const overlay = document.getElementById("alertDetailOverlay");
    if (overlay) overlay.classList.add("visible");
  }

  function closeAlertModal() {
    const overlay = document.getElementById("alertDetailOverlay");
    if (overlay) overlay.classList.remove("visible");
  }

  function broadcastAlert(alertId) {
    showToast(`Emergency Broadcast initiated for alert ${alertId}. SMS & Siren warnings dispatched to local SDMA.`);
  }

  function viewAlertOnMap(sensorId) {
    navigateTo("live-map");
    const found = mapMarkers.find(m => m.data.id === sensorId);
    if (found && mapInstance) {
      mapInstance.flyTo(found.data.coordinates, 10, { duration: 1 });
      inspectStation(found.data);
      found.leafletMarker.openPopup();
    }
  }

  /* ==========================================================
     5.5. RESPONSE & RESCUE COORDINATOR
     ========================================================== */
  let currentSelectedIncidentId = "INC-2026-101";
  let activeIncidentSeverityFilter = "all";
  let activeIncidentStatusFilter = "all";
  let currentIncidentSearchQuery = "";

  async function initResponseCenter() {
    const summary = await ResQDataService.getResponseSummary();
    const incidents = await ResQDataService.getIncidents();

    // Populate KPI summary numbers
    const kpiIncidents = document.getElementById("respKpiIncidents");
    if (kpiIncidents) kpiIncidents.textContent = summary.activeIncidents < 10 ? `0${summary.activeIncidents}` : summary.activeIncidents;

    const kpiTeams = document.getElementById("respKpiTeams");
    if (kpiTeams) kpiTeams.textContent = summary.rescueTeams < 10 ? `0${summary.rescueTeams}` : summary.rescueTeams;

    const kpiPersonnel = document.getElementById("respKpiPersonnel");
    if (kpiPersonnel) kpiPersonnel.textContent = summary.personnelDeployed;

    const kpiResources = document.getElementById("respKpiResources");
    if (kpiResources) kpiResources.textContent = summary.resourcesRequired < 10 ? `0${summary.resourcesRequired}` : summary.resourcesRequired;

    // Filter counts
    const countAll = document.getElementById("countAllIncidents");
    if (countAll) countAll.textContent = incidents.length;

    const countCritical = document.getElementById("countCriticalIncidents");
    if (countCritical) countCritical.textContent = incidents.filter(i => i.severity === "critical").length;

    const countHigh = document.getElementById("countHighIncidents");
    if (countHigh) countHigh.textContent = incidents.filter(i => i.severity === "high").length;

    const countModerate = document.getElementById("countModerateIncidents");
    if (countModerate) countModerate.textContent = incidents.filter(i => i.severity === "moderate").length;

    const countLow = document.getElementById("countLowIncidents");
    if (countLow) countLow.textContent = incidents.filter(i => i.severity === "low").length;

    // Render lists
    await renderIncidentsFeed();
    await renderRescueTeams();
    await renderEmergencyResources();

    // Setup event listeners for search and filters
    const searchInput = document.getElementById("incidentSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", function (e) {
        currentIncidentSearchQuery = e.target.value.trim();
        renderIncidentsFeed();
      });
    }

    const filterBtns = document.querySelectorAll(".incident-filter-btn");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", function () {
        filterBtns.forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        activeIncidentSeverityFilter = this.getAttribute("data-severity");
        renderIncidentsFeed();
      });
    });

    // Close modal on click outside
    const modalOverlay = document.getElementById("incidentModalOverlay");
    if (modalOverlay) {
      modalOverlay.addEventListener("click", function (e) {
        if (e.target === this) {
          closeIncidentModal();
        }
      });
    }
  }

  async function renderIncidentsFeed() {
    const container = document.getElementById("responseIncidentsFeed");
    if (!container) return;

    const incidents = await ResQDataService.getIncidents(
      activeIncidentSeverityFilter,
      activeIncidentStatusFilter,
      currentIncidentSearchQuery
    );

    if (!incidents || incidents.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
          <i class="fa-solid fa-clipboard-check" style="font-size: 2.2rem; margin-bottom: 10px; color: #cbd5e1; display: block;"></i>
          <strong>No incidents matching current criteria</strong>
          <p style="font-size: 0.8rem; margin-top: 4px;">Try modifying your search keywords or severity filter.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = incidents.map(inc => {
      const sevClass = inc.severity;
      const statusPillClass =
        inc.responseStatus === "Rescue In Progress" ? "status-in-progress" :
          inc.responseStatus === "Evacuation In Progress" ? "status-in-progress" :
            inc.responseStatus === "Team En Route" ? "status-en-route" :
              inc.responseStatus === "Team Assigned" ? "status-assigned" :
                inc.responseStatus === "Resolved" ? "status-resolved" : "status-awaiting";

      return `
        <div class="incident-card ${sevClass}" onclick="ResQApp.openIncidentModal('${inc.id}')">
          <div class="incident-card-head">
            <div class="incident-card-tags">
              <span class="incident-id-badge">${inc.id}</span>
              <span class="incident-type-tag"><i class="fa-solid ${inc.disasterType === 'Landslide' ? 'fa-mountain' : inc.disasterType === 'Flash Flood' ? 'fa-water' : 'fa-wave-square'}"></i> ${inc.disasterType}</span>
              <span class="severity-badge ${sevClass}">${inc.severity.toUpperCase()}</span>
            </div>
            <span class="incident-prob-badge ${sevClass}"><i class="fa-solid fa-gauge-high"></i> ${inc.riskScore}% Risk</span>
          </div>

          <h4 class="incident-card-title">${inc.title}</h4>

          <div class="incident-card-location">
            <i class="fa-solid fa-location-dot" style="color: #0284c7;"></i>
            <span>${inc.location}, ${inc.district} (${inc.state})</span>
            <span style="color: var(--text-muted); font-size: 0.74rem;">&bull; ${inc.time}</span>
          </div>

          <div class="incident-card-telemetry-row">
            <span><i class="fa-solid fa-cloud-showers-heavy"></i> Rain: <strong>${inc.rainfall}</strong></span>
            <span><i class="fa-solid fa-droplet"></i> Moisture: <strong>${inc.soilMoisture}</strong></span>
            <span><i class="fa-solid fa-chart-line"></i> Creep: <strong>${inc.groundMovement}</strong></span>
            <span><i class="fa-solid fa-users"></i> Pop: <strong>${inc.estimatedPopExposed}</strong></span>
          </div>

          <div class="incident-card-foot">
            <span class="incident-status-pill ${statusPillClass}">
              <i class="fa-solid ${inc.responseStatus === 'Resolved' ? 'fa-circle-check' : 'fa-circle-dot'}"></i>
              ${inc.responseStatus}
            </span>

            <div class="incident-card-actions">
              <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); ResQApp.viewIncidentOnMap('${inc.id}')" title="Center on Map">
                <i class="fa-solid fa-map-location-dot"></i> Map
              </button>
              <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); ResQApp.openIncidentModal('${inc.id}')">
                Details <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  async function renderRescueTeams() {
    const container = document.getElementById("rescueTeamsList");
    if (!container) return;

    const teams = await ResQDataService.getRescueTeams();
    container.innerHTML = teams.map(tm => {
      const statusClass = tm.statusType;
      return `
        <div class="rescue-team-card">
          <div class="rescue-team-head">
            <h5 class="rescue-team-title">${tm.name}</h5>
            <span class="team-status-tag ${statusClass}">${tm.status}</span>
          </div>
          <div class="rescue-team-body">
            <span><i class="fa-solid fa-location-crosshairs"></i> ${tm.location}</span>
            <span><strong>${tm.personnel}</strong> Responders</span>
          </div>
          <div class="rescue-team-foot">
            <span><i class="fa-solid fa-user-shield"></i> ${tm.lead}</span>
            <span><i class="fa-solid fa-radio"></i> ${tm.comms}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  async function renderEmergencyResources() {
    const container = document.getElementById("emergencyResourcesList");
    if (!container) return;

    const resources = await ResQDataService.getEmergencyResources();
    container.innerHTML = resources.map(res => {
      return `
        <div class="emergency-resource-card">
          <div class="emergency-res-icon">
            <i class="fa-solid ${res.icon}"></i>
          </div>
          <div class="emergency-res-info">
            <div class="emergency-res-head">
              <h5 class="emergency-res-title">${res.category}</h5>
              <span class="res-status-pill ${res.statusType}">${res.status}</span>
            </div>
            <p class="emergency-res-details">Available: <strong>${res.available}</strong> &bull; Req: <strong>${res.required}</strong></p>
            <p class="emergency-res-hub"><i class="fa-solid fa-warehouse"></i> ${res.hub}</p>
          </div>
        </div>
      `;
    }).join("");
  }

  function filterIncidentsByStatus(status) {
    activeIncidentStatusFilter = status;
    renderIncidentsFeed();
  }

  async function openIncidentModal(incidentId) {
    const incident = await ResQDataService.getIncidentById(incidentId);
    if (!incident) return;

    currentSelectedIncidentId = incident.id;

    // Header values
    const incModalId = document.getElementById("incModalId");
    if (incModalId) incModalId.textContent = `${incident.id} • Registered ${incident.timeExact}`;

    const incModalTitle = document.getElementById("incModalTitle");
    if (incModalTitle) incModalTitle.textContent = incident.title;

    const incModalSeverity = document.getElementById("incModalSeverity");
    if (incModalSeverity) {
      incModalSeverity.textContent = incident.severity.toUpperCase();
      incModalSeverity.className = `severity-badge ${incident.severity}`;
    }

    const incModalType = document.getElementById("incModalType");
    if (incModalType) incModalType.textContent = incident.disasterType;

    const incModalStatus = document.getElementById("incModalStatus");
    if (incModalStatus) incModalStatus.textContent = incident.responseStatus;

    // 6-Stage Visual Response Workflow Timeline
    const timelineContainer = document.getElementById("incModalWorkflowTimeline");
    if (timelineContainer) {
      const stages = [
        { label: "Alert Received", icon: "1" },
        { label: "Incident Confirmed", icon: "2" },
        { label: "Team Assigned", icon: "3" },
        { label: "Team En Route", icon: "4" },
        { label: "Rescue Operation", icon: "5" },
        { label: "Incident Resolved", icon: "6" }
      ];

      timelineContainer.innerHTML = stages.map((st, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < incident.workflowStage;
        const isActive = stepNum === incident.workflowStage;
        const stepClass = isCompleted ? "completed" : isActive ? "active" : "pending";

        return `
          <div class="workflow-step ${stepClass}">
            <div class="workflow-dot">${isCompleted ? '<i class="fa-solid fa-check"></i>' : stepNum}</div>
            <span class="workflow-label">${st.label}</span>
          </div>
        `;
      }).join("");
    }

    // Location & Geo-Metadata
    const incModalLoc = document.getElementById("incModalLocation");
    if (incModalLoc) incModalLoc.textContent = `${incident.location}, ${incident.district} (${incident.state})`;

    const incModalCoords = document.getElementById("incModalCoords");
    if (incModalCoords) incModalCoords.textContent = `${incident.coordinates[0].toFixed(4)}° N, ${incident.coordinates[1].toFixed(4)}° E`;

    const incModalRiskScore = document.getElementById("incModalRiskScore");
    if (incModalRiskScore) incModalRiskScore.textContent = `${incident.riskScore}% Disaster Probability`;

    const incModalExposed = document.getElementById("incModalExposed");
    if (incModalExposed) incModalExposed.textContent = incident.estimatedPopExposed;

    // Telemetry
    const incTelRain = document.getElementById("incTelRainfall");
    if (incTelRain) incTelRain.textContent = incident.rainfall;

    const incTelSoil = document.getElementById("incTelSoil");
    if (incTelSoil) incTelSoil.textContent = incident.soilMoisture;

    const incTelDisp = document.getElementById("incTelDisplacement");
    if (incTelDisp) incTelDisp.textContent = incident.groundMovement;

    const incTelArea = document.getElementById("incTelArea");
    if (incTelArea) incTelArea.textContent = incident.affectedArea;

    // Team box
    const incModalTeamName = document.getElementById("incModalTeamName");
    if (incModalTeamName) incModalTeamName.textContent = incident.assignedTeam;

    const incModalTeamLead = document.getElementById("incModalTeamLead");
    if (incModalTeamLead) incModalTeamLead.textContent = incident.teamLead;

    const incModalTeamComms = document.getElementById("incModalTeamComms");
    if (incModalTeamComms) incModalTeamComms.textContent = `Updated: ${incident.lastUpdated}`;

    const incModalTeamStatus = document.getElementById("incModalTeamStatus");
    if (incModalTeamStatus) incModalTeamStatus.textContent = incident.responseStatus;

    // Notes
    const incModalNotes = document.getElementById("incModalNotes");
    if (incModalNotes) incModalNotes.textContent = incident.notes;

    // Show modal
    const overlay = document.getElementById("incidentModalOverlay");
    if (overlay) overlay.classList.add("active");
  }

  function closeIncidentModal() {
    const overlay = document.getElementById("incidentModalOverlay");
    if (overlay) overlay.classList.remove("active");
  }

  async function viewIncidentOnMap(incidentId) {
    const incident = await ResQDataService.getIncidentById(incidentId);
    if (!incident) return;

    navigateTo("live-map");

    if (mapInstance && incident.coordinates) {
      setTimeout(() => {
        mapInstance.flyTo(incident.coordinates, 11, { duration: 1.2 });
        L.popup()
          .setLatLng(incident.coordinates)
          .setContent(`
            <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 200px;">
              <span style="font-size: 0.7rem; font-weight: 700; color: #dc2626; text-transform: uppercase;">● Active Incident (${incident.severity.toUpperCase()})</span>
              <h4 style="font-size: 0.95rem; font-weight: 800; margin: 3px 0; color: #0f172a;">${incident.title}</h4>
              <p style="font-size: 0.78rem; color: #475569; margin-bottom: 6px;">${incident.location}, ${incident.district}</p>
              <div style="font-size: 0.74rem; background: #f8fafc; padding: 4px 8px; border-radius: 4px;">
                Status: <strong>${incident.responseStatus}</strong><br>
                Team: <strong>${incident.assignedTeam}</strong>
              </div>
            </div>
          `)
          .openOn(mapInstance);
      }, 350);
    }
  }

  function viewIncidentOnMapFromModal() {
    closeIncidentModal();
    if (currentSelectedIncidentId) {
      viewIncidentOnMap(currentSelectedIncidentId);
    }
  }

  /* ==========================================================
     6. REPORTS & DISASTER INTELLIGENCE
     ========================================================== */
  const stateDistrictMap = {
    "all": ["All Districts", "Dima Hasao", "North Sikkim", "East Khasi Hills", "Noney", "Tawang", "Kohima", "Aizawl", "North Tripura"],
    "Assam": ["All Districts in Assam", "Dima Hasao", "Karimganj", "Cachar", "Hailakandi", "Kamrup Metro", "Goalpara"],
    "Sikkim": ["All Districts in Sikkim", "North Sikkim", "South Sikkim", "East Sikkim", "West Sikkim", "Pakyong"],
    "Meghalaya": ["All Districts in Meghalaya", "East Khasi Hills", "West Khasi Hills", "Ri-Bhoi", "South Garo Hills"],
    "Manipur": ["All Districts in Manipur", "Noney", "Tamenglong", "Churachandpur", "Imphal West", "Senapati"],
    "Arunachal Pradesh": ["All Districts in Arunachal", "Tawang", "West Kameng", "Lower Subansiri", "Longding", "Papum Pare"],
    "Nagaland": ["All Districts in Nagaland", "Kohima", "Chumukedima", "Dimapur", "Mokokchung", "Wokha"],
    "Mizoram": ["All Districts in Mizoram", "Aizawl", "Lunglei", "Champhai", "Kolasib", "Serchhip"],
    "Tripura": ["All Districts in Tripura", "North Tripura", "Dhalai", "Unakoti", "West Tripura"]
  };

  async function initReports() {
    const data = await ResQDataService.getReportsData();

    // 1. Monthly Landslides vs Rainfall Dual Chart
    const ctxHist = document.getElementById("historicalTrendChart");
    if (ctxHist) {
      if (reportsCharts.historical) reportsCharts.historical.destroy();
      reportsCharts.historical = new Chart(ctxHist, {
        type: "bar",
        data: {
          labels: data.months,
          datasets: [
            {
              type: "bar",
              label: "Landslide Incidents Count",
              data: data.landslidesByMonth,
              backgroundColor: "rgba(220, 38, 38, 0.75)",
              borderColor: "#dc2626",
              borderWidth: 1,
              borderRadius: 6,
              yAxisID: "y",
            },
            {
              type: "line",
              label: "Monsoon Precipitation (mm)",
              data: data.rainfallByMonth,
              borderColor: "#0891b2",
              backgroundColor: "rgba(8, 145, 178, 0.12)",
              borderWidth: 2.8,
              pointBackgroundColor: "#0891b2",
              pointRadius: 4,
              pointHoverRadius: 6,
              tension: 0.38,
              fill: true,
              yAxisID: "y1",
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                font: { family: "Inter", size: 11, weight: "700" },
                boxWidth: 12,
                color: "#334155"
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              padding: 10,
              titleFont: { family: "Inter", size: 12, weight: "700" },
              bodyFont: { family: "Inter", size: 11 }
            }
          },
          scales: {
            x: {
              grid: { color: "rgba(226, 232, 240, 0.6)" },
              ticks: { font: { family: "Inter", size: 11, weight: "600" }, color: "#64748b" }
            },
            y: {
              type: "linear",
              position: "left",
              grid: { color: "rgba(226, 232, 240, 0.6)" },
              title: { display: true, text: "Incident Count", font: { family: "Inter", size: 11, weight: "700" }, color: "#dc2626" },
              ticks: { color: "#64748b", font: { family: "Inter", size: 10 } }
            },
            y1: {
              type: "linear",
              position: "right",
              grid: { drawOnChartArea: false },
              title: { display: true, text: "Precipitation (mm)", font: { family: "Inter", size: 11, weight: "700" }, color: "#0891b2" },
              ticks: { color: "#64748b", font: { family: "Inter", size: 10 } }
            }
          }
        }
      });
    }

    // 2. Incidents by State Horizontal Bar Chart
    const ctxState = document.getElementById("stateDistributionChart");
    if (ctxState) {
      if (reportsCharts.state) reportsCharts.state.destroy();
      reportsCharts.state = new Chart(ctxState, {
        type: "bar",
        data: {
          labels: data.incidentsByState.labels,
          datasets: [{
            label: "Recorded Hazard Events",
            data: data.incidentsByState.counts,
            backgroundColor: [
              "#dc2626", // Assam (Critical)
              "#dc2626", // Sikkim (Critical)
              "#ea580c", // Meghalaya (High)
              "#ea580c", // Manipur (High)
              "#d97706", // Arunachal (Moderate)
              "#d97706", // Nagaland (Moderate)
              "#059669", // Mizoram (Low)
              "#059669"  // Tripura (Low)
            ],
            borderRadius: 6,
            borderSkipped: false,
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              callbacks: {
                label: (ctx) => `Recorded Events: ${ctx.raw} Incidents`
              }
            }
          },
          scales: {
            x: {
              grid: { color: "rgba(226, 232, 240, 0.6)" },
              ticks: { font: { family: "Inter", size: 10 }, color: "#64748b" },
              title: { display: true, text: "Total Hazard Incidents", font: { family: "Inter", size: 11, weight: "700" }, color: "#334155" }
            },
            y: {
              grid: { display: false },
              ticks: { font: { family: "Inter", size: 11, weight: "700" }, color: "#1e293b" }
            }
          }
        }
      });
    }

    // 3. Alert Severity Breakdown Doughnut Chart
    const ctxSev = document.getElementById("severityDoughnutChart");
    if (ctxSev) {
      if (reportsCharts.severity) reportsCharts.severity.destroy();
      reportsCharts.severity = new Chart(ctxSev, {
        type: "doughnut",
        data: {
          labels: ["Critical (Level 3)", "High (Level 2)", "Moderate (Level 1)", "Low Watch"],
          datasets: [{
            data: [24, 46, 38, 20],
            backgroundColor: ["#dc2626", "#ea580c", "#d97706", "#059669"],
            borderWidth: 3,
            borderColor: "#ffffff",
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: {
                boxWidth: 12,
                font: { family: "Inter", size: 11, weight: "700" },
                color: "#334155",
                padding: 12
              }
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${ctx.raw} alerts (${Math.round((ctx.raw / 128) * 100)}%)`
              }
            }
          },
          cutout: "68%"
        }
      });
    }

    // Setup Generate Report Modal interactions
    const openReportBtn = document.getElementById("openReportModalBtn");
    const reportModal = document.getElementById("reportModalOverlay");
    const closeReportBtn = document.getElementById("closeReportModalBtn");
    const cancelReportBtn = document.getElementById("cancelReportModalBtn");
    const downloadPdfBtn = document.getElementById("downloadReportPdfBtn");

    if (openReportBtn && reportModal) {
      openReportBtn.addEventListener("click", () => reportModal.classList.add("visible"));
    }
    if (closeReportBtn && reportModal) {
      closeReportBtn.addEventListener("click", () => reportModal.classList.remove("visible"));
    }
    if (cancelReportBtn && reportModal) {
      cancelReportBtn.addEventListener("click", () => reportModal.classList.remove("visible"));
    }
    if (downloadPdfBtn && reportModal) {
      downloadPdfBtn.addEventListener("click", () => {
        downloadPdfBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating Brief…`;
        setTimeout(() => {
          downloadPdfBtn.innerHTML = `<i class="fa-solid fa-file-arrow-down"></i> Generate Report (PDF / Summary)`;
          reportModal.classList.remove("visible");
          showToast("Disaster Intelligence Brief successfully compiled & downloaded.");
        }, 1200);
      });
    }
  }

  function onReportStateChange(state) {
    const distSelect = document.getElementById("reportFilterDistrict");
    if (!distSelect) return;

    const list = stateDistrictMap[state] || stateDistrictMap["all"];
    distSelect.innerHTML = list.map((d, i) => `<option value="${d}" ${i === 0 ? "selected" : ""}>${d}</option>`).join("");
  }

  function applyReportsFilters() {
    const period = document.getElementById("reportFilterPeriod")?.value || "monsoon-peak";
    const state = document.getElementById("reportFilterState")?.value || "all";
    const district = document.getElementById("reportFilterDistrict")?.value || "all";
    const risk = document.getElementById("reportFilterRisk")?.value || "all";

    const stateLabel = state === "all" ? "All North East India" : state;
    showToast(`Disaster Intelligence filters applied for ${stateLabel} (${district})`);

    // Dynamically update charts based on filtered scope
    if (reportsCharts.historical) {
      const multiplier = state === "all" ? 1 : 0.45;
      reportsCharts.historical.data.datasets[0].data = [4, 6, 12, 28, 54, 112, 148, 132, 86, 32, 10, 5].map(v => Math.round(v * multiplier));
      reportsCharts.historical.update();
    }

    if (reportsCharts.state && state !== "all") {
      reportsCharts.state.data.labels = [state];
      reportsCharts.state.data.datasets[0].data = [state === "Assam" ? 142 : state === "Sikkim" ? 128 : state === "Meghalaya" ? 98 : 74];
      reportsCharts.state.update();
    } else if (reportsCharts.state) {
      reportsCharts.state.data.labels = ["Assam", "Sikkim", "Meghalaya", "Manipur", "Arunachal", "Nagaland", "Mizoram", "Tripura"];
      reportsCharts.state.data.datasets[0].data = [142, 128, 98, 86, 74, 52, 34, 16];
      reportsCharts.state.update();
    }
  }

  /* ==========================================================
     7. SETTINGS & USER PREFERENCES
     ========================================================== */
  async function initSettings() {
    const settings = await ResQDataService.getSettings();

    // 1. Profile Display
    const profileName = document.getElementById("profileDispName");
    if (profileName) profileName.textContent = settings.officerName || "Team ResQAI";

    const profileRole = document.getElementById("profileDispRole");
    if (profileRole) profileRole.innerHTML = `<i class="fa-solid fa-user-check"></i> ${settings.role || "Disaster Response Coordinator"}`;

    const profileAgency = document.getElementById("profileDispAgency");
    if (profileAgency) profileAgency.textContent = settings.agency || "State Disaster Management Authority (SDMA / NDMA)";

    const profileEmail = document.getElementById("profileDispEmail");
    if (profileEmail) profileEmail.textContent = settings.email || "team@resqai.in";

    const profilePhone = document.getElementById("profileDispPhone");
    if (profilePhone) profilePhone.textContent = settings.phone || "+91 94350 12345";

    const profileRegion = document.getElementById("profileDispRegion");
    if (profileRegion) profileRegion.textContent = settings.operationalRegion || "All 8 States (North East Region)";

    // Modal Edit Fields
    const editName = document.getElementById("editProfileName");
    if (editName) editName.value = settings.officerName || "Team ResQAI";

    const editRole = document.getElementById("editProfileRole");
    if (editRole) editRole.value = settings.role || "Disaster Response Coordinator";

    const editAgency = document.getElementById("editProfileAgency");
    if (editAgency) editAgency.value = settings.agency || "State Disaster Management Authority (SDMA / NDMA)";

    const editEmail = document.getElementById("editProfileEmail");
    if (editEmail) editEmail.value = settings.email || "team@resqai.in";

    const editPhone = document.getElementById("editProfilePhone");
    if (editPhone) editPhone.value = settings.phone || "+91 94350 12345";

    const editRegion = document.getElementById("editProfileRegion");
    if (editRegion) editRegion.value = settings.operationalRegion || "All 8 States (North East Region)";

    // 2. Notification Preferences Toggles
    setCheckbox("prefCriticalAlerts", settings.criticalAlerts !== false);
    setCheckbox("prefHighAlerts", settings.highAlerts !== false);
    setCheckbox("prefEarlyWarnings", settings.earlyWarnings !== false);
    setCheckbox("prefResponseUpdates", settings.responseUpdates !== false);
    setCheckbox("prefReportNotifications", settings.reportNotifications !== false);

    // 3. Dashboard Preferences
    setCheckbox("prefCompactDashboard", Boolean(settings.compactDashboard));
    setCheckbox("prefShowRiskSummary", settings.showRiskSummary !== false);
    setCheckbox("prefShowActiveAlerts", settings.showActiveAlerts !== false);
    setCheckbox("prefShowResponseOps", settings.showResponseOps !== false);
    setCheckbox("prefShowRegionalRisk", settings.showRegionalRisk !== false);

    const defaultView = document.getElementById("prefDefaultStartupView");
    if (defaultView && settings.defaultStartupView) {
      defaultView.value = settings.defaultStartupView;
    }

    // 4. Map Display Preferences
    setCheckbox("prefShowRiskMarkers", settings.showRiskMarkers !== false);
    setCheckbox("prefShowRainfallData", settings.showRainfallData !== false);
    setCheckbox("prefShowSoilMoisture", settings.showSoilMoisture !== false);
    setCheckbox("prefShowGroundMovement", settings.showGroundMovement !== false);
    setCheckbox("prefShowDisasterZones", settings.showDisasterZones !== false);
    setCheckbox("prefAutoRefreshMap", settings.autoRefreshMap !== false);

    // 5. Risk Visualization Preferences
    const riskLevelDisplay = document.getElementById("prefRiskLevelDisplay");
    if (riskLevelDisplay && settings.riskLevelDisplay) {
      riskLevelDisplay.value = settings.riskLevelDisplay;
    }

    setCheckbox("prefShowRiskScore", settings.showRiskScore !== false);
    setCheckbox("prefShowRiskTrendCharts", settings.showRiskTrendCharts !== false);
    setCheckbox("prefAlertSeverityIndicators", settings.alertSeverityIndicators !== false);
  }

  function setCheckbox(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(value);
  }

  function getCheckbox(id, defaultValue = true) {
    const el = document.getElementById(id);
    return el ? el.checked : defaultValue;
  }

  async function saveUserSettings() {
    const current = await ResQDataService.getSettings();
    const updated = {
      ...current,
      // Notifications
      criticalAlerts: getCheckbox("prefCriticalAlerts", true),
      highAlerts: getCheckbox("prefHighAlerts", true),
      earlyWarnings: getCheckbox("prefEarlyWarnings", true),
      responseUpdates: getCheckbox("prefResponseUpdates", true),
      reportNotifications: getCheckbox("prefReportNotifications", true),

      // Dashboard
      compactDashboard: getCheckbox("prefCompactDashboard", false),
      showRiskSummary: getCheckbox("prefShowRiskSummary", true),
      showActiveAlerts: getCheckbox("prefShowActiveAlerts", true),
      showResponseOps: getCheckbox("prefShowResponseOps", true),
      showRegionalRisk: getCheckbox("prefShowRegionalRisk", true),
      defaultStartupView: document.getElementById("prefDefaultStartupView")?.value || "home",

      // Map
      showRiskMarkers: getCheckbox("prefShowRiskMarkers", true),
      showRainfallData: getCheckbox("prefShowRainfallData", true),
      showSoilMoisture: getCheckbox("prefShowSoilMoisture", true),
      showGroundMovement: getCheckbox("prefShowGroundMovement", true),
      showDisasterZones: getCheckbox("prefShowDisasterZones", true),
      autoRefreshMap: getCheckbox("prefAutoRefreshMap", true),

      // Risk Visualization
      riskLevelDisplay: document.getElementById("prefRiskLevelDisplay")?.value || "both",
      showRiskScore: getCheckbox("prefShowRiskScore", true),
      showRiskTrendCharts: getCheckbox("prefShowRiskTrendCharts", true),
      alertSeverityIndicators: getCheckbox("prefAlertSeverityIndicators", true),
    };

    const res = await ResQDataService.saveSettings(updated);
    showToast("Settings saved successfully");
  }

  async function resetSettings() {
    const confirmed = confirm("Are you sure you want to reset all preferences to default values?");
    if (!confirmed) return;

    await ResQDataService.resetSettings();
    await initSettings();
    showToast("Settings reset to default.");
  }

  function openProfileModal() {
    const modal = document.getElementById("profileEditModalOverlay");
    if (modal) modal.classList.add("open");
  }

  function closeProfileModal() {
    const modal = document.getElementById("profileEditModalOverlay");
    if (modal) modal.classList.remove("open");
  }

  async function saveProfileChanges() {
    const name = document.getElementById("editProfileName")?.value || "Team ResQAI";
    const role = document.getElementById("editProfileRole")?.value || "Disaster Response Coordinator";
    const agency = document.getElementById("editProfileAgency")?.value || "State Disaster Management Authority (SDMA / NDMA)";
    const email = document.getElementById("editProfileEmail")?.value || "team@resqai.in";
    const phone = document.getElementById("editProfilePhone")?.value || "+91 94350 12345";
    const region = document.getElementById("editProfileRegion")?.value || "All 8 States (North East Region)";

    const current = await ResQDataService.getSettings();
    const updated = {
      ...current,
      officerName: name,
      role: role,
      agency: agency,
      email: email,
      phone: phone,
      operationalRegion: region,
    };

    await ResQDataService.saveSettings(updated);
    await initSettings();
    closeProfileModal();
    showToast("Profile updated successfully.");
  }

  /* ==========================================================
     8. MODALS & GLOBAL SEARCH
     ========================================================== */
  function initModals() {
    const openBtn = document.getElementById("openReportModalBtn");
    const modal = document.getElementById("reportModalOverlay");
    const closeBtn = document.getElementById("closeReportModalBtn");
    const cancelBtn = document.getElementById("cancelReportModalBtn");
    const downloadBtn = document.getElementById("downloadReportPdfBtn");

    if (openBtn && modal) {
      openBtn.addEventListener("click", () => modal.classList.add("open"));
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener("click", () => modal.classList.remove("open"));
    }
    if (cancelBtn && modal) {
      cancelBtn.addEventListener("click", () => modal.classList.remove("open"));
    }
    if (downloadBtn && modal) {
      downloadBtn.addEventListener("click", () => {
        modal.classList.remove("open");
        showToast("Generating official SDMA / NDMA Incident Report Brief (PDF)... Ready for download.");
      });
    }
  }

  function initGlobalSearch() {
    const input = document.getElementById("globalSearchInput");
    if (!input) return;

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        const query = this.value.trim().toLowerCase();
        if (!query) return;

        // Try to match station on map
        const found = mapMarkers.find(m =>
          m.data.name.toLowerCase().includes(query) ||
          m.data.district.toLowerCase().includes(query) ||
          m.data.state.toLowerCase().includes(query)
        );

        if (found) {
          navigateTo("live-map");
          mapInstance.flyTo(found.data.coordinates, 10);
          inspectStation(found.data);
          found.leafletMarker.openPopup();
          showToast(`Found sensor station: ${found.data.name}`);
        } else {
          navigateTo("alerts");
          const alertSearch = document.getElementById("alertSearchInput");
          if (alertSearch) {
            alertSearch.value = query;
            alertSearch.dispatchEvent(new Event("input"));
          }
          showToast(`Filtered alerts for "${query}"`);
        }
      }
    });
  }

  function inspectStationOnMap(stationId) {
    const found = mapMarkers.find(m => m.data.id === stationId);
    if (found) {
      inspectStation(found.data);
    }
  }

  function showToast(message, isError = false) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${isError ? "error" : ""}`;
    toast.innerHTML = `
      <i class="fa-solid ${isError ? "fa-circle-exclamation" : "fa-circle-check"}" style="color: ${isError ? "#ef4444" : "#059669"}; font-size: 1.1rem;"></i>
      <span style="font-size: 0.85rem; font-weight: 600; color: #0f172a;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function inspectStationFromTable(stationId) {
    selectMonitoringStation(stationId);
    showToast(`Loaded sensor telemetry for Node #${stationId}`);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  }

  // Public Methods
  return {
    navigateTo,
    openStateOnMap,
    inspectStationOnMap,
    inspectStationFromTable,
    selectMonitoringStation,
    broadcastAlert,
    viewAlertOnMap,
    viewAlertDetails,
    closeAlertModal,
    openIncidentModal,
    closeIncidentModal,
    viewIncidentOnMap,
    viewIncidentOnMapFromModal,
    filterIncidentsByStatus,
    applyReportsFilters,
    onReportStateChange,
    saveUserSettings,
    resetSettings,
    openProfileModal,
    closeProfileModal,
    saveProfileChanges,
    showToast,
  };
})();

// Attach globally
window.ResQApp = ResQApp;
