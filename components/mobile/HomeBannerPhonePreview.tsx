import React from 'react';

type Props = {
    imageUrl: string | null;
    linkHint: string;
};

/** Home-screen banner preview — tap anywhere on the creative (no CTA pill). */
export function HomeBannerPhonePreview({ imageUrl, linkHint }: Props) {
    return (
        <div className="flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                Home screen preview
            </p>
            <div className="w-[300px] bg-[#0a0a0a] p-2 shadow-2xl">
                <div className="bg-white overflow-hidden h-[580px] flex flex-col">
                    <div className="h-6 bg-[#084399] shrink-0" />

                    <div
                        className="shrink-0 px-4 pt-3 pb-5"
                        style={{ background: 'linear-gradient(180deg, #084399 0%, #0a5bb8 100%)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-9 h-9 bg-white/20" style={{ borderRadius: 999 }} />
                            <div className="w-9 h-9 bg-white/15" style={{ borderRadius: 999 }} />
                        </div>
                        <div className="h-2 w-24 bg-white/30 mb-2" style={{ borderRadius: 2 }} />
                        <div className="h-7 w-40 bg-white/25 mb-4" style={{ borderRadius: 2 }} />
                        <div className="h-16 bg-white/12 border border-white/10" style={{ borderRadius: 8 }} />
                    </div>

                    <div className="flex-1 bg-[#f4f7fb] px-4 pt-4 pb-3 overflow-hidden">
                        <div className="flex gap-3 mb-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-11 h-11 bg-white border border-slate-200/80" style={{ borderRadius: 8 }} />
                                    <div className="h-1.5 w-8 bg-slate-200" style={{ borderRadius: 1 }} />
                                </div>
                            ))}
                        </div>

                        <div
                            className="relative w-full aspect-[3/1] bg-slate-200 overflow-hidden mb-3 cursor-pointer"
                            style={{ borderRadius: 6 }}
                            title={`Tap banner → ${linkHint}`}
                        >
                            {imageUrl ? (
                                <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500 px-3 text-center">
                                    Upload banner creative
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="h-2 w-28 bg-slate-300/80 mb-2" style={{ borderRadius: 1 }} />
                            {[1, 2].map((i) => (
                                <div key={i} className="h-12 bg-white border border-slate-200/60" style={{ borderRadius: 6 }} />
                            ))}
                        </div>

                        <p className="text-[9px] text-slate-400 text-center mt-3 truncate">Tap banner → {linkHint}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
