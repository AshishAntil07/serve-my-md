import Sidebar from '@/components/Sidebar';
import '@/article.css';

function App({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-row mih-h-screen w-full">
      <Sidebar />
      <div className="mx-30 w-full">{children}</div>
    </div>
  );
}

export default App;
