import Footer from '@/layouts/components/Footer';
import Header from '@/layouts/components/Header';
import { Outlet, useLocation } from 'react-router-dom';
import ChatBot from '@/components/ChatBot';

const MainLayout = () => {
    const location = useLocation();

    return (
        <>
            <Header />
            <main>
                <Outlet key={location.key} />
            </main>
            <Footer />
            <ChatBot />
        </>
    );
};

export default MainLayout;
