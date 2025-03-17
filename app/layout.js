import DataFlowBackground from '../components/DataFlowBackground';

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>
        <DataFlowBackground />
        {children}
      </body>
    </html>
  );
} 