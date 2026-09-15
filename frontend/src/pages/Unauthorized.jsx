import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div style={{ padding: 48, fontFamily: 'system-ui' }}>
      <h1>403 — Unauthorized</h1>
      <p>Your role cannot access this page.</p>
      <Link to="/">Back to Dashboard</Link>
    </div>
  );
}
