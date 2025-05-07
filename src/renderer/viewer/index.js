import { createRoot } from 'react-dom/client'

import { BlueprintProvider } from '@blueprintjs/core'
import '@blueprintjs/core/lib/css/blueprint.css';
// NOT USED (YET?) IN THIS PROJECT   import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
// NOT USED (YET?) IN THIS PROJECT   import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/table/lib/css/table.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';

import { AppView } from './vwr-App';
// don't think i need this, it's from generic CRA installation
// import * as serviceWorker from './serviceWorker';

// react18.0 - replaced ReactDom.render with createRoot - see react v18 release notes
//ReactDOM.render(<AppView />, document.getElementById('root'));
const container = document.getElementById('root')
const root = createRoot(container)
root.render(
    <BlueprintProvider>
        <div>
            <AppView />
        </div>
    </BlueprintProvider>
)


// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
