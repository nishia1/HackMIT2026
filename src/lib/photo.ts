/**
 * The one way the app refers to an image. Dropbox paths are what we store;
 * this turns one into something an `<img>` can use, and nothing anywhere else
 * builds a photo URL by hand.
 */
export const photoUrl = (dropboxPath: string) =>
  `/api/photo?path=${encodeURIComponent(dropboxPath)}`;
