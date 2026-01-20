/**
 * Protocol Management Module
 *
 * This module manages meeting protocols with clients or client groups.
 * Route: /protocols (פרוטוקולים)
 *
 * Features:
 * - Create and edit meeting protocols
 * - Add attendees from 3 sources: client contacts, office employees, external
 * - Track decisions by responsibility type (office, client, bookkeeper, other)
 * - Add content sections: announcements, background stories, recommendations
 * - Lock protocols for finalization
 * - Duplicate protocols
 * - Print support
 *
 * AVAILABLE EXPORTS:
 * ------------------
 * - ProtocolsPage: Main page component for protocol management
 * - protocolService: Service for CRUD operations
 * - Types: Protocol, ProtocolWithRelations, etc.
 */

// Pages
export { ProtocolsPage } from './pages/ProtocolsPage';

// Services
export { protocolService, ProtocolService } from './services/protocol.service';

// Types
export * from './types/protocol.types';
