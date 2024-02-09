import './App.css';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import useServerEventHandlers from './hooks/serverEventHandlers.hook';
import {
  UserActionHandlers,
  useUserActionHandlers,
} from './hooks/userActionHandlers.hook';

function Hello() {
  return (
    <div>
      <div className="Hello">
        <img width="200" alt="icon" src={icon} />
      </div>
      <h1>Hello world</h1>
    </div>
  );
}

export default function App() {
  // Need to pass the `userActionHandlers` to the relative components
  const userActionHandlers: UserActionHandlers = useUserActionHandlers();
  useServerEventHandlers();
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
