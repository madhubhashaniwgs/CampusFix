# Photo Upload (Cloudinary)

## Flow

1. Client requests signed upload params via `POST /api/issues/upload`
   (authenticated, rate-limited, CSRF-protected, multipart image).
2. Server validates MIME type + magic bytes + size limit, then returns a
   Cloudinary signed upload token bound to the user.
3. Client uploads directly to Cloudinary.
4. Issue creation sends `photoPublicId`; server derives the public ID itself
   and stores the secure URL. On issue-creation failure the orphaned asset
   is cleaned up.

## Compatibility

Legacy issues store a compressed Base64 JPEG data URL in `photo` with no
`photoPublicId` — still rendered everywhere via `IssuePhoto`.

## Config

`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
Without them uploads are unavailable; issue creation without photos works.
Never commit credentials or expose them client-side.
