import React from 'react';

console.log('TestApp loaded');

function TestApp() {
  console.log('TestApp rendering');
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test App Working!</h1>
      <p>If you can see this, React is working.</p>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  );
}

export default TestApp;