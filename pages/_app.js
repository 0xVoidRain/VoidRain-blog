import '../css/tailwind.css';
// 暂时注释掉，直到解决 Tailwind 自定义类的问题
// import '../css/prism.css'; 
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