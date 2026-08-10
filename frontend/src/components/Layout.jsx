import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, minWidth: 0 }}>{children}</main>
    </div>
  );
}
