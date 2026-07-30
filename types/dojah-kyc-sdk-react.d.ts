declare module 'dojah-kyc-sdk-react' {
  import type { ComponentType } from 'react';

  export interface DojahSdkProps {
    appID: string;
    publicKey: string;
    type: 'custom' | 'verification' | 'identification' | 'liveness';
    response: (type: string, data?: unknown) => void;
    config?: {
      widget_id?: string;
      webhook?: boolean;
      [key: string]: unknown;
    };
    referenceId?: string;
    userData?: Record<string, string>;
    govData?: Record<string, string>;
    metadata?: Record<string, string | number>;
    env?: 'development' | 'production';
  }

  const Dojah: ComponentType<DojahSdkProps>;
  export default Dojah;
}
