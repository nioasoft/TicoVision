/**
 * Collection Module Routes
 * Routes for collection dashboard, settings, and disputes pages
 */

import { RouteObject } from 'react-router-dom';
import { CollectionDashboard } from './pages/CollectionDashboard';
import { NotificationSettings } from './pages/NotificationSettings';
import { DisputesPage } from './pages/DisputesPage';

export const collectionRoutes: RouteObject[] = [
  {
    path: '/collections',
    element: <CollectionDashboard />,
  },
  {
    path: '/collections/settings',
    element: <NotificationSettings />,
  },
  {
    path: '/collections/disputes',
    element: <DisputesPage />,
  },
];
