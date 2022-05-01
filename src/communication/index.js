import "dotenv/config";
import { Server } from "net";

const {
    COMMUNICATION_PORT
} = process.env;
const servers = [];

/**
 * Method to convert degrees to radians
 * @param {Number} deg degree to convert
 * @returns {Number} radians
 */
const deg2rad = (deg) => deg * (Math.PI/180);

/**
 * Method to get the distance in kilometeres between two coordinates
 * @param {Coord} coord1 the coordinates from
 * @param {Coord} coord2 the coordinates to
 * @returns {Number} the distnace in Km
 */
const getDistance = ([lat1, lon1], [lat2, lon2]) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2-lat1);  // deg2rad below
    const dLon = deg2rad(lon2-lon1); 
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const events = {
    /**
     * Write the name and coordinates of the server on the servers array
     * @param {Socket} socket the socket
     * @param {Object} data coordinates on {name, coords: [latitude, longitude]}
     */
    region: (socket, {name, coords}) => {
        const server = servers.find(server => server.socket === socket);

        if(server) {
            server.coords = coords;
            server.name = name;
        } else {
            servers.push({ socket, coords, name });
        }
    },

    /**
     * Get the list of the servers
     * @param {Socket} socket the socket
     */
    servers: (socket) => {
        socket.write(
            JSON.stringify(
                [ "servers", servers.map(({ coords, name }) => ({ coords, name })) ]
            )
        );
    },

    /**
     * Search the nearest server to a coordinates
     * @param {Socket} socket the client socket
     * @param {Coords} searchCoords the coordinates to search in [lat, lon]
     */
    nearest: (socket, searchCoords) => {
        const nearest = servers.reduce((near, server) => {
            const { name, coords } = server;
            const distance = getDistance(coords, searchCoords);

            if(!near) {
                near = { name, coords, distance };
            }

            if(distance < near.distance) {
                return { name, coords, distance };
            }

            return near;
        }, null);

        socket.write(
            JSON.stringify([
                "nearest", nearest
            ])
        );
    },

    /**
     * Cast the message to the other servers
     * @param {Socket} socket the socket
     * @param {Object} message the message to write { key, value, expires }
     */
    write: (socket, message) => {
        // Avoid replacate this message
        message.preserve = true;
        servers.forEach((server) => {
            if(server.socket !== socket) {
                server.socket.write(
                    JSON.stringify(
                        [ "write", message ]
                    )
                );
            }
        });
    }
};

const server = new Server();

server.listen(parseInt(COMMUNICATION_PORT), () => {
    console.log("Socket listening on port %s", COMMUNICATION_PORT);
});

server.on("connection", (socket) => {
    socket.on("data", (chunk) => {
        try {
            // Every message is an array with the event and the data
            const [ event, data ] = JSON.parse(chunk.toString("utf-8"));
            console.log(event, data);

            if(events[event]) {
                // process the received event
                events[event](socket, data);
            }
        } catch (error) {
            console.error(chunk.toString("utf-8"), error);
        }
    });

    socket.on('end', () => {
        // Remove client from socket array
        const index = servers.findIndex((server) => server.socket === socket);
        servers.splice(index, 1);
    });
});