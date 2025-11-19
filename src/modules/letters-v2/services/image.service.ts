/**
 * ImageServiceV2 - Unified Image Management
 *
 * Handles all image operations for Letters V2:
 * - Public URLs for browser display
 * - Base64 encoding for email attachments
 * - CID mapping for email inline images
 *
 * Images are stored in Supabase Storage bucket: 'letter-assets-v2'
 */

import { supabase } from '@/lib/supabase';
import type { ImageMap, ImageName } from '../types/letters-v2.types';

export class ImageServiceV2 {
  private readonly bucket = 'letter-assets-v2';

  private readonly imageFiles: Record<ImageName, string> = {
    tico_logo_new: 'Tico_logo_png_new.png',
    tico_logo: 'tico_logo_240.png',
    franco_logo_new: 'Tico_franco_co.png',
    franco_logo: 'franco-logo-hires.png',
    tagline: 'tagline.png',
    bullet_star_blue: 'Bullet_star_blue.png',
    bullet_star: 'bullet-star.png',
  };

  /**
   * Get public URL for an image from Supabase Storage
   *
   * @param imageName - The logical name of the image (e.g., 'tico_logo_new')
   * @returns Public URL that can be used in browser
   * @throws Error if image name is unknown
   */
  getPublicUrl(imageName: ImageName): string {
    const fileName = this.imageFiles[imageName];
    if (!fileName) {
      throw new Error(`Unknown image: ${imageName}`);
    }

    const { data } = supabase.storage.from(this.bucket).getPublicUrl(fileName);

    return data.publicUrl;
  }

  /**
   * Get all images as public URLs (for browser display)
   *
   * Returns a map of CID references to public URLs.
   * Use this to replace CID references in HTML with actual URLs.
   *
   * @returns Map of 'cid:image_name' → public URL
   */
  getAllPublicUrls(): ImageMap {
    const map: ImageMap = {};

    for (const key of Object.keys(this.imageFiles) as ImageName[]) {
      map[`cid:${key}`] = this.getPublicUrl(key);
    }

    return map;
  }

  /**
   * Get image as base64 (for email attachments)
   *
   * Downloads the image from Supabase Storage and converts to base64.
   * Used for email attachments with CID references.
   *
   * @param imageName - The logical name of the image
   * @returns Base64-encoded image data
   * @throws Error if download fails or image is unknown
   */
  async getAsBase64(imageName: ImageName): Promise<string> {
    const fileName = this.imageFiles[imageName];
    if (!fileName) {
      throw new Error(`Unknown image: ${imageName}`);
    }

    const { data, error } = await supabase.storage.from(this.bucket).download(fileName);

    if (error) throw error;

    const arrayBuffer = await data.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return btoa(String.fromCharCode(...bytes));
  }

  /**
   * Get all images as base64 (for email)
   *
   * Downloads all images and converts them to base64.
   * Used when preparing email attachments.
   *
   * @returns Map of image_name → base64 data
   */
  async getAllAsBase64(): Promise<Record<ImageName, string>> {
    const map: Record<string, string> = {};

    for (const key of Object.keys(this.imageFiles) as ImageName[]) {
      map[key] = await this.getAsBase64(key);
    }

    return map as Record<ImageName, string>;
  }

  /**
   * Check if an image exists in Supabase Storage
   *
   * @param imageName - The logical name of the image
   * @returns true if image exists, false otherwise
   */
  async imageExists(imageName: ImageName): Promise<boolean> {
    const fileName = this.imageFiles[imageName];
    if (!fileName) return false;

    const { data, error } = await supabase.storage.from(this.bucket).list('', {
      search: fileName,
    });

    if (error) return false;

    return data.length > 0;
  }

  /**
   * Get metadata about an image
   *
   * @param imageName - The logical name of the image
   * @returns Object with URL and filename
   */
  getImageMetadata(imageName: ImageName): { url: string; filename: string } {
    return {
      url: this.getPublicUrl(imageName),
      filename: this.imageFiles[imageName],
    };
  }
}

// Singleton instance - use this throughout the app
export const imageServiceV2 = new ImageServiceV2();
