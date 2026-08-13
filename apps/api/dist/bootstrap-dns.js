"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_dns_1 = __importDefault(require("node:dns"));
const servers = ['1.1.1.1', '8.8.8.8'];
node_dns_1.default.setServers(servers);
if (process.env.NODE_ENV !== 'test') {
    console.log(`[DNS] Using DNS servers: ${servers.join(', ')}`);
}
//# sourceMappingURL=bootstrap-dns.js.map