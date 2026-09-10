/**
 * Stand-in for the mobile `#nativephp` JavaScript bridge.
 *
 * NativePHP for desktop exposes its capabilities through PHP facades rather
 * than a browser-side bridge, and its Composer package conflicts with the
 * mobile one, so the two can never be installed together. The components that
 * call the bridge are shared with the desktop build, so package.json maps
 * `#nativephp` here instead.
 *
 * Every entry point mirrors the real bridge's signature and resolves to the
 * "not on a phone" answer, which is the path those components already take
 * when `IsMobile()` returns false. Keep the shapes in step with
 * vendor/nativephp/mobile/resources/dist/native.js.
 */
export const Events = {
    Alert: { ButtonPressed: 'Native\\Mobile\\Events\\Alert\\ButtonPressed' },
    App: { UpdateInstalled: 'Native\\Mobile\\Events\\App\\UpdateInstalled' },
    Biometric: { Completed: 'Native\\Mobile\\Events\\Biometric\\Completed' },
    Camera: {
        PhotoTaken: 'Native\\Mobile\\Events\\Camera\\PhotoTaken',
        PhotoCancelled: 'Native\\Mobile\\Events\\Camera\\PhotoCancelled',
        VideoRecorded: 'Native\\Mobile\\Events\\Camera\\VideoRecorded',
        VideoCancelled: 'Native\\Mobile\\Events\\Camera\\VideoCancelled',
        PermissionDenied: 'Native\\Mobile\\Events\\Camera\\PermissionDenied',
    },
    Gallery: {
        MediaSelected: 'Native\\Mobile\\Events\\Gallery\\MediaSelected',
    },
    Scanner: { CodeScanned: 'Native\\Mobile\\Events\\Scanner\\CodeScanned' },
} as const;

type NativeEventHandler = (payload: never) => void;

type SecureStorageReadStatus = 'found' | 'not_found' | 'unavailable' | 'error';

interface SecureStorageReadResult {
    status: SecureStorageReadStatus;
    value: string | null;
}

interface CaptureResult {
    id: string | null;
    path: string | null;
    images: string[];
    success: boolean;
}

/**
 * The real bridge returns a fluent builder that is also awaitable, so call
 * sites read `await Camera.pickImages().images().id('gallery')`. The shim has
 * to keep that shape or those calls stop compiling.
 */
class PendingCapture implements PromiseLike<CaptureResult> {
    private readonly result: CaptureResult = {
        id: null,
        path: null,
        images: [],
        success: false,
    };

    id(id: string): this {
        this.result.id = id;

        return this;
    }

    event(_event: string): this {
        return this;
    }

    images(): this {
        return this;
    }

    then<TResult1 = CaptureResult, TResult2 = never>(
        onfulfilled?:
            | ((value: CaptureResult) => TResult1 | PromiseLike<TResult1>)
            | null,
        onrejected?:
            | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
            | null,
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve(this.result).then(onfulfilled, onrejected);
    }
}

export async function IsMobile(): Promise<boolean> {
    return false;
}

export const System = {
    isMobile: IsMobile,
};

export const Camera = {
    getPhoto(): PendingCapture {
        return new PendingCapture();
    },
    recordVideo(): PendingCapture {
        return new PendingCapture();
    },
    pickImages(): PendingCapture {
        return new PendingCapture();
    },
};

export const Browser = {
    async open(url: string): Promise<boolean> {
        window.open(url, '_blank', 'noopener,noreferrer');

        return true;
    },
    async inApp(url: string): Promise<boolean> {
        return Browser.open(url);
    },
    async auth(url: string): Promise<boolean> {
        return Browser.open(url);
    },
};

export const SecureStorage = {
    async get(_key: string): Promise<SecureStorageReadResult> {
        return { status: 'unavailable', value: null };
    },
    async set(_key: string, _value: string): Promise<{ success: boolean }> {
        return { success: false };
    },
    async delete(_key: string): Promise<{ success: boolean }> {
        return { success: false };
    },
};

export function On(_eventName: string, _callback: NativeEventHandler): void {}

export function Off(_eventName: string, _callback: NativeEventHandler): void {}
