import React from 'react';
import StartPanel from "./StartPanel/index.jsx";

function App() {
  return (
    <div>
      <StartPanel />

      <div className="text-3xl font-bold underline">
        hello {3 + 3 * 2}
      </div>
    </div>
  );
}

export default App;