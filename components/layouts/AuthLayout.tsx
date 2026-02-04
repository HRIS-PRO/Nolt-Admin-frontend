
import React from 'react';

interface AuthLayoutProps {
    children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased transition-colors duration-300 overflow-x-hidden">
            {/* Left Branding Panel */}
            <div className="hidden md:flex md:w-5/12 lg:w-1/2 relative flex-col justify-between p-8 lg:p-12 overflow-hidden bg-slate-900 border-r border-slate-800">
                <div className="absolute inset-0 w-full h-full z-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900 z-10"></div>
                    <div
                        className="w-full h-full bg-cover bg-center opacity-40 grayscale brightness-[0.4] sepia-[0.3] hue-rotate-[180deg]"
                        style={{
                            backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDB0RJs5vDneUNTwinXrTi7gJ6DLVoF9VZanKWoccy9AsSUastMTMqM7zYdhMjT7Y2HTJdV0PVUftDdzbdznYAILFUPmRvBOe-zQcdxMjnuybXASn2JANmWTsVrYYN7HxZ74Urr2tw_5PFP8Qs-ryFYp14sv8lePCeXKR0WNXCd1Wrhof8xZUYWYflEmdh7uEWPyqMBcg1An_csvxMHHgMMw_u_fS8zRJ4hE6Rb_tS_V3JOkQQIJEd_pvjK2CYPPU0h5269Imm-7w")',
                        }}
                    ></div>
                </div>

                <div className="relative z-20 flex items-center gap-3">
                    <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-white shadow-[0_0_15px_rgba(2,143,245,0.4)]">
                        <span className="material-symbols-outlined text-2xl">ssid_chart</span>
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-tight">NOLT Finance</h2>
                </div>

                <div className="relative z-20 mt-auto max-w-md">
                    <div className="glass-effect p-8 rounded-3xl border border-white/5 shadow-2xl">
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
                                <p className="text-sm font-bold text-white">David Chen</p>
                                <p className="text-xs text-slate-400 font-medium">CEO, TechStart Inc.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Form Panel */}
            <div className="flex-1 flex flex-col relative w-full md:w-7/12 lg:w-1/2">
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
