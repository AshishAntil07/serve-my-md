import Sidebar from '@/components/Sidebar';
import '@/article.css';
import "prismjs/themes/prism-okaidia.css";

function App({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex flex-row min-h-screen w-full">
      <Sidebar />
      <div className="mx-5 sm:mx-15 lg:mx-30 w-full">{children}</div>
    </div>
  );
}

export default App;
