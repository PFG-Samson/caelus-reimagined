
const puppeteer = require('puppeteer');
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, TableOfContents, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');

// Helper to create a standard table
function createTable(headers, rows) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: headers.map(h => new TableCell({
                    children: [new Paragraph({ text: h, style: "Strong" })],
                    shading: { fill: "E0E0E0" },
                })),
            }),
            ...rows.map(row => new TableRow({
                children: row.map(cellText => new TableCell({
                    children: [new Paragraph({ text: cellText })],
                })),
            })),
        ],
    });
}

async function captureScreenshots() {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Set viewport to a reasonable size for screenshots
    await page.setViewport({ width: 1280, height: 720 });

    console.log('Navigating to app...');
    try {
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 60000 });
    } catch (e) {
        console.log('Navigation timeout or error, continuing anyway as app might be SPA...');
    }

    // Wait for 2D map to load
    console.log('Waiting for 2D map...');
    try {
        await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    } catch (e) {
        console.log('Could not find leaflet container, taking screenshot anyway.');
    }

    // Give it a moment to render tiles
    await new Promise(r => setTimeout(r, 3000));

    console.log('Taking 2D screenshot...');
    await page.screenshot({ path: 'docs/screenshots/2d_view.png' });

    // Switch to 3D
    console.log('Switching to 3D view...');
    try {
        const toggleBtn = await page.$('button[title="Switch to 3D Globe"]');
        if (toggleBtn) {
            await toggleBtn.click();
            // Wait for Cesium
            console.log('Waiting for 3D globe...');
            // Cesium might take a while to load
            await new Promise(r => setTimeout(r, 8000));
            // Try to wait for canvas
            try {
                await page.waitForSelector('canvas', { timeout: 10000 });
            } catch (e) {
                console.log('Could not find canvas, taking screenshot anyway.');
            }
            await new Promise(r => setTimeout(r, 3000)); // Extra wait for rendering

            console.log('Taking 3D screenshot...');
            await page.screenshot({ path: 'docs/screenshots/3d_view.png' });
        } else {
            console.log('3D toggle button not found.');
        }
    } catch (e) {
        console.error('Error switching to 3D:', e);
    }

    await browser.close();
    console.log('Screenshots captured.');
}

