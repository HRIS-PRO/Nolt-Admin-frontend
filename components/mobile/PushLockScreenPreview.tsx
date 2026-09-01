import React from 'react';
import { NOLT_APP_ICON_URL, NOLT_PUSH_APP_LABEL } from '../../constants/noltBrand';

type Props = {
    title: string;
    body: string;
    appLabel?: string;
};

/** iOS-style lock-screen push preview — isolated from admin theme so text stays readable. */
export function PushLockScreenPreview({ title, body, appLabel = NOLT_PUSH_APP_LABEL }: Props) {
    const displayTitle = title.trim() || 'Notification title';
    const displayBody =
        body.trim() || 'Message body appears here for customers on their lock screen.';

    return (
        <div className="flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                Lock screen preview
            </p>
            <div
                className="relative w-[300px] h-[620px] overflow-hidden rounded-[2rem] shadow-2xl isolate"
                style={{
                    background: 'linear-gradient(165deg, #1a2744 0%, #0b1220 45%, #05080f 100%)',
                    color: '#ffffff',
                }}
            >
                <div className="pt-14 px-6 text-center">
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500 }}>
                        Wednesday, October 25
                    </p>
                    <p
                        style={{
                            color: '#ffffff',
                            fontSize: 56,
                            fontWeight: 200,
                            lineHeight: 1,
                            marginTop: 4,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        09:41
                    </p>
                </div>

                <div className="absolute left-4 right-4 top-[200px]">
                    <div
                        className="overflow-hidden backdrop-blur-xl"
                        style={{
                            background: 'rgba(38, 38, 42, 0.92)',
                            borderRadius: 18,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                        }}
                    >
                        <div className="px-3.5 pt-3 pb-3.5">
                            <div className="flex items-center gap-2 mb-2">
                                <img
                                    src={NOLT_APP_ICON_URL}
                                    alt="NOLT Finance"
                                    className="w-5 h-5 shrink-0 object-cover"
                                    style={{ borderRadius: 5 }}
                                />
                                <span
                                    className="flex-1 truncate uppercase tracking-wide"
                                    style={{ color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: 600 }}
                                >
                                    {appLabel}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>now</span>
                            </div>
                            <p
                                className="line-clamp-2"
                                style={{ color: '#ffffff', fontSize: 14, fontWeight: 600, lineHeight: 1.35, marginBottom: 2 }}
                            >
                                {displayTitle}
                            </p>
                            <p
                                className="line-clamp-3"
                                style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 1.45 }}
                            >
                                {displayBody}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1"
                    style={{ background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}
                />
            </div>
        </div>
    );
}
