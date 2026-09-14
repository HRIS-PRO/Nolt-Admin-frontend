import React, { useEffect, useRef } from 'react';

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: HTMLElement,
                options: Record<string, unknown>,
            ) => string;
            remove: (widgetId: string) => void;
            reset: (widgetId: string) => void;
        };
    }
}

const SCRIPT_ID = 'cf-turnstile-script';
const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

function parseEnvBoolean(value: string | undefined): boolean {
    if (!value?.trim()) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

const TURNSTILE_ENABLED = parseEnvBoolean(import.meta.env.VITE_TURNSTILE_ENABLED);

interface TurnstileWidgetProps {
    onToken: (token: string | null) => void;
    className?: string;
}

const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({ onToken, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!TURNSTILE_ENABLED || !SITE_KEY) {
            onToken(null);
            return;
        }

        let cancelled = false;

        const renderWidget = () => {
            if (cancelled || !containerRef.current || !window.turnstile) return;
            if (widgetIdRef.current) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: SITE_KEY,
                theme: 'auto',
                size: 'flexible',
                callback: (token: string) => onToken(token),
                'expired-callback': () => onToken(null),
                'error-callback': () => onToken(null),
            });
        };

        const ensureScript = () => {
            if (window.turnstile) {
                renderWidget();
                return;
            }
            if (document.getElementById(SCRIPT_ID)) {
                document.getElementById(SCRIPT_ID)?.addEventListener('load', renderWidget, { once: true });
                return;
            }
            const script = document.createElement('script');
            script.id = SCRIPT_ID;
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.onload = renderWidget;
            document.head.appendChild(script);
        };

        ensureScript();

        return () => {
            cancelled = true;
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [onToken]);

    if (!TURNSTILE_ENABLED) {
        return null;
    }

    if (!SITE_KEY) {
        return (
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                Turnstile is enabled but VITE_TURNSTILE_SITE_KEY is missing.
            </p>
        );
    }

    return <div ref={containerRef} className={className ?? 'w-full min-h-[65px]'} />;
};

export function isTurnstileEnabled(): boolean {
    return TURNSTILE_ENABLED;
}

/** Widget + submit gate active when enabled and site key is set. */
export function isTurnstileConfigured(): boolean {
    return TURNSTILE_ENABLED && Boolean(SITE_KEY);
}

export default TurnstileWidget;
