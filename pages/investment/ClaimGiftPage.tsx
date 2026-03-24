import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ClaimGiftPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            navigate('/dashboard');
            return;
        }

        // Store token in session/local storage for persistence across login
        sessionStorage.setItem('pending_gift_token', token);

        // Redirect to the Investment Flow with the token
        // The InvestmentFlow component will check for this token and pre-fill data
        navigate(`/investment?gift_token=${token}`);
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-pulse space-y-4 text-center">
                <div className="size-16 bg-primary/20 rounded-full mx-auto flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                </div>
                <p className="font-black text-slate-500 uppercase tracking-widest text-sm">Opening your gift...</p>
            </div>
        </div>
    );
};

export default ClaimGiftPage;
