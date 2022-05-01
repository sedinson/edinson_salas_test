import "dotenv/config";
import { LRUCache } from "@distributed-lru/libs";
import bodyParser from "body-parser";
import express from "express";

const {
    SERVER_PORT,
    SERVER_NAME
} = process.env;

const regions = {
    barranquilla: "http://localhost:3000",
    bogota: "http://localhost:3001",
    medellin: "http://localhost:3002"
};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true,
}));

/**
 * Middleware to validate the location
 */
app.use(async (req, res, next) => {
    if(!req.headers.region && req.headers.coordinates) {
        const coords = req.headers.coordinates.split(",");
        const nearest = await LRUCache.nearest(coords);
        
        if(nearest) {
            res.set("region", nearest.name);

            if(nearest.name !== SERVER_NAME) {
                if(["POST", "PUT"].includes(req.method)) {
                    return res.redirect(307, `${regions[nearest.name]}${req.path}`);
                }
    
                return res.redirect(`${regions[nearest.name]}${req.path}`);
            }
        }
    }

    next();
});

/**
 * Write on the cache
 */
app.post("/write/:key", (req, res) => {
    LRUCache.write({
        key: req.params.key,
        value: req.body,
        expires: req.headers.expires
    });

    res.send({ write: true });
});

/**
 * Get item from cache
 */
app.get("/read/:key", (req, res) => {
    const value = LRUCache.read(req.params.key);
    if(!value) {
        return res.status(404).send();
    }

    res.send(value);
});

/**
 * Get all the keys
 */
app.get("/keys", (req, res) => {
    const keys = LRUCache.keys();
    res.send(keys);
});

/**
 * List all servers
 */
app.get("/servers", async (req, res) => {
    const servers = await LRUCache.servers();
    res.send(servers);
});

/**
 * Get the nearest server
 */
app.get("/nearest", async (req, res) => {
    if(!req.headers.coordinates) {
        return res.status(400).send();
    }

    const nearest = await LRUCache.nearest(
        req.headers.coordinates.split(",")
    );
    res.send(nearest);
});

app.listen(parseInt(SERVER_PORT), () => {
    console.log("Server %s listinening on port %d", SERVER_NAME, SERVER_PORT);
});