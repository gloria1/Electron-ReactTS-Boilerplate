import { createRoot } from 'react-dom/client';
import App from './App';

import AppView from './viewer/vwr-App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(<AppView />);
