
import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
    children: React.ReactNode;
} 

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased transition-colors duration-300 overflow-x-hidden">
            {/* Left Branding Panel — wider, image full-bleed top-to-bottom */}
            <div className="hidden md:flex md:w-[54%] lg:w-[70%] xl:w-[68%] relative min-h-screen overflow-hidden bg-slate-900 border-r border-slate-800">
                <img
                    src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/MobileAppAssets/3%20(1).png"
                    alt=""
                    aria-hidden="true"
                    className="absolute top-0 right-0 h-full w-auto min-w-full max-w-none select-none pointer-events-none"
                />
                {/* Light bottom fade only — keeps testimonial readable without washing out the image */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none z-10" />

                <Link
                    to="/"
                    className="absolute top-8 lg:top-10 left-8 lg:left-12 z-20 flex items-center cursor-pointer"
                >
                    <div className="h-16 w-28 lg:h-20 lg:w-32 flex items-center justify-center">
                        <img
                            src="https://pub-74b956e78e404291a932f28ada63b70c.r2.dev/logo%20updated%20white.png"
                            alt="NOLT Finance Logo"
                            className="w-full h-full object-contain drop-shadow-lg"
                        />
                    </div>
                </Link>

                <div className="absolute bottom-8 lg:bottom-12 left-8 lg:left-12 right-8 lg:right-12 z-20 max-w-md">
                    <div className="glass-effect p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm bg-slate-900/40">
                        <div className="flex gap-1 mb-4 text-primary">
                            <span className="material-symbols-outlined text-sm filled">star</span>
                            <span className="material-symbols-outlined text-sm filled">star</span>
                            <span className="material-symbols-outlined text-sm filled">star</span>
                            <span className="material-symbols-outlined text-sm filled">star</span>
                            <span className="material-symbols-outlined text-sm filled">star</span>
                        </div>
                        <blockquote className="text-lg font-medium text-white leading-relaxed mb-4">
                            "NOLT made getting a business loan incredibly simple. The process was transparent, fast, and secure."
                        </blockquote>
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-full bg-slate-700 bg-cover bg-center border border-white/10" style={{ backgroundImage: 'url("https://picsum.photos/seed/user123/100/100")' }}></div>
                            <div>
                                <p className="text-sm font-bold text-white">Anonymous User</p>
                                <p className="text-xs text-slate-400 font-medium">....</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="flex-1 flex flex-col relative w-full min-h-screen">
                <header className="md:hidden flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined text-lg">ssid_chart</span>
                        </div>
                        <h2 className="text-lg font-bold dark:text-white">NOLT Finance</h2>
                    </div>
                </header>

                <main className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 overflow-y-auto">
                    <div className="w-full max-w-xl flex flex-col gap-8">
                        {children}
                    </div>
                </main>

                <footer className="p-6 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                        © 2024 NOLT Finance. All rights reserved.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default AuthLayout;
