import { Socket } from "net";

const {
    LRU_SIZE,
    COMMUNICATION_ADDRESS,
    COMMUNICATION_PORT,
    RECONNECT_TIMEOUT,
    SERVER_NAME,
    SERVER_LAT,
    SERVER_LON
} = process.env;
const stack = [];
const items = new Map();
const head = {};
const tail = {};
head.next = tail;
tail.prev = head;

const handlers = {
    nearest: [],
    servers: []
};
const events = {
    /**
     * An event "write" received. Dispatch the write method
     * @param {Payload} data { key, value, expires, preserve }
     */
    write: (data) => {
        write(data);
    },

    nearest: (data) => {
        handlers.nearest.forEach(handler => handler(data));
        handlers.nearest = [];
    },

    servers: (data) => {
        handlers.servers.forEach(handler => handler(data));
        handlers.servers = [];
    }
};

const client = new Socket();

let reconnecting = true;
/**
 * Method that try to connect to the server
 */
const reconnect = () => {
    client.connect(parseInt(COMMUNICATION_PORT), COMMUNICATION_ADDRESS);
};

/**
 * Once is connected, validate the stack
 */
client.on("connect", () => {
    console.log("Connected!");
    reconnecting = false;

    //-- Notify to the central server the name and location
    client.write(
        JSON.stringify([
            "region", { name: SERVER_NAME, coords: [ parseFloat(SERVER_LAT), parseFloat(SERVER_LON) ] }
        ])
    );

    //-- If there are items on the stack, start send to the server
    if(stack.length > 0) {
        sendStack();
    }
});

/**
 * Retry to connect
 */
client.on("close", () => {
    if(!reconnecting) {
        console.log("Reconnecting...");
        reconnecting = true;
    }

    setTimeout(reconnect, parseInt(RECONNECT_TIMEOUT));
});

client.on("error", (error) => {});

/**
 * Receive data
 */
client.on("data", (chunk) => {
    try {
        const [ event, data ] = JSON.parse(chunk.toString("utf-8"));
        console.log(event, data);

        if(events[event]) {
            events[event](data);
        }
    } catch (error) {
        console.error(chunk.toString("utf-8"), error);
    }
});

let sendingStack = false;
/**
 * Method to send a message from the stack.
 * This method validates that the message was actually
 * send to the communication server
 */
const sendStack = () => {
    if(!reconnecting && !sendingStack) {
        const message = stack.shift();
        sendingStack = !!message;

        client.write(
            JSON.stringify([ "write", message ]),
            (error) => {
                if(!error) {
                    sendingStack = false;
                    if(stack.length > 0) {
                        setTimeout(sendStack, 1000);
                    }
                } else {
                    stack.unshift(message);
                    setTimeout(sendStack, 1000);
                }
            }
        );
    }
};

/**
 * Method to add to the stack and try to start the send process
 * @param {message} message the message to send. Must contain { key, value, expires }
 */
const addToStack = ({key, value, expires}) => {
    stack.push({ key, value, expires });
    sendStack();
};

let nearExpiration;
/**
 * Method to remove the expired items
 */
const checkExpires = () => {
    const currentTimestamp = +new Date();
    if(!nearExpiration || currentTimestamp >= nearExpiration) {
        items.forEach((item, key) => {
            if(!nearExpiration || (item.expires && item.expires < nearExpiration)) {
                nearExpiration = item.expires;
            }

            if(item.expires && currentTimestamp > item.expires) {
                remove(key);
            }
        });
    }
};

/**
 * Method to read a key on the cache
 * @param {String} key the key to find
 * @returns {any} the saved value. Undefined if not found
 */
export const read = (key) => {
    checkExpires();
    
    if (items.has(key)) {
        const current = items.get(key);
        current.prev.next = current.next;
        current.next.prev = current.prev;
    
        tail.prev.next = current;
        current.prev = tail.prev;
        current.next = tail;
        tail.prev = current;

        return current.value;
    }

    return undefined;
};

/**
 * Method to write on cache
 * @param {Object} payload {key, value, expires, preserve}
 */
export const write = ({key, value, expires, preserve}) => {
    expires = expires? (preserve? 0 : +new Date()) + parseInt(expires) : undefined;
    checkExpires();

    if (read(key)) {
        tail.prev.value = value;
        tail.prev.expires = expires;
    } else {
        if (items.size === parseInt(LRU_SIZE)) {
            items.delete(head.next.key);
            head.next = head.next.next;
            head.next.prev = head;
        }
    
        const item = { value, key, expires };
    
        items.set(key, item);
        tail.prev.next = item;
        item.prev = tail.prev;
        item.next = tail;
        tail.prev = item;
    }

    //-- Save the most recent expiration
    if(!nearExpiration || (expires && expires < nearExpiration)) {
        nearExpiration = expires;
    }

    //-- Send to the stack
    if(!preserve) {
        addToStack({ key, value, expires });
    }
};

/**
 * Method to get all the keys on the cache
 * @returns {string[]} the keys
 */
export const keys = () => {
    checkExpires();
    const keys = [];
    items.forEach((_, key) => keys.push(key));
    return keys;
};

/**
 * Method to find the nearest server
 * @param {Coords} coords the coordinates to find the server
 * @returns {Server} the found server { name, coords }
 */
export const nearest = ([ lat, lon ]) => new Promise((resolve) => {
    handlers.nearest.push(resolve);
    client.write(
        JSON.stringify([
            "nearest", [ lat, lon ]
        ])
    );
});

/**
 * Method to list the servers
 * @returns {Server[]} a list of the servers [ { name, coords } ]
 */
export const servers = () => new Promise((resolve) => {
    handlers.servers.push(resolve);
    client.write(
        JSON.stringify([ "servers" ])
    );
});

/**
 * Method to remove from cache
 * @param {String} key the key to remove
 */
const remove = (key) => {
    if(items.has(key)) {
        const { prev, next } = items.get(key);
        prev.next = next;
        next.prev = prev;
        items.delete(key);
    }
};

//-- First connection
reconnect();