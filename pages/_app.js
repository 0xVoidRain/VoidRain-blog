import '../css/tailwind.css';
import '../css/prism.css'; // 使用简化版本的 prism.css
import dynamic from 'next/dynamic';

const DataFlowBackground = dynamic(
  () => import('../components/DataFlowBackground'),
  { ssr: false }
);

function MyApp({ Component, pageProps }) {
  return (
    <>
      <DataFlowBackground />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 