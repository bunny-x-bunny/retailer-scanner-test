/** A URL for a file in `public/`, under the sub-path GitHub Pages serves the site from. */
export const publicUrl = (file: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/${file}`;
