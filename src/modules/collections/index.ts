/**
 * Collection Module - Main Export
 * Export all public components, pages, and utilities
 */

// Pages
export { CollectionDashboard } from './pages/CollectionDashboard';
export { NotificationSettings } from './pages/NotificationSettings';
export { DisputesPage } from './pages/DisputesPage';

// Components
export { KPICards } from './components/KPICards';
export { CollectionFilters } from './components/CollectionFilters';
export { CollectionTable } from './components/CollectionTable';
export { MarkAsPaidDialog } from './components/MarkAsPaidDialog';
export { PartialPaymentDialog } from './components/PartialPaymentDialog';
export { LogInteractionDialog } from './components/LogInteractionDialog';

// Store
export { useCollectionStore } from './store/collectionStore';

// Routes
export { collectionRoutes } from './routes';
