import type { ClipboardEvent, RefObject } from 'react';

export function createEmptyOtp(length: number): string[] {
    return Array.from({ length }, () => '');
}

export function digitsFromPaste(text: string, length: number): string[] {
    const digits = text.replace(/\D/g, '').slice(0, length);
    const code = createEmptyOtp(length);
    for (let i = 0; i < digits.length; i++) {
        code[i] = digits[i]!;
    }
    return code;
}

export function handleOtpPaste(
    event: ClipboardEvent<HTMLInputElement>,
    length: number,
    setCode: (code: string[]) => void,
    inputsRef: RefObject<(HTMLInputElement | null)[]>,
): void {
    const pasted = event.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '');
    if (!digits) return;

    event.preventDefault();
    setCode(digitsFromPaste(pasted, length));

    const filledCount = Math.min(digits.length, length);
    const focusIndex = filledCount >= length ? length - 1 : filledCount;
    requestAnimationFrame(() => {
        inputsRef.current[focusIndex]?.focus();
    });
}
