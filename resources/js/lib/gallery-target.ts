/**
 * Which feature the next native gallery/camera pick is for. The native events
 * carry no reliable owner, so every listener checks this before acting on a
 * pick that wasn't its own (a background photo must not become the avatar).
 */
export type GalleryTarget = 'profile' | 'background' | 'banner';

let target: GalleryTarget = 'profile';

export const setGalleryTarget = (next: GalleryTarget): void => {
    target = next;
};

export const getGalleryTarget = (): GalleryTarget => target;
