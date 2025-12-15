import Footer from '@/layouts/components/Footer';
import Header from '@/layouts/components/Header';
import { Outlet, useLocation } from 'react-router-dom';

const MainLayout = () => {
    const location = useLocation();

    return (
        <>
            <Header />
            <main>
                <Outlet key={location.key} />
            </main>
            <Footer />
        </>
    );
};

export default MainLayout;
