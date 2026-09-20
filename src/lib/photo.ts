/**
 * The one way the app refers to an image. Dropbox paths are what we store;
 * this turns one into something an `<img>` can use, and nothing anywhere else
 * builds a photo URL by hand.
 *
 * `owner` is whose Dropbox holds the file. A shared event is one person's
 * photos seen by several people, so the viewer and the owner are routinely
 * different and the server cannot guess which account to ask.
 */
export const photoUrl = (dropboxPath: string, owner: string) =>
  `/api/photo?path=${encodeURIComponent(dropboxPath)}&owner=${encodeURIComponent(owner)}`;
