'use client';
import TopNav from './TopNav';
import SideNav from './SideNav';

export default function AppChrome({ children, right }) {
    return (
        <div className="p-3 md:p-5 space-y-4">
            <TopNav />
            <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-4">
                <SideNav />
                <main className="space-y-4">
                    {children}
                    {right}
                </main>
            </div>
        </div>
    );
}
