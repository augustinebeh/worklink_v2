/**
 * WebSocket Client Storage (Legacy Compatibility Shim)
 * Re-exports from the new modular client-store and event-types
 * to ensure all modules share the same client Maps/Sets.
 */

const clientStore = require('./utils/client-store');
const EventTypes = require('./config/event-types');

module.exports = {
  candidateClients: clientStore.candidateClients,
  adminClients: clientStore.adminClients,
  EventTypes
};
