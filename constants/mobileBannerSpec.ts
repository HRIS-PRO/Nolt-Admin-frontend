/** Home-screen carousel banner spec — 3:1 aspect, up to 1080×360 reference size. */
export const MOBILE_HOME_BANNER = {
    /** Ideal / reference size (used when normalizing on upload). */
    width: 1080,
    height: 360,
    aspectRatio: 3,
    /** Smaller banners allowed down to this size. */
    minWidth: 480,
    minHeight: 160,
    /** Hard max — only a little above 1080×360 (8%). */
    maxWidth: Math.round(1080 * 1.08),
    maxHeight: Math.round(360 * 1.08),
    /** Aspect ratio tolerance (3:1 ±6%). */
    aspectTolerance: 0.06,
    maxFileSizeMb: 2,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export function bannerSpecHint(): string {
    const { width, height, minWidth, minHeight, maxWidth, maxHeight } = MOBILE_HOME_BANNER;
    return `3:1 ratio · ${minWidth}×${minHeight}px up to ${width}×${height}px (max ${maxWidth}×${maxHeight}px)`;
}

export type BannerDimensionCheck = {
    ok: boolean;
    width: number;
    height: number;
    message: string;
};

export function checkBannerDimensions(width: number, height: number): BannerDimensionCheck {
    const {
        minWidth,
        minHeight,
        maxWidth,
        maxHeight,
        aspectRatio,
        aspectTolerance,
        width: idealW,
        height: idealH,
    } = MOBILE_HOME_BANNER;

    const ratio = width / height;
    const ratioDiff = Math.abs(ratio - aspectRatio) / aspectRatio;

    if (width < minWidth || height < minHeight) {
        return {
            ok: false,
            width,
            height,
            message: `Image too small (${width}×${height}px). Minimum is ${minWidth}×${minHeight}px at 3:1.`,
        };
    }

    if (width > maxWidth || height > maxHeight) {
        return {
            ok: false,
            width,
            height,
            message: `Image too large (${width}×${height}px). Max is ${maxWidth}×${maxHeight}px (~8% above ${idealW}×${idealH}).`,
        };
    }

    if (ratioDiff > aspectTolerance) {
        return {
            ok: false,
            width,
            height,
            message: `Banner must be 3:1 landscape (${idealW}×${idealH} is ideal). Yours is ${width}×${height}px.`,
        };
    }

    return {
        ok: true,
        width,
        height,
        message: `${width}×${height}px — valid (ideal ${idealW}×${idealH}).`,
    };
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read image dimensions'));
        };
        img.src = url;
    });
}

/** In-app routes marketing can link banners / pushes to. */
export const MOBILE_DEEP_LINKS = [
    { value: '/kyc', label: 'KYC & tier upgrade' },
    { value: '/invest', label: 'Investments hub' },
    { value: '/payments', label: 'Payments & transfers' },
    { value: '/bills', label: 'Bill payments' },
    { value: '/notifications', label: 'Notifications inbox' },
    { value: '/account/statement', label: 'Account statement' },
    { value: '__custom__', label: 'Custom deep link or URL…' },
] as const;
