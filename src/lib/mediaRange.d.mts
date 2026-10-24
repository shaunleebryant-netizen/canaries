export declare const MEDIA_FILES: Record<string, { path: string; type: string; size: number }>;
export declare function parseRange(header: string | null, size: number): [number, number] | null | "bad";
export declare function serveMedia(
  request: Request,
  file: string,
  fetchAsset: (path: string) => Promise<Response>
): Promise<Response>;
