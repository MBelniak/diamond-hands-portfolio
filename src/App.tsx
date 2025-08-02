import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import portfolioTimeline from "../dist/portfolioTimeline.json";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <h2>Wartość portfela w czasie</h2>
      <div style={{ width: "100%", padding: "0 24px", boxSizing: "border-box", height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={portfolioTimeline.map((item) => ({ ...item, date: item.date.slice(0, 10) }))}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => value.toFixed(2)} labelFormatter={(label) => `Data: ${label}`} />
            <Line
              type="monotone"
              dataKey="portfolioValue"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              name="Wartość portfela"
            />
            <Line type="monotone" dataKey="cash" stroke="#82ca9d" strokeWidth={2} dot={false} name="Gotówka" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </>
  );
}

export default App;
