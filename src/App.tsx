import { rootRoutes } from '@/routes';
import { useRoutes } from 'react-router';
import { AuthProvider } from '@/common/contexts';
import { Button } from '@/components/ui/button.tsx';

function App() {
    const router = useRoutes(rootRoutes);
    return <AuthProvider>{router}</AuthProvider>;
}

export default App;
