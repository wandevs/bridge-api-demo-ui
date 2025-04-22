import dynamic from 'next/dynamic';

// 使用 dynamic 导入组件，并设置 ssr: false 确保它只在客户端渲染
const HomePage = dynamic(() => import('./components/HomePage'), {
  ssr: false,
  loading: () => <div className="container">
    <h1 className="title">Cross-Chain Bridge Demo</h1>
    <div className="loading-container">
      <div className="loading">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading...</span>
      </div>
    </div>
  </div>
});

export default function Home() {
  return <HomePage />;
}
