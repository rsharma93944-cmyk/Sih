/**
 * ResQAI - Data Service & Mock Layer
 * Prepared for future seamless replacement with:
 * Frontend -> REST API -> Python/FastAPI -> ML Model -> Database
 */

const ResQDataService = (function () {
  // Configuration
  const config = {
    isMock: true,
    apiBaseUrl: "http://localhost:8000/api/v1",
    autoRefreshIntervalMs: 5000,
  };

  // State-wide sensor stations across North East India
  const stations = [
    {
      id: "AS-01",
      name: "Haflong Hill Station Array",
      district: "Dima Hasao",
      state: "Assam",
      coordinates: [25.1764, 93.0175],
      elevation: "960 m",
      slopeAngle: "42°",
      riskLevel: "critical", // critical, high, moderate, low
      probability: 88,
      rainfall24h: 174.5,
      soilMoisture: 89.2,
      groundDisplacement: 18.4, // mm/h
      temperature: 18.2,
      porePressure: "34.2 kPa",
      lastUpdated: "Just now",
      stationStatus: "Online",
      advisory: "Critical slope creep detected along NH-54 section. Immediate evacuation recommended.",
    },
    {
      id: "SK-01",
      name: "Mangan-Chungthang Geo-Node",
      district: "North Sikkim",
      state: "Sikkim",
      coordinates: [27.5028, 88.5323],
      elevation: "1,530 m",
      slopeAngle: "48°",
      riskLevel: "critical",
      probability: 84,
      rainfall24h: 162.0,
      soilMoisture: 87.5,
      groundDisplacement: 15.6,
      temperature: 13.5,
      porePressure: "31.8 kPa",
      lastUpdated: "2 mins ago",
      stationStatus: "Online",
      advisory: "High precipitation triggering debris flow risk on Teesta valley slope corridor.",
    },
    {
      id: "MN-01",
      name: "Noney Railway Corridor Sensor",
      district: "Noney",
      state: "Manipur",
      coordinates: [24.8191, 93.6019],
      elevation: "780 m",
      slopeAngle: "39°",
      riskLevel: "high",
      probability: 76,
      rainfall24h: 138.2,
      soilMoisture: 82.4,
      groundDisplacement: 9.8,
      temperature: 21.0,
      porePressure: "26.4 kPa",
      lastUpdated: "5 mins ago",
      stationStatus: "Online",
      advisory: "Precipitation exceeding safety threshold. Track monitoring teams alerted.",
    },
    {
      id: "ML-01",
      name: "Cherrapunji South Escarpment",
      district: "East Khasi Hills",
      state: "Meghalaya",
      coordinates: [25.2986, 91.7303],
      elevation: "1,484 m",
      slopeAngle: "45°",
      riskLevel: "high",
      probability: 72,
      rainfall24h: 210.4,
      soilMoisture: 91.0,
      groundDisplacement: 8.2,
      temperature: 17.8,
      porePressure: "37.5 kPa",
      lastUpdated: "3 mins ago",
      stationStatus: "Online",
      advisory: "Heavy cloudburst runoff saturating upper sedimentary layers. High risk of mudslide.",
    },
    {
      id: "AR-01",
      name: "Tawang High-Pass Monitoring",
      district: "Tawang",
      state: "Arunachal Pradesh",
      coordinates: [27.5861, 91.8594],
      elevation: "3,048 m",
      slopeAngle: "44°",
      riskLevel: "moderate",
      probability: 54,
      rainfall24h: 88.0,
      soilMoisture: 68.3,
      groundDisplacement: 4.1,
      temperature: 8.4,
      porePressure: "18.2 kPa",
      lastUpdated: "7 mins ago",
      stationStatus: "Online",
      advisory: "Moderate freeze-thaw soil loosening. Heavy vehicle restriction advised on pass.",
    },
    {
      id: "NL-01",
      name: "Kohima-Chumukedima Bypass Array",
      district: "Kohima",
      state: "Nagaland",
      coordinates: [25.6751, 94.1086],
      elevation: "1,444 m",
      slopeAngle: "36°",
      riskLevel: "moderate",
      probability: 48,
      rainfall24h: 76.5,
      soilMoisture: 64.8,
      groundDisplacement: 3.5,
      temperature: 19.5,
      porePressure: "16.1 kPa",
      lastUpdated: "10 mins ago",
      stationStatus: "Online",
      advisory: "Steady rainfall observed. Road monitoring patrol active along NH-29.",
    },
    {
      id: "MZ-01",
      name: "Aizawl North Ridge Inclinometer",
      district: "Aizawl",
      state: "Mizoram",
      coordinates: [23.7271, 92.7176],
      elevation: "1,132 m",
      slopeAngle: "34°",
      riskLevel: "low",
      probability: 28,
      rainfall24h: 38.0,
      soilMoisture: 52.0,
      groundDisplacement: 1.2,
      temperature: 22.4,
      porePressure: "11.0 kPa",
      lastUpdated: "12 mins ago",
      stationStatus: "Online",
      advisory: "Soil parameters stable within safe baseline range. Continuous telemetry normal.",
    },
    {
      id: "TR-01",
      name: "Jampui Hills Geo-Array",
      district: "North Tripura",
      state: "Tripura",
      coordinates: [23.9500, 92.2667],
      elevation: "930 m",
      slopeAngle: "28°",
      riskLevel: "low",
      probability: 22,
      rainfall24h: 24.5,
      soilMoisture: 46.2,
      groundDisplacement: 0.8,
      temperature: 24.0,
      porePressure: "8.5 kPa",
      lastUpdated: "15 mins ago",
      stationStatus: "Online",
      advisory: "All sensor nodes green. Low geological hazard probability.",
    },
  ];

  // Northeast States overview summary
  const stateSummaries = [
    { state: "Assam", risk: "Critical", activeSensors: 42, criticalZones: 4, avgProb: 74, color: "#ef4444" },
    { state: "Sikkim", risk: "Critical", activeSensors: 36, criticalZones: 3, avgProb: 79, color: "#ef4444" },
    { state: "Meghalaya", risk: "High", activeSensors: 28, criticalZones: 2, avgProb: 68, color: "#f97316" },
    { state: "Manipur", risk: "High", activeSensors: 31, criticalZones: 2, avgProb: 65, color: "#f97316" },
    { state: "Arunachal Pradesh", risk: "Moderate", activeSensors: 45, criticalZones: 1, avgProb: 49, color: "#eab308" },
    { state: "Nagaland", risk: "Moderate", activeSensors: 24, criticalZones: 1, avgProb: 44, color: "#eab308" },
    { state: "Mizoram", risk: "Low", activeSensors: 22, criticalZones: 0, avgProb: 26, color: "#10b981" },
    { state: "Tripura", risk: "Low", activeSensors: 18, criticalZones: 0, avgProb: 20, color: "#10b981" },
  ];

  // Alerts repository
  const alerts = [
    {
      id: "ALT-2026-089",
      severity: "critical",
      title: "Imminent Landslide Warning — Haflong NH-54 Corridor",
      location: "Dima Hasao, Assam",
      coordinates: "25.1764° N, 93.0175° E",
      probability: 88,
      timestamp: "10 mins ago",
      timeExact: "2026-09-04 02:35 IST",
      recommendedAction: "Immediate vehicular stoppage on NH-54 km 42-48. Dispatch SDRF rescue teams and initiate siren alerts for Lower Haflong settlement.",
      status: "Active",
      sensorId: "AS-01"
    },
    {
      id: "ALT-2026-088",
      severity: "critical",
      title: "Debris Flow & Slope Failure Alert — Mangan North Ridge",
      location: "North Sikkim, Sikkim",
      coordinates: "27.5028° N, 88.5323° E",
      probability: 84,
      timestamp: "24 mins ago",
      timeExact: "2026-09-04 02:20 IST",
      recommendedAction: "Issue evacuation advisory for downstream Teesta valley hamlets. Divert heavy military & civilian transport to secondary artery.",
      status: "Active",
      sensorId: "SK-01"
    },
    {
      id: "ALT-2026-087",
      severity: "high",
      title: "Severe Soil Pore Saturation — Cherrapunji Escarpment",
      location: "East Khasi Hills, Meghalaya",
      coordinates: "25.2986° N, 91.7303° E",
      probability: 72,
      timestamp: "1 hour ago",
      timeExact: "2026-09-04 01:45 IST",
      recommendedAction: "Alert PWD road maintenance quick-response units. Close pedestrian tourist trails near Nohkalikai falls ridge.",
      status: "Active",
      sensorId: "ML-01"
    },
    {
      id: "ALT-2026-086",
      severity: "high",
      title: "Accelerated Inclinometer Displacement — Noney Yard",
      location: "Noney, Manipur",
      coordinates: "24.8191° N, 93.6019° E",
      probability: 76,
      timestamp: "2 hours ago",
      timeExact: "2026-09-04 00:30 IST",
      recommendedAction: "Halt railway earthwork activities. Deploy geo-technical inspection drone along Pier 16-19 embankment slope.",
      status: "Investigating",
      sensorId: "MN-01"
    },
    {
      id: "ALT-2026-085",
      severity: "moderate",
      title: "Rainfall Threshold Exceeded — Tawang Sela Foothills",
      location: "Tawang, Arunachal Pradesh",
      coordinates: "27.5861° N, 91.8594° E",
      probability: 54,
      timestamp: "3 hours ago",
      timeExact: "2026-09-03 23:15 IST",
      recommendedAction: "BRO road clearance teams placed on Level-2 standby for potential rockfall at pass bends.",
      status: "Acknowledged",
      sensorId: "AR-01"
    },
    {
      id: "ALT-2026-084",
      severity: "moderate",
      title: "Moisture Anomaly Detected — Kohima Bypass NH-29",
      location: "Kohima, Nagaland",
      coordinates: "25.6751° N, 94.1086° E",
      probability: 48,
      timestamp: "5 hours ago",
      timeExact: "2026-09-03 21:40 IST",
      recommendedAction: "Issue caution bulletin to state traffic control for slow convoy speeds.",
      status: "Acknowledged",
      sensorId: "NL-01"
    }
  ];

  // Time-series mock telemetry generator for charts
  const timeLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "02:00 (Now)"];

  const getTelemetryTimeSeries = function (stationId) {
    const station = stations.find(s => s.id === stationId) || stations[0];
    const isCritical = station.riskLevel === "critical";
    const isHigh = station.riskLevel === "high";

    const baseRainfall = isCritical ? [45, 68, 92, 120, 145, 160, station.rainfall24h] :
      isHigh ? [30, 48, 65, 88, 105, 120, station.rainfall24h] : [10, 18, 24, 32, 36, 38, station.rainfall24h];

    const baseMoisture = isCritical ? [64, 70, 75, 80, 84, 87, station.soilMoisture] :
      isHigh ? [52, 58, 65, 72, 76, 79, station.soilMoisture] : [35, 38, 42, 45, 48, 50, station.soilMoisture];

    const baseDisplacement = isCritical ? [2.1, 4.5, 7.2, 10.8, 13.9, 16.2, station.groundDisplacement] :
      isHigh ? [1.0, 2.2, 3.8, 5.4, 7.1, 8.5, station.groundDisplacement] : [0.2, 0.4, 0.5, 0.7, 0.9, 1.0, station.groundDisplacement];

    const baseProbability = isCritical ? [40, 52, 64, 75, 80, 83, station.probability] :
      isHigh ? [25, 35, 46, 58, 66, 70, station.probability] : [10, 12, 15, 18, 20, 21, station.probability];

    return {
      labels: timeLabels,
      rainfall: baseRainfall,
      rainfallThreshold: [100, 100, 100, 100, 100, 100, 100],
      soilMoisture: baseMoisture,
      moistureCriticalLevel: [80, 80, 80, 80, 80, 80, 80],
      groundDisplacement: baseDisplacement,
      probability: baseProbability,
    };
  };

  // Historical report datasets
  const reportsData = {
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    landslidesByMonth: [4, 6, 12, 28, 54, 112, 148, 132, 86, 32, 10, 5],
    rainfallByMonth: [25, 40, 95, 180, 320, 560, 680, 610, 440, 190, 45, 20],
    incidentsByState: {
      labels: ["Assam", "Sikkim", "Meghalaya", "Manipur", "Arunachal", "Nagaland", "Mizoram", "Tripura"],
      counts: [142, 128, 98, 86, 74, 52, 34, 16],
    },
    severityDistribution: {
      labels: ["Critical (Level 3)", "High (Level 2)", "Moderate (Level 1)", "Low Watch"],
      counts: [84, 142, 210, 390],
    },
    systemMetrics: {
      totalSensorsInstalled: 246,
      onlineSensors: 242,
      uptimePercentage: "99.8%",
      earlyWarningsIssued: 318,
      evacuationsInitiated: 24,
      accuracyRate: "94.6%",
    }
  };

  // User Settings Store (persisted in LocalStorage)
  const defaultSettings = {
    // Profile
    officerName: "Team ResQAI",
    role: "Disaster Response Coordinator",
    agency: "State Disaster Management Authority (SDMA / NDMA)",
    email: "team@resqai.in",
    phone: "+91 94350 12345",
    operationalRegion: "All 8 States (North East Region)",
    
    // Notification Preferences
    criticalAlerts: true,
    highAlerts: true,
    earlyWarnings: true,
    responseUpdates: true,
    reportNotifications: true,

    // Dashboard Preferences
    compactDashboard: false,
    showRiskSummary: true,
    showActiveAlerts: true,
    showResponseOps: true,
    showRegionalRisk: true,
    defaultStartupView: "home",

    // Map Preferences
    showRiskMarkers: true,
    showRainfallData: true,
    showSoilMoisture: true,
    showGroundMovement: true,
    showDisasterZones: true,
    autoRefreshMap: true,

    // Risk Visualization
    riskLevelDisplay: "both",
    showRiskScore: true,
    showRiskTrendCharts: true,
    alertSeverityIndicators: true,
  };

  const getSettings = function () {
    try {
      const saved = localStorage.getItem("resqai_settings");
      if (saved) {
        return { ...defaultSettings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Could not read settings from storage", e);
    }
    return { ...defaultSettings };
  };

  const saveSettings = function (newSettings) {
    try {
      localStorage.setItem("resqai_settings", JSON.stringify(newSettings));
      return { success: true, message: "Settings saved successfully." };
    } catch (e) {
      return { success: false, message: "Error saving settings: " + e.message };
    }
  };

  const resetSettings = function () {
    try {
      localStorage.removeItem("resqai_settings");
      return { success: true, message: "Settings reset to default." };
    } catch (e) {
      return { success: false, message: "Error resetting settings: " + e.message };
    }
  };

  // ==========================================
  // DISASTER RESPONSE & RESCUE COORDINATOR DATA
  // ==========================================
  const incidents = [
    {
      id: "INC-2026-101",
      title: "Haflong Hill NH-54 Highway Slip",
      location: "Lower Haflong",
      district: "Dima Hasao",
      state: "Assam",
      disasterType: "Landslide",
      severity: "critical", // critical, high, moderate, low
      riskScore: 88,
      responseStatus: "Rescue In Progress", // Awaiting Response, Team Assigned, Team En Route, Rescue In Progress, Evacuation In Progress, Resolved
      time: "12 mins ago",
      timeExact: "2026-09-04 02:35 IST",
      rainfall: "174.5 mm",
      soilMoisture: "89.2%",
      groundMovement: "18.4 mm/h",
      affectedArea: "3.2 sq km (NH-54 km 44)",
      assignedTeam: "SDRF Unit Alpha-1 (Assam)",
      teamId: "TM-01",
      teamLead: "Capt. R. Saikia",
      workflowStage: 5, // 1 to 6
      coordinates: [25.1764, 93.0175],
      sensorId: "AS-01",
      estimatedPopExposed: "1,250 residents",
      lastUpdated: "2 mins ago",
      notes: "Severe slope failure blocked NH-54 arterial bypass. 4 light commercial vehicles trapped; SAR excavator deployed.",
    },
    {
      id: "INC-2026-102",
      title: "Chungthang Debris Flow & Slope Breach",
      location: "Chungthang Valley Corridor",
      district: "North Sikkim",
      state: "Sikkim",
      disasterType: "Slope Failure",
      severity: "critical",
      riskScore: 84,
      responseStatus: "Evacuation In Progress",
      time: "28 mins ago",
      timeExact: "2026-09-04 02:20 IST",
      rainfall: "162.0 mm",
      soilMoisture: "87.5%",
      groundMovement: "15.6 mm/h",
      affectedArea: "2.8 sq km (Teesta Corridor)",
      assignedTeam: "NDRF 2nd Battalion (Team B)",
      teamId: "TM-02",
      teamLead: "Maj. K. Lepcha",
      workflowStage: 4,
      coordinates: [27.5028, 88.5323],
      sensorId: "SK-01",
      estimatedPopExposed: "850 residents",
      lastUpdated: "5 mins ago",
      notes: "Heavy Teesta runoff triggered toe erosion under hill slope. 200 households moved to Upper Chungthang Relief Center.",
    },
    {
      id: "INC-2026-103",
      title: "Noney Railway Embankment Pier Slump",
      location: "Tupul Railway Corridor",
      district: "Noney",
      state: "Manipur",
      disasterType: "Slope Failure",
      severity: "high",
      riskScore: 76,
      responseStatus: "Team En Route",
      time: "1.5 hours ago",
      timeExact: "2026-09-04 01:10 IST",
      rainfall: "138.2 mm",
      soilMoisture: "82.4%",
      groundMovement: "9.8 mm/h",
      affectedArea: "1.4 sq km (Rail Embankment)",
      assignedTeam: "BRO Geo-Reaction Quick Team",
      teamId: "TM-03",
      teamLead: "Eng. V. Ningthouja",
      workflowStage: 4,
      coordinates: [24.8191, 93.6019],
      sensorId: "MN-01",
      estimatedPopExposed: "320 workers & transit",
      lastUpdated: "14 mins ago",
      notes: "Subsurface inclinometers showed 9.8mm displacement under Pier 18 foundation. Train movements restricted.",
    },
    {
      id: "INC-2026-104",
      title: "Cherrapunji South Ridge Flash Mudflow",
      location: "Nohkalikai Escarpment",
      district: "East Khasi Hills",
      state: "Meghalaya",
      disasterType: "Flash Flood",
      severity: "high",
      riskScore: 72,
      responseStatus: "Team Assigned",
      time: "2 hours ago",
      timeExact: "2026-09-04 00:45 IST",
      rainfall: "210.4 mm",
      soilMoisture: "91.0%",
      groundMovement: "8.2 mm/h",
      affectedArea: "4.1 sq km (Valley Trail)",
      assignedTeam: "Meghalaya Civil Defense Unit 3",
      teamId: "TM-04",
      teamLead: "Insp. D. Lyngdoh",
      workflowStage: 3,
      coordinates: [25.2986, 91.7303],
      sensorId: "ML-01",
      estimatedPopExposed: "420 residents",
      lastUpdated: "20 mins ago",
      notes: "Extreme 210mm rainfall triggered sudden topsoil fluidization. Pedestrian paths closed; SDRF team moving equipment.",
    },
    {
      id: "INC-2026-105",
      title: "Sela Pass Foothills Debris Washout",
      location: "Sela High Pass km 38",
      district: "Tawang",
      state: "Arunachal Pradesh",
      disasterType: "Landslide",
      severity: "moderate",
      riskScore: 54,
      responseStatus: "Awaiting Response",
      time: "3.5 hours ago",
      timeExact: "2026-09-03 23:15 IST",
      rainfall: "88.0 mm",
      soilMoisture: "68.3%",
      groundMovement: "4.1 mm/h",
      affectedArea: "0.9 sq km (Pass Curve)",
      assignedTeam: "Unassigned (QRF Standby)",
      teamId: null,
      teamLead: "Pending Dispatch",
      workflowStage: 2,
      coordinates: [27.5861, 91.8594],
      sensorId: "AR-01",
      estimatedPopExposed: "180 transit vehicles",
      lastUpdated: "35 mins ago",
      notes: "Rockfall and loose shale boulders obstructing single-lane convoy lane. BRO road grader mobilized on standby.",
    },
    {
      id: "INC-2026-106",
      title: "Kohima Bypass NH-29 Slope Creep",
      location: "Chumukedima Sector",
      district: "Kohima",
      state: "Nagaland",
      disasterType: "Slope Failure",
      severity: "moderate",
      riskScore: 48,
      responseStatus: "Team En Route",
      time: "4 hours ago",
      timeExact: "2026-09-03 22:40 IST",
      rainfall: "76.5 mm",
      soilMoisture: "64.8%",
      groundMovement: "3.5 mm/h",
      affectedArea: "1.1 sq km (NH-29 Bypass)",
      assignedTeam: "Nagaland SDRF Cohort 4",
      teamId: "TM-06",
      teamLead: "Sub-Insp. T. Jamir",
      workflowStage: 4,
      coordinates: [25.6751, 94.1086],
      sensorId: "NL-01",
      estimatedPopExposed: "650 residents",
      lastUpdated: "45 mins ago",
      notes: "Road crack widening monitored. Traffic restricted to 15km/h speed limit. Retaining wall inspection scheduled.",
    },
    {
      id: "INC-2026-107",
      title: "Mangan District Center Road Block",
      location: "Mangan South Access",
      district: "North Sikkim",
      state: "Sikkim",
      disasterType: "Landslide",
      severity: "high",
      riskScore: 79,
      responseStatus: "Rescue In Progress",
      time: "45 mins ago",
      timeExact: "2026-09-04 02:00 IST",
      rainfall: "155.0 mm",
      soilMoisture: "86.0%",
      groundMovement: "12.1 mm/h",
      affectedArea: "1.8 sq km",
      assignedTeam: "Sikkim Disaster Police QRF",
      teamId: "TM-07",
      teamLead: "Insp. P. Bhutia",
      workflowStage: 5,
      coordinates: [27.5100, 88.5400],
      sensorId: "SK-01",
      estimatedPopExposed: "520 residents",
      lastUpdated: "10 mins ago",
      notes: "Secondary slope collapse severed telecom fiber line. Emergency satellite terminal deployed by Police QRF.",
    },
    {
      id: "INC-2026-108",
      title: "Badarpur Hill Terracing Collapse",
      location: "Badarpur Ghat",
      district: "Karimganj",
      state: "Assam",
      disasterType: "Landslide",
      severity: "moderate",
      riskScore: 58,
      responseStatus: "Awaiting Response",
      time: "5 hours ago",
      timeExact: "2026-09-03 21:50 IST",
      rainfall: "94.0 mm",
      soilMoisture: "71.2%",
      groundMovement: "4.8 mm/h",
      affectedArea: "0.7 sq km",
      assignedTeam: "Unassigned (Local Patrol)",
      teamId: null,
      teamLead: "Pending Dispatch",
      workflowStage: 1,
      coordinates: [24.8700, 92.5600],
      sensorId: "AS-01",
      estimatedPopExposed: "300 residents",
      lastUpdated: "1 hour ago",
      notes: "Artificial terraced wall gave way under localized downpour. No casualties reported; local police assessing.",
    },
    {
      id: "INC-2026-109",
      title: "Tamenglong Ridge Ground Subsidence",
      location: "Old Tamenglong Ward 3",
      district: "Tamenglong",
      state: "Manipur",
      disasterType: "Slope Failure",
      severity: "moderate",
      riskScore: 52,
      responseStatus: "Incident Confirmed",
      time: "6 hours ago",
      timeExact: "2026-09-03 20:45 IST",
      rainfall: "82.0 mm",
      soilMoisture: "66.5%",
      groundMovement: "3.9 mm/h",
      affectedArea: "1.0 sq km",
      assignedTeam: "Unassigned (District Fire)",
      teamId: null,
      teamLead: "Capt. L. Singh",
      workflowStage: 2,
      coordinates: [24.9800, 93.4900],
      sensorId: "MN-01",
      estimatedPopExposed: "410 residents",
      lastUpdated: "1.5 hours ago",
      notes: "Fissures appearing across village perimeter road. District emergency controller issued Level-1 advisory.",
    },
    {
      id: "INC-2026-110",
      title: "Aizawl Bawngkawn Embankment Fracture",
      location: "Bawngkawn Ridge",
      district: "Aizawl",
      state: "Mizoram",
      disasterType: "Slope Failure",
      severity: "low",
      riskScore: 32,
      responseStatus: "Resolved",
      time: "8 hours ago",
      timeExact: "2026-09-03 18:30 IST",
      rainfall: "42.0 mm",
      soilMoisture: "54.0%",
      groundMovement: "1.4 mm/h",
      affectedArea: "0.5 sq km",
      assignedTeam: "Mizoram Civil Defense Unit",
      teamId: null,
      teamLead: "Officer Z. Ralte",
      workflowStage: 6,
      coordinates: [23.7400, 92.7300],
      sensorId: "MZ-01",
      estimatedPopExposed: "250 residents",
      lastUpdated: "2 hours ago",
      notes: "Gabion reinforcement completed; ground movement stabilized below 1.5mm/h safe limit.",
    },
    {
      id: "INC-2026-111",
      title: "Shillong Peak Channel Overflow",
      location: "Upper Shillong Forest Sector",
      district: "East Khasi Hills",
      state: "Meghalaya",
      disasterType: "Flash Flood",
      severity: "high",
      riskScore: 68,
      responseStatus: "Rescue In Progress",
      time: "1.8 hours ago",
      timeExact: "2026-09-04 00:55 IST",
      rainfall: "185.0 mm",
      soilMoisture: "88.4%",
      groundMovement: "7.5 mm/h",
      affectedArea: "2.2 sq km",
      assignedTeam: "SDRF Meghalaya Squad 1",
      teamId: "TM-05",
      teamLead: "Capt. B. Kharbangar",
      workflowStage: 5,
      coordinates: [25.5300, 91.8800],
      sensorId: "ML-01",
      estimatedPopExposed: "780 residents",
      lastUpdated: "8 mins ago",
      notes: "Heavy mountain creek surge overflowing into residential culverts. 3 de-watering high-capacity pumps operational.",
    },
    {
      id: "INC-2026-112",
      title: "Longding Border Highway Rockslide",
      location: "Longding-Pangsu Pass Route",
      district: "Longding",
      state: "Arunachal Pradesh",
      disasterType: "Landslide",
      severity: "low",
      riskScore: 28,
      responseStatus: "Resolved",
      time: "12 hours ago",
      timeExact: "2026-09-03 14:15 IST",
      rainfall: "32.0 mm",
      soilMoisture: "48.0%",
      groundMovement: "0.9 mm/h",
      affectedArea: "0.4 sq km",
      assignedTeam: "BRO Taskforce 77",
      teamId: null,
      teamLead: "Maj. S. Thapa",
      workflowStage: 6,
      coordinates: [26.8500, 95.3400],
      sensorId: "AR-01",
      estimatedPopExposed: "120 transit",
      lastUpdated: "4 hours ago",
      notes: "Single rock boulder cleared by BRO bulldozer; road fully reopened to two-way traffic.",
    }
  ];

  const rescueTeams = [
    {
      id: "TM-01",
      name: "SDRF Unit Alpha-1 (Assam)",
      location: "Haflong, Dima Hasao",
      assignedIncident: "INC-2026-101",
      personnel: 12,
      status: "ON SITE", // AVAILABLE, EN ROUTE, ON SITE, BUSY, COMPLETED
      statusType: "on-site",
      equipment: "Heavy Extrication & Geo-Locators",
      comms: "VHF Ch-4 (433.5 MHz)",
      lead: "Capt. R. Saikia"
    },
    {
      id: "TM-02",
      name: "NDRF 2nd Battalion (Team B)",
      location: "Mangan Highway, Sikkim",
      assignedIncident: "INC-2026-102",
      personnel: 10,
      status: "EN ROUTE",
      statusType: "en-route",
      equipment: "Inflatable Rafts & Drone Scanners",
      comms: "VHF Ch-2 (433.1 MHz)",
      lead: "Maj. K. Lepcha"
    },
    {
      id: "TM-03",
      name: "BRO Geo-Reaction Quick Team",
      location: "Noney Rail Corridor, Manipur",
      assignedIncident: "INC-2026-103",
      personnel: 8,
      status: "EN ROUTE",
      statusType: "en-route",
      equipment: "Slope Anchoring & Dozers",
      comms: "VHF Ch-7 (434.2 MHz)",
      lead: "Eng. V. Ningthouja"
    },
    {
      id: "TM-04",
      name: "Meghalaya Civil Defense Unit 3",
      location: "Sohra / Cherrapunji HQ",
      assignedIncident: "INC-2026-104",
      personnel: 6,
      status: "BUSY",
      statusType: "busy",
      equipment: "Rope Rescue & High-Angle Kits",
      comms: "VHF Ch-5 (433.8 MHz)",
      lead: "Insp. D. Lyngdoh"
    },
    {
      id: "TM-05",
      name: "SDRF Meghalaya Squad 1",
      location: "Shillong Peak Ridge",
      assignedIncident: "INC-2026-111",
      personnel: 6,
      status: "ON SITE",
      statusType: "on-site",
      equipment: "Pumping Units & Evac Boats",
      comms: "VHF Ch-6 (434.0 MHz)",
      lead: "Capt. B. Kharbangar"
    },
    {
      id: "TM-06",
      name: "Nagaland SDRF Cohort 4",
      location: "Kohima-Chumukedima Road",
      assignedIncident: "INC-2026-106",
      personnel: 4,
      status: "EN ROUTE",
      statusType: "en-route",
      equipment: "Debris Spreaders & Mobile Lighting",
      comms: "VHF Ch-3 (433.3 MHz)",
      lead: "Sub-Insp. T. Jamir"
    },
    {
      id: "TM-07",
      name: "Sikkim Disaster Police QRF",
      location: "Mangan District Center",
      assignedIncident: "INC-2026-107",
      personnel: 6,
      status: "ON SITE",
      statusType: "on-site",
      equipment: "Canine Search & First Aid Kits",
      comms: "VHF Ch-1 (433.0 MHz)",
      lead: "Insp. P. Bhutia"
    },
    {
      id: "TM-08",
      name: "Air-Rescue Helicopter Crew (QRF)",
      location: "Guwahati Airbase Standby",
      assignedIncident: "Standby (Ready)",
      personnel: 4,
      status: "AVAILABLE",
      statusType: "available",
      equipment: "Mi-17 Evac Hoist & Medical Pod",
      comms: "Air-Ground Ch-9 (121.5 MHz)",
      lead: "Sq. Ldr. A. Sharma"
    }
  ];

  const emergencyResources = [
    {
      category: "Medical Support",
      icon: "fa-kit-medical",
      status: "Limited",
      statusType: "limited",
      available: "14 Mobile Trauma Kits",
      required: "2 Field ICU Ambulances",
      hub: "Silchar Medical College & Gangtok STNM"
    },
    {
      category: "Rescue Equipment",
      icon: "fa-helmet-safety",
      status: "Available",
      statusType: "available",
      available: "18 Geo-Inclinometers & 6 Drones",
      required: "None (Adequate)",
      hub: "Guwahati Regional Central Depot"
    },
    {
      category: "Emergency Vehicles",
      icon: "fa-truck-field",
      status: "Limited",
      statusType: "limited",
      available: "22 4x4 High-Clearance Transports",
      required: "3 Heavy Excavator Transporters",
      hub: "Dimapur & Shillong Sector"
    },
    {
      category: "Emergency Personnel",
      icon: "fa-user-shield",
      status: "Available",
      statusType: "available",
      available: "46 Field Responders Active",
      required: "12 Geological Specialists",
      hub: "NDRF 1st & 2nd Battalions"
    },
    {
      category: "Shelter Capacity",
      icon: "fa-tent",
      status: "Required",
      statusType: "required",
      available: "3 Relief Centers (Cap: 1,800)",
      required: "+2 Relief Camps in Dima Hasao",
      hub: "Haflong & Chungthang District Schools"
    }
  ];

  // Public API methods (all return Promises for drop-in REST API backend compatibility)
  return {
    getConfig: () => ({ ...config }),

    getDashboardSummary: async function () {
      return {
        overallRisk: "HIGH",
        overallProbability: 78,
        rainfallAvg: 142.5,
        soilMoistureAvg: 84.2,
        groundMovementAvg: 14.8,
        temperatureAvg: 19.4,
        activeAlertsCount: alerts.filter(a => a.severity === "critical" || a.severity === "high").length,
        totalSensorsCount: stations.length * 30,
        activeStations: stations,
        stateSummaries: stateSummaries,
      };
    },

    getStations: async function () {
      return [...stations];
    },

    getStationById: async function (id) {
      return stations.find(s => s.id === id) || stations[0];
    },

    getTelemetryHistory: async function (stationId) {
      return getTelemetryTimeSeries(stationId);
    },

    getAlerts: async function (filterSeverity = "all", searchQuery = "") {
      return alerts.filter(alert => {
        const matchesSeverity = filterSeverity === "all" || alert.severity === filterSeverity;
        const matchesSearch = !searchQuery ||
          alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          alert.recommendedAction.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSeverity && matchesSearch;
      });
    },

    getReportsData: async function () {
      return { ...reportsData };
    },

    getSettings: async function () {
      return getSettings();
    },

    saveSettings: async function (settings) {
      return saveSettings(settings);
    },

    resetSettings: async function () {
      return resetSettings();
    },

    // Response & Rescue Center Methods
    getResponseSummary: async function () {
      return {
        activeIncidents: 12,
        rescueTeams: 8,
        personnelDeployed: 46,
        resourcesRequired: 5,
        criticalIncidents: incidents.filter(i => i.severity === "critical").length,
        highIncidents: incidents.filter(i => i.severity === "high").length,
        moderateIncidents: incidents.filter(i => i.severity === "moderate").length,
        resolvedIncidents: incidents.filter(i => i.responseStatus === "Resolved").length,
      };
    },

    getIncidents: async function (filterSeverity = "all", filterStatus = "all", searchQuery = "") {
      return incidents.filter(inc => {
        const matchesSeverity = filterSeverity === "all" || inc.severity === filterSeverity;
        const matchesStatus = filterStatus === "all" || 
          (filterStatus === "active" && inc.responseStatus !== "Resolved") ||
          (filterStatus === "resolved" && inc.responseStatus === "Resolved") ||
          inc.responseStatus.toLowerCase().replace(/\s+/g, '-') === filterStatus;
        const matchesSearch = !searchQuery ||
          inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
          inc.disasterType.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSeverity && matchesStatus && matchesSearch;
      });
    },

    getIncidentById: async function (id) {
      return incidents.find(i => i.id === id) || incidents[0];
    },

    getRescueTeams: async function () {
      return [...rescueTeams];
    },

    getEmergencyResources: async function () {
      return [...emergencyResources];
    }
  };
})();

// Attach globally
window.ResQDataService = ResQDataService;
