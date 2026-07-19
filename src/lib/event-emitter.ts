import { EventEmitter } from "events";

const globalForEventEmitter = globalThis as unknown as {
    notificationEmitter: EventEmitter | undefined;
};

export const notificationEmitter = globalForEventEmitter.notificationEmitter ?? new EventEmitter();

// Always persist to globalThis — ensures the same EventEmitter instance is reused
// across module reloads in both development (hot-reload) and production.
// Without this, the SSE stream and notification emitter would use different instances
// and real-time push events would be silently dropped.
globalForEventEmitter.notificationEmitter = notificationEmitter;

// Increase max listeners to support many concurrent connection streams on a single server
notificationEmitter.setMaxListeners(1000);
