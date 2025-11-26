import Sidebar from '@/components/Sidebar';
import '@/article.css';

function App({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row h-screen">
      <Sidebar />
      <div className="mx-40">{children}</div>
    </div>
  );
}

export default App;
