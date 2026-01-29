import fs from 'fs';
import https from 'https';

const AIRPORTS_URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const OUTPUT_FILE = './public/data/airports.json';

function downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolve(data));
            res.on('error', reject);
        });
    });
}

function parseCSV(csv: string) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',');

    // Find indices for relevant columns
    const getIndex = (name: string) => headers.findIndex(h => h.replace(/"/g, '') === name);

    const idx = {
        type: getIndex('type'),
        name: getIndex('name'),
        lat: getIndex('latitude_deg'),
        lon: getIndex('longitude_deg'),
        elev: getIndex('elevation_ft'),
        gps_code: getIndex('gps_code'), // ICAO
        iata_code: getIndex('iata_code'),
    };

    const airports = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); // Regex to handle quotes
        if (row.length < headers.length) continue;

        const type = row[idx.type]?.replace(/"/g, '');

        // Only include large, medium airports to keep file size reasonable
        if (type !== 'large_airport' && type !== 'medium_airport') continue;

        const airport = {
            name: row[idx.name]?.replace(/"/g, ''),
            type: type,
            lat: parseFloat(row[idx.lat]),
            lon: parseFloat(row[idx.lon]),
            elev: parseInt(row[idx.elev]) || 0,
            icao: row[idx.gps_code]?.replace(/"/g, '') || '',
            iata: row[idx.iata_code]?.replace(/"/g, '') || '',
        };

        // Only add if it has a code
        if (airport.icao || airport.iata) {
            airports.push(airport);
        }
    }

    return airports;
}

async function main() {
    console.log('Downloading airport data...');
    try {
        const csv = await downloadFile(AIRPORTS_URL);
        console.log('Parsing CSV...');
        const airports = parseCSV(csv);
        console.log(`Found ${airports.length} airports. Saving to ${OUTPUT_FILE}...`);

        if (!fs.existsSync('./public/data')) {
            fs.mkdirSync('./public/data', { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(airports));
        console.log('Done!');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
