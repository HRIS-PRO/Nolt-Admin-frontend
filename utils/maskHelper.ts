export const maskValue = (value: string | null | undefined, maskCount: number = 7): string => {
    if (!value) return '-';
    if (value.length <= maskCount) return value;
    
    const visiblePart = value.substring(maskCount);
    const maskedPart = '*'.repeat(maskCount);
    
    return `${maskedPart}${visiblePart}`;
};
