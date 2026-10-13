import { useCallback, useState } from 'react';
import NmsFileSizeLimitModal from '../components/upload/NmsFileSizeLimitModal';
import { isWithinNmsUploadLimit } from '../utils/nmsUploadLimits';

export function useNmsUploadSizeLimit() {
    const [open, setOpen] = useState(false);
    const [fileName, setFileName] = useState('');
    const [fileSizeBytes, setFileSizeBytes] = useState<number | undefined>();

    const validateFile = useCallback((file: File | null | undefined): file is File => {
        if (!file) return false;
        if (!isWithinNmsUploadLimit(file)) {
            setFileName(file.name);
            setFileSizeBytes(file.size);
            setOpen(true);
            return false;
        }
        return true;
    }, []);

    const modal = (
        <NmsFileSizeLimitModal
            open={open}
            fileName={fileName}
            fileSizeBytes={fileSizeBytes}
            onClose={() => setOpen(false)}
        />
    );

    return { validateFile, modal };
}