function createDocument() {
    console.log('Creating document...');

    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "Strong",
                    name: "Strong",
                    basedOn: "Normal",
                    next: "Normal",
                    run: {
                        bold: true,
                    },
                },
            ],
        },
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "PF-Caelus User Manual",
                    heading: HeadingLevel.TITLE,
                }),
                new Paragraph({
                    text: "Comprehensive Weather Intelligence Platform",
                    heading: HeadingLevel.SUBTITLE,
                }),
                new Paragraph({ text: "" }), // Spacer

                // Table of Contents
                new Paragraph({
                    text: "Table of Contents",
                    heading: HeadingLevel.HEADING_1,
                }),
                new TableOfContents("Summary", {
                    hyperlink: true,
                    headingStyleRange: "1-5",
                }),
                new Paragraph({
                    text: "",
                    pageBreakBefore: true,
                }),

                // 1. Introduction & Overview
                new Paragraph({
                    text: "1. Introduction & Overview",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "PF-Caelus is a next-generation weather intelligence platform that bridges the gap between professional meteorological tools and consumer-friendly applications. By integrating high-fidelity data from OpenWeatherMap and NASA GIBS, PF-Caelus provides a unified interface for monitoring global weather patterns.",
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "The platform features a unique dual-view architecture:",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "2D Map View: Powered by Leaflet, optimized for detailed local analysis, navigation, and precise measurements.",
                    bullet: { level: 1 }
                }),
                new Paragraph({
                    text: "3D Globe View: Powered by CesiumJS, offering a realistic planetary perspective ideal for understanding large-scale atmospheric systems.",
                    bullet: { level: 1 }
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync("docs/screenshots/2d_view.png"),
                            transformation: { width: 600, height: 337 },
                        }),
                    ],
                }),
                new Paragraph({
                    text: "Figure 1: PF-Caelus 2D Map Interface",
                    alignment: "center",
                }),

                // 2. Business & Strategy
                new Paragraph({
                    text: "2. Business & Strategy",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "Market Positioning",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "PF-Caelus targets the 'Prosumer' market—users who need more than basic icons but find industrial GIS software too complex. This includes aviation enthusiasts, maritime planners, agricultural consultants, and outdoor event organizers.",
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "SWOT Analysis",
                    heading: HeadingLevel.HEADING_2,
                }),
                createTable(
                    ["Strengths", "Weaknesses"],
                    [
                        ["• Dual-view (2D/3D) capability\n• Real-time AI summaries\n• No subscription required (BYO Keys)", "• Heavy browser resource usage (3D)\n• Dependency on external APIs"],
                        ["Opportunities", "Threats"],
                        ["• Mobile app expansion\n• Enterprise API integration\n• Historical climate data analysis", "• API pricing changes\n• Competitor platform consolidation"]
                    ]
                ),

                // 3. Technical Documentation
                new Paragraph({
                    text: "3. Technical Documentation",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "System Architecture",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "The application is built as a client-side Single Page Application (SPA) using React 18 and Vite. It leverages a component-based architecture where the map state is managed globally via React Context.",
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Technology Stack",
                    heading: HeadingLevel.HEADING_2,
                }),
                createTable(
                    ["Component", "Technology", "Purpose"],
                    [
                        ["Frontend Framework", "React 18 + TypeScript", "UI Logic & Type Safety"],
                        ["Build Tool", "Vite", "Fast development & bundling"],
                        ["2D Mapping", "Leaflet + React-Leaflet", "Lightweight map rendering"],
                        ["3D Mapping", "CesiumJS + Resium", "High-fidelity globe rendering"],
                        ["Styling", "Tailwind CSS + shadcn/ui", "Responsive & modern UI"],
                        ["State Management", "React Context + Hooks", "Global settings & map state"],
                        ["Data Fetching", "Fetch API + Custom Caching", "API integration with TTL cache"],
                    ]
                ),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Data Flow",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "1. User Interaction: User clicks map or searches location.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "2. State Update: Coordinates updated in global state.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "3. Cache Check: System checks in-memory `weatherCache` for valid data (< 5 mins old).",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "4. API Call: If stale, fetches from OpenWeatherMap (Current, Forecast, Air Pollution).",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "5. AI Processing: Raw data sent to AI service (OpenAI/Gemini) for natural language summary.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "6. Rendering: UI updates with weather panel and map markers.",
                    bullet: { level: 0 }
                }),

                // 4. Core Features
                new Paragraph({
                    text: "4. Core Features",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "Weather Layers",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "The application supports multiple overlay layers that can be toggled independently:",
                }),
                createTable(
                    ["Layer Name", "Data Source", "Visualization"],
                    [
                        ["Temperature", "OpenWeatherMap", "Heatmap gradient (Blue -> Red)"],
                        ["Precipitation", "OpenWeatherMap", "Rain/Snow intensity radar"],
                        ["Wind Speed", "OpenWeatherMap", "Velocity streamlines"],
                        ["Clouds", "OpenWeatherMap", "Cloud cover opacity"],
                        ["Pressure", "OpenWeatherMap", "Isobaric lines"],
                        ["Satellite (3D)", "NASA GIBS", "True-color satellite imagery"],
                    ]
                ),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Interactive Tools",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "• Measurement Tool: Calculate precise geodesic distances between points.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• Location Search: Geocoding to find any city or coordinate worldwide.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• User Locator: One-click zoom to current device location.",
                    bullet: { level: 0 }
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync("docs/screenshots/3d_view.png"),
                            transformation: { width: 600, height: 337 },
                        }),
                    ],
                }),
                new Paragraph({
                    text: "Figure 2: PF-Caelus 3D Globe View with Satellite Imagery",
                    alignment: "center",
                }),

                // 5. User Guide & Training
                new Paragraph({
                    text: "5. User Guide & Training",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "Basic Navigation",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "• Pan: Click and drag the map.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• Zoom: Use scroll wheel or +/- buttons in bottom right.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• Rotate (3D): Hold right mouse button and drag to tilt/rotate.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "Using Tools",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "1. Measuring Distance:",
                    style: "Strong"
                }),
                new Paragraph({
                    text: "   a. Click the ruler icon in the top header.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "   b. Click the starting point on the map.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "   c. Click the ending point. The distance will appear in a popup.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "2. Changing Units:",
                    style: "Strong"
                }),
                new Paragraph({
                    text: "   a. Click the Settings (gear) icon.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "   b. Select your preferred units for Temperature (C/F), Wind (km/h, mph, knots), etc.",
                    bullet: { level: 0 }
                }),

                // 6. Deployment & Maintenance
                new Paragraph({
                    text: "6. Deployment & Maintenance",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "Prerequisites",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "• Node.js v18 or higher",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• NPM (Node Package Manager)",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "Environment Configuration",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "Create a .env file in the root directory with the following keys:",
                }),
                createTable(
                    ["Variable", "Required", "Description"],
                    [
                        ["VITE_OPENWEATHER_KEY", "Yes", "API key from OpenWeatherMap"],
                        ["VITE_CESIUM_TOKEN", "Yes", "Access token for Cesium Ion"],
                        ["VITE_GIBS_API_KEY", "No", "Optional key for NASA GIBS"],
                        ["VITE_OPENAI_KEY", "No", "Optional key for AI summaries"],
                    ]
                ),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Build Commands",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "• Development: `npm run dev`",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• Production Build: `npm run build`",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• Preview Build: `npm run preview`",
                    bullet: { level: 0 }
                }),

                // 7. Security & Compliance
                new Paragraph({
                    text: "7. Security & Compliance",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "Data Privacy",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "• Location Data: User location is requested via the browser Geolocation API. This data is processed locally to fetch weather and is never stored on PF-Caelus servers.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• API Keys: Keys are stored in environment variables. For production deployment, it is recommended to proxy API requests through a backend to prevent key exposure.",
                    bullet: { level: 0 }
                }),

                // 8. Future Roadmap
                new Paragraph({
                    text: "8. Future Roadmap",
                    heading: HeadingLevel.HEADING_1,
                }),
                createTable(
                    ["Quarter", "Feature", "Description"],
                    [
                        ["Q1 2026", "Mobile Native App", "React Native port for iOS and Android."],
                        ["Q2 2026", "Historical Data", "Access to 40-year historical weather archive."],
                        ["Q3 2026", "User Accounts", "Save favorite locations and custom layer presets."],
                        ["Q4 2026", "Enterprise API", "Headless API access for commercial integration."],
                    ]
                ),

                // 9. Appendices
                new Paragraph({
                    text: "9. Appendices",
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({
                    text: "Glossary",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    text: "• Isobar: A line on a map connecting points having the same atmospheric pressure.",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• GIBS: Global Imagery Browse Services (NASA).",
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    text: "• Cesium Ion: Platform for streaming 3D geospatial data.",
                    bullet: { level: 0 }
                }),
            ],
        }],
    });

    Packer.toBuffer(doc).then((buffer) => {
        fs.writeFileSync("PF-Caelus_User_Manual.docx", buffer);
        console.log("Document created successfully.");
    });
}

async function main() {
    await captureScreenshots();
    createDocument();
}

main();
