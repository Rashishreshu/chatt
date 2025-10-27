// To run this:
// 1. Install Node.js
// 2. Open your terminal in this directory and run: npm install ws
// 3. Start the server: node backend.js

const WebSocket = require('ws');

// Use port 8080 as specified in the frontend.html
const wss = new WebSocket.Server({ port: 8080 });

// Keep track of connected clients
const clients = new Map();
let nextClientId = 0;

console.log('WebSocket Signaling Server running on ws://localhost:8080');

wss.on('connection', function connection(ws) {
    const clientId = nextClientId++;
    ws.id = clientId;
    clients.set(clientId, ws);
    console.log(`Client connected. Total clients: ${clients.size}`);

    // Check if we have two clients. If so, tell the first one to initiate the offer.
    if (clients.size === 2) {
        // Find the first client (the one who connected earlier)
        const initiator = Array.from(clients.values())[0]; 
        console.log(`Two clients connected. Signaling initiator (Client ID: ${initiator.id}) to start offer.`);
        // Send a message to the first client to start the WebRTC handshake
        initiator.send(JSON.stringify({ type: 'start_offer' }));
    }

    ws.on('message', function incoming(message) {
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (e) {
            console.error('Received non-JSON message:', message.toString());
            return;
        }

        // We only care about relaying signaling messages (offer, answer, candidate)
        if (['offer', 'answer', 'candidate', 'register'].includes(data.type)) {
            console.log(`Relaying ${data.type} from Client ID: ${ws.id} (${data.sender})`);

            // Find the other client to send the message to
            const targetClient = Array.from(clients.values()).find(client => client.id !== ws.id);
            
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                // Relay the message
                targetClient.send(JSON.stringify(data));
            } else {
                console.log('No peer found or peer not ready to relay message.');
            }
        }
    });

    ws.on('close', function close() {
        clients.delete(ws.id);
        console.log(`Client disconnected (ID: ${ws.id}). Total clients: ${clients.size}`);
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err.message);
    });
});
